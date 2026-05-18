from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4


def build_fake_trace(prompt: str, max_prompt_tokens: int = 48) -> dict:
    words = (prompt.strip().split() or ['empty', 'prompt'])[:max_prompt_tokens]
    tokens = [
        {
            'tokenIndex': index,
            'text': word,
            'tokenId': 1000 + index,
            'normalizedPosition': [index / max(1, len(words) - 1), 0, 0],
        }
        for index, word in enumerate(words)
    ]
    layer_indices = [0, 7, 15]
    layers = []
    for layer_index in layer_indices:
        heatmap_values = []
        for row in range(len(tokens)):
            for col in range(len(tokens)):
                heatmap_values.append(1 / (1 + row - col) if col <= row else 0)
        links = []
        for source in range(len(tokens)):
            for target in range(max(0, source - 2), source + 1):
                links.append({'sourceTokenIndex': source, 'targetTokenIndex': target, 'weight': round(0.75 / (1 + source - target), 3), 'headIndex': 0, 'layerIndex': layer_index})
        layers.append({
            'layerIndex': layer_index,
            'displayName': f'Layer {layer_index}',
            'summaryStatistics': {'shape': [len(tokens), 1024], 'min': -1.0, 'max': 1.0, 'mean': 0.0, 'std': 0.25},
            'operations': [
                {'operationId': f'layer-{layer_index}-norm', 'kind': 'normalization', 'displayName': 'RMSNorm', 'inputShape': [len(tokens), 1024], 'outputShape': [len(tokens), 1024], 'description': 'Pre-attention RMS normalization.', 'normType': 'rmsnorm'},
                {'operationId': f'layer-{layer_index}-attention', 'kind': 'attention', 'displayName': 'Grouped-query self attention', 'inputShape': [len(tokens), 1024], 'outputShape': [len(tokens), 1024], 'description': 'Compact synthetic attention summary.', 'attentionType': 'gqa', 'queryHeadCount': 16, 'keyValueHeadCount': 8, 'selectedHeadIndex': 0, 'topAttentionLinks': links, 'compactHeatmap': {'width': len(tokens), 'height': len(tokens), 'values': heatmap_values, 'minValue': 0, 'maxValue': 1}, 'summaryStatistics': {'shape': [1, 16, len(tokens), len(tokens)], 'min': 0, 'max': 1, 'mean': 0.25, 'std': 0.2}},
                {'operationId': f'layer-{layer_index}-mlp', 'kind': 'mlp', 'displayName': 'SwiGLU MLP', 'inputShape': [len(tokens), 1024], 'outputShape': [len(tokens), 1024], 'description': 'Synthetic MLP activation summary.', 'activationType': 'swiglu'},
                {'operationId': f'layer-{layer_index}-residual', 'kind': 'residual', 'displayName': 'Residual add', 'inputShape': [len(tokens), 1024], 'outputShape': [len(tokens), 1024], 'description': 'Residual stream update.'},
            ],
        })
    return {
        'traceId': f'fake-{uuid4()}',
        'createdAtIso': datetime.now(timezone.utc).isoformat(),
        'modelMetadata': {'modelId': 'Qwen/Qwen3-0.6B (fake trace)', 'architectureFamily': 'decoder-only-transformer', 'parameterCountText': '0.6B target / fake local trace', 'layerCount': 16, 'hiddenSize': 1024, 'intermediateSize': 3072, 'queryHeadCount': 16, 'keyValueHeadCount': 8, 'usesGroupedQueryAttention': True, 'usesRotaryPositionEmbeddings': True, 'usesPreNormalization': True, 'usesRmsNorm': True, 'usesSwiGLU': True, 'contextLength': 32768},
        'prompt': {'rawText': prompt, 'tokenCount': len(tokens), 'maxPromptTokens': max_prompt_tokens, 'truncated': len(prompt.strip().split()) > max_prompt_tokens},
        'tokens': tokens,
        'layers': layers,
        'logitsSummary': {'topPredictions': [{'text': ' attention', 'probability': 0.32}, {'text': ' layer', 'probability': 0.18}], 'entropy': 2.4},
        'warnings': ['Fake trace mode: values are synthetic and no model was downloaded.'],
    }
