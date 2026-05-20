from __future__ import annotations

from .model_loader import load_model
from .settings import Settings


def _sample_indices(total_layers: int, max_layers: int) -> list[int]:
    if total_layers <= 0:
        return [0]
    if total_layers <= max_layers:
        return list(range(total_layers))
    step = max(1, total_layers // max_layers)
    sampled = list(range(0, total_layers, step))[:max_layers]
    if sampled[-1] != total_layers - 1:
        sampled[-1] = total_layers - 1
    return sorted(set(sampled))


def build_qwen3_trace(prompt: str, settings: Settings, model_name: str, top_k: int) -> dict:
    import torch

    tokenizer, model = load_model(model_name)
    encoded = tokenizer(prompt, return_tensors='pt', truncation=True, max_length=min(settings.max_prompt_tokens, 32))
    input_ids = encoded['input_ids'].to('cpu')
    attention_mask = encoded.get('attention_mask')
    if attention_mask is not None:
        attention_mask = attention_mask.to('cpu')

    with torch.no_grad():
        outputs = model(input_ids=input_ids, attention_mask=attention_mask, output_attentions=True, output_hidden_states=True, return_dict=True, use_cache=False)

    token_ids = input_ids[0].tolist()
    token_texts = tokenizer.convert_ids_to_tokens(token_ids)
    seq_len = len(token_ids)
    preview_dims = 16

    config = model.config
    num_layers = int(getattr(config, 'n_layer', getattr(config, 'num_hidden_layers', 0)))
    num_heads = int(getattr(config, 'n_head', getattr(config, 'num_attention_heads', 0)))
    kv_heads = int(getattr(config, 'num_key_value_heads', num_heads) or num_heads)
    hidden_size = int(getattr(config, 'n_embd', getattr(config, 'hidden_size', 0)))
    vocab_size = int(getattr(config, 'vocab_size', 0))

    sampled_layers = _sample_indices(num_layers if num_layers > 0 else len(outputs.attentions or []), settings.max_selected_layers)

    wte = model.get_input_embeddings().weight.detach().cpu()
    token_embedding_preview = [{'tokenIndex': i, 'values': wte[token_id][:preview_dims].tolist()} for i, token_id in enumerate(token_ids)]
    position_embedding_preview = []
    if hasattr(model, 'transformer') and hasattr(model.transformer, 'wpe'):
        for i in range(seq_len):
            position_embedding_preview.append({'tokenIndex': i, 'values': model.transformer.wpe.weight[i][:preview_dims].detach().cpu().tolist()})

    attentions = outputs.attentions or []
    hidden_states = outputs.hidden_states or []
    warnings: list[str] = []

    layers = []
    for li in sampled_layers:
        layer_attention = attentions[li] if li < len(attentions) else None
        layer_hidden_before = hidden_states[li][0] if li < len(hidden_states) else None
        layer_hidden_after = hidden_states[li + 1][0] if li + 1 < len(hidden_states) else None

        heads = []
        if layer_attention is not None:
            for hi in range(min(num_heads, int(layer_attention.shape[1]))):
                weights = layer_attention[0, hi].detach().cpu().tolist()
                heads.append({'headIndex': hi, 'weights': weights, 'queryPreview': None, 'keyPreview': None, 'valuePreview': None})
        else:
            warnings.append(f'Layer {li} attention unavailable from runtime.')

        token_norms_before = torch.norm(layer_hidden_before, dim=1).detach().cpu().tolist() if layer_hidden_before is not None else []
        token_norms_after = torch.norm(layer_hidden_after, dim=1).detach().cpu().tolist() if layer_hidden_after is not None else []
        token_means_after = torch.mean(layer_hidden_after, dim=1).detach().cpu().tolist() if layer_hidden_after is not None else []
        token_max_abs_after = torch.max(torch.abs(layer_hidden_after), dim=1).values.detach().cpu().tolist() if layer_hidden_after is not None else []

        layers.append({
            'layerIndex': li,
            'residualStream': {
                'tokenNormsBefore': token_norms_before,
                'tokenNormsAfterAttention': token_norms_after,
                'tokenNormsAfterMlp': token_norms_after,
                'tokenMeanAfterMlp': token_means_after,
                'tokenMaxAbsAfterMlp': token_max_abs_after,
            },
            'attention': {'heads': heads},
            'hiddenStatePreview': [{'tokenIndex': i, 'values': layer_hidden_after[i][:preview_dims].detach().cpu().tolist()} for i in range(seq_len)] if layer_hidden_after is not None else [],
        })

    logits = outputs.logits[0, -1]
    probs = torch.softmax(logits, dim=-1)
    top_probs, top_ids = torch.topk(probs, k=min(max(1, top_k), probs.shape[0]))
    next_token_top_k = []
    for prob, token_id in zip(top_probs, top_ids):
        tid = int(token_id.item())
        next_token_top_k.append({'tokenId': tid, 'text': tokenizer.decode([tid]), 'logit': float(logits[tid].item()), 'probability': float(prob.item())})

    if not any(layer['attention']['heads'] for layer in layers):
        warnings.append('Attention weights not returned by model runtime; ensure eager attention implementation is supported.')
    warnings.append('Q/K/V previews are null in v1 because this tracer does not yet hook per-layer projection internals.')

    return {
        'schemaVersion': '1.0',
        'traceId': f'live-{model_name}',
        'model': {
            'name': model_name,
            'architecture': getattr(config, 'model_type', 'decoder-only-transformer'),
            'numLayers': num_layers,
            'numHeads': num_heads,
            'keyValueHeads': kv_heads,
            'hiddenSize': hidden_size,
            'vocabSize': vocab_size,
            'sampledLayerIndices': sampled_layers,
        },
        'input': {'prompt': prompt, 'tokens': [{'index': i, 'id': int(token_ids[i]), 'text': token_texts[i]} for i in range(seq_len)]},
        'embedding': {'tokenEmbeddingPreview': token_embedding_preview, 'positionEmbeddingPreview': position_embedding_preview, 'previewDimensions': preview_dims},
        'layers': layers,
        'output': {'nextTokenTopK': next_token_top_k},
        'limits': {'maxSequenceTokens': 32, 'previewDimensions': preview_dims, 'returnedLayers': len(layers), 'returnedHeadsPerLayer': num_heads},
        'warnings': warnings,
    }
