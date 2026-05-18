from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4
from .model_loader import load_model
from .settings import Settings
from .tensor_sampling import extract_top_attention_links, make_compact_heatmap, summarize_tensor


def _selected_layer_indices(layer_count: int, max_selected_layers: int) -> list[int]:
    if layer_count <= 0:
        return [0]
    candidates = [0, layer_count // 2, layer_count - 1]
    if max_selected_layers > len(candidates):
        stride = max(1, layer_count // max_selected_layers)
        candidates.extend(range(0, layer_count, stride))
    return sorted(set(candidates))[:max_selected_layers]


def build_qwen3_trace(prompt: str, settings: Settings, requested_max_prompt_tokens: int | None = None, requested_layer_indices: list[int] | None = None) -> dict:
    import torch

    tokenizer, model = load_model(settings.model_id)
    max_prompt_tokens = min(requested_max_prompt_tokens or settings.max_prompt_tokens, settings.max_prompt_tokens)
    encoded = tokenizer(prompt, return_tensors='pt', truncation=True, max_length=max_prompt_tokens)
    input_ids = encoded['input_ids'].to('cpu')
    attention_mask = encoded.get('attention_mask')
    if attention_mask is not None:
        attention_mask = attention_mask.to('cpu')

    with torch.no_grad():
        outputs = model(
            input_ids=input_ids,
            attention_mask=attention_mask,
            output_hidden_states=True,
            output_attentions=True,
            use_cache=False,
            return_dict=True,
        )

    config = model.config
    token_ids = input_ids[0].tolist()
    token_texts = tokenizer.convert_ids_to_tokens(token_ids)
    token_count = len(token_ids)
    tokens = [
        {'tokenIndex': index, 'text': token_texts[index], 'tokenId': int(token_id), 'normalizedPosition': [index / max(1, token_count - 1), 0, 0]}
        for index, token_id in enumerate(token_ids)
    ]

    layer_count = int(getattr(config, 'num_hidden_layers', 0) or 0)
    hidden_size = int(getattr(config, 'hidden_size', 0) or 0)
    intermediate_size = int(getattr(config, 'intermediate_size', 0) or 0)
    query_heads = int(getattr(config, 'num_attention_heads', 0) or 0)
    kv_heads = int(getattr(config, 'num_key_value_heads', query_heads) or query_heads)
    selected_layers = requested_layer_indices or _selected_layer_indices(layer_count, settings.max_selected_layers)
    selected_layers = [layer for layer in selected_layers if 0 <= layer < max(1, layer_count)][: settings.max_selected_layers]

    attentions = outputs.attentions or []
    hidden_states = outputs.hidden_states or []
    layers = []
    for layer_index in selected_layers:
        attention_summary = None
        links = []
        heatmap = None
        if layer_index < len(attentions) and attentions[layer_index] is not None:
            # Shape is usually [batch, heads, source_tokens, target_tokens]. Keep only head 0 summary.
            attention_matrix = attentions[layer_index][0, 0].detach().cpu()
            attention_summary = summarize_tensor(attentions[layer_index])
            heatmap = make_compact_heatmap(attention_matrix)
            links = extract_top_attention_links(attention_matrix, layer_index=layer_index, head_index=0)
        hidden_summary = summarize_tensor(hidden_states[layer_index + 1]) if layer_index + 1 < len(hidden_states) else None
        layers.append({
            'layerIndex': int(layer_index),
            'displayName': f'Layer {layer_index}',
            'summaryStatistics': hidden_summary,
            'operations': [
                {'operationId': f'layer-{layer_index}-norm', 'kind': 'normalization', 'displayName': 'RMSNorm', 'inputShape': [token_count, hidden_size], 'outputShape': [token_count, hidden_size], 'description': 'Qwen-style pre-normalization summary.', 'normType': 'rmsnorm'},
                {'operationId': f'layer-{layer_index}-attention', 'kind': 'attention', 'displayName': 'Grouped-query self attention', 'inputShape': [token_count, hidden_size], 'outputShape': [token_count, hidden_size], 'description': 'Compact post-softmax attention summary. Full Q/K/V and pre-softmax scores are intentionally omitted.', 'attentionType': 'gqa' if kv_heads and kv_heads < query_heads else 'mha', 'queryHeadCount': query_heads, 'keyValueHeadCount': kv_heads, 'selectedHeadIndex': 0, 'topAttentionLinks': links, 'compactHeatmap': heatmap, 'summaryStatistics': attention_summary},
                {'operationId': f'layer-{layer_index}-mlp', 'kind': 'mlp', 'displayName': 'SwiGLU MLP', 'inputShape': [token_count, hidden_size], 'outputShape': [token_count, hidden_size], 'description': 'MLP operation summary; deeper activation hooks can be added without changing the trace API.', 'activationType': 'swiglu'},
                {'operationId': f'layer-{layer_index}-residual', 'kind': 'residual', 'displayName': 'Residual add', 'inputShape': [token_count, hidden_size], 'outputShape': [token_count, hidden_size], 'description': 'Residual stream update.'},
            ],
        })

    return {
        'traceId': f'qwen3-{uuid4()}',
        'createdAtIso': datetime.now(timezone.utc).isoformat(),
        'modelMetadata': {
            'modelId': settings.model_id,
            'architectureFamily': 'decoder-only-transformer',
            'parameterCountText': '0.6B target',
            'layerCount': layer_count,
            'hiddenSize': hidden_size,
            'intermediateSize': intermediate_size,
            'queryHeadCount': query_heads,
            'keyValueHeadCount': kv_heads,
            'usesGroupedQueryAttention': kv_heads < query_heads,
            'usesRotaryPositionEmbeddings': True,
            'usesPreNormalization': True,
            'usesRmsNorm': True,
            'usesSwiGLU': True,
            'contextLength': getattr(config, 'max_position_embeddings', None),
        },
        'prompt': {'rawText': prompt, 'tokenCount': token_count, 'maxPromptTokens': max_prompt_tokens, 'truncated': len(tokenizer(prompt)['input_ids']) > max_prompt_tokens},
        'tokens': tokens,
        'layers': layers,
        'warnings': ['Pre-softmax QK^T scores and raw Q/K/V tensors are not exposed in this initial safe tracer.'],
    }
