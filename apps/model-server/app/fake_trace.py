from __future__ import annotations


def build_fake_trace(prompt: str, max_prompt_tokens: int = 32) -> dict:
    tokens = (prompt.strip().split() or ['The', 'cat', 'sat'])[:max_prompt_tokens]
    n = len(tokens)
    return {
        'schemaVersion': '1.0',
        'model': {'name': 'fake-distilgpt2', 'architecture': 'gpt2', 'numLayers': 2, 'numHeads': 2, 'hiddenSize': 32, 'vocabSize': 50257},
        'input': {'prompt': prompt, 'tokens': [{'index': i, 'id': 100 + i, 'text': t} for i, t in enumerate(tokens)]},
        'embedding': {
            'tokenEmbeddingPreview': [{'tokenIndex': i, 'values': [0.1 * (j + 1) for j in range(16)]} for i in range(n)],
            'positionEmbeddingPreview': [{'tokenIndex': i, 'values': [0.01 * (i + j) for j in range(16)]} for i in range(n)],
            'previewDimensions': 16,
        },
        'layers': [
            {
                'layerIndex': li,
                'residualStream': {'tokenNormsBefore': [1.0] * n, 'tokenNormsAfterAttention': [1.1] * n, 'tokenNormsAfterMlp': [1.2] * n},
                'attention': {'heads': [{'headIndex': 0, 'weights': [[1.0 if c <= r else 0.0 for c in range(n)] for r in range(n)], 'queryPreview': None, 'keyPreview': None, 'valuePreview': None}]},
                'hiddenStatePreview': [{'tokenIndex': i, 'values': [0.2] * 16} for i in range(n)],
            }
            for li in range(2)
        ],
        'output': {'nextTokenTopK': [{'tokenId': 42, 'text': ' cat', 'logit': 1.0, 'probability': 0.4}]},
        'limits': {'maxSequenceTokens': 32, 'previewDimensions': 16, 'returnedLayers': 2, 'returnedHeadsPerLayer': 1},
        'warnings': ['Fake trace mode enabled.'],
    }
