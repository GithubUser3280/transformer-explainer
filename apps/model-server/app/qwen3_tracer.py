from __future__ import annotations

from .model_loader import load_model
from .settings import Settings


def build_qwen3_trace(prompt: str, settings: Settings, model_name: str, top_k: int) -> dict:
    import torch

    tokenizer, model = load_model(model_name)
    encoded = tokenizer(prompt, return_tensors='pt', truncation=True, max_length=min(settings.max_prompt_tokens, 32))
    input_ids = encoded['input_ids'].to('cpu')
    attention_mask = encoded.get('attention_mask')

    with torch.no_grad():
        outputs = model(input_ids=input_ids, attention_mask=attention_mask, output_attentions=True, output_hidden_states=True, return_dict=True, use_cache=False)

    token_ids = input_ids[0].tolist()
    token_texts = tokenizer.convert_ids_to_tokens(token_ids)
    seq_len = len(token_ids)
    preview_dims = 16

    wte = model.get_input_embeddings().weight.detach().cpu()
    token_embedding_preview = [
        {'tokenIndex': i, 'values': wte[token_id][:preview_dims].tolist()} for i, token_id in enumerate(token_ids)
    ]
    position_embedding_preview = []
    if hasattr(model, 'transformer') and hasattr(model.transformer, 'wpe'):
        for i in range(seq_len):
            position_embedding_preview.append({'tokenIndex': i, 'values': model.transformer.wpe.weight[i][:preview_dims].detach().cpu().tolist()})

    num_layers = int(getattr(model.config, 'n_layer', getattr(model.config, 'num_hidden_layers', 0)))
    num_heads = int(getattr(model.config, 'n_head', getattr(model.config, 'num_attention_heads', 0)))
    hidden_size = int(getattr(model.config, 'n_embd', getattr(model.config, 'hidden_size', 0)))
    vocab_size = int(getattr(model.config, 'vocab_size', 0))

    layers = []
    for li, attn in enumerate(outputs.attentions or []):
        layer_hidden_before = outputs.hidden_states[li][0]
        layer_hidden_after = outputs.hidden_states[li + 1][0]
        heads = []
        for hi in range(min(num_heads, attn.shape[1])):
            weights = attn[0, hi].detach().cpu().tolist()
            heads.append({'headIndex': hi, 'weights': weights, 'queryPreview': None, 'keyPreview': None, 'valuePreview': None})
        layers.append({
            'layerIndex': li,
            'residualStream': {
                'tokenNormsBefore': torch.norm(layer_hidden_before, dim=1).detach().cpu().tolist(),
                'tokenNormsAfterAttention': torch.norm(layer_hidden_after, dim=1).detach().cpu().tolist(),
                'tokenNormsAfterMlp': torch.norm(layer_hidden_after, dim=1).detach().cpu().tolist(),
            },
            'attention': {'heads': heads},
            'hiddenStatePreview': [
                {'tokenIndex': i, 'values': layer_hidden_after[i][:preview_dims].detach().cpu().tolist()} for i in range(seq_len)
            ],
        })

    logits = outputs.logits[0, -1]
    probs = torch.softmax(logits, dim=-1)
    top_probs, top_ids = torch.topk(probs, k=min(top_k, probs.shape[0]))
    next_token_top_k = []
    for prob, token_id in zip(top_probs, top_ids):
        tid = int(token_id.item())
        next_token_top_k.append({'tokenId': tid, 'text': tokenizer.decode([tid]), 'logit': float(logits[tid].item()), 'probability': float(prob.item())})

    return {
        'schemaVersion': '1.0',
        'model': {'name': model_name, 'architecture': 'gpt2', 'numLayers': num_layers, 'numHeads': num_heads, 'hiddenSize': hidden_size, 'vocabSize': vocab_size},
        'input': {'prompt': prompt, 'tokens': [{'index': i, 'id': int(token_ids[i]), 'text': token_texts[i]} for i in range(seq_len)]},
        'embedding': {'tokenEmbeddingPreview': token_embedding_preview, 'positionEmbeddingPreview': position_embedding_preview, 'previewDimensions': preview_dims},
        'layers': layers,
        'output': {'nextTokenTopK': next_token_top_k},
        'limits': {'maxSequenceTokens': 32, 'previewDimensions': preview_dims, 'returnedLayers': len(layers), 'returnedHeadsPerLayer': num_heads},
        'warnings': ['Q/K/V previews are null in v1 because this tracer does not yet hook per-layer projection internals.'],
    }
