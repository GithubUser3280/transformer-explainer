import type { TransformerTrace } from './traceTypes';

export function createFakeTrace(prompt = 'Explain grouped-query attention in a tiny trace.'): TransformerTrace {
  const tokenTexts = prompt.trim().length > 0 ? prompt.trim().split(/\s+/).slice(0, 10) : ['empty', 'prompt'];
  const tokens = tokenTexts.map((text, tokenIndex) => ({
    tokenIndex,
    text,
    tokenId: 1000 + tokenIndex,
    normalizedPosition: [tokenIndex / Math.max(1, tokenTexts.length - 1), 0, 0] as [number, number, number]
  }));

  const layerIndices = [0, 7, 15];
  return {
    traceId: `fake-${Date.now()}`,
    createdAtIso: new Date().toISOString(),
    modelMetadata: {
      modelId: 'Qwen/Qwen3-0.6B (fake trace)',
      architectureFamily: 'decoder-only-transformer',
      parameterCountText: '0.6B target / fake local trace',
      layerCount: 16,
      hiddenSize: 1024,
      intermediateSize: 3072,
      queryHeadCount: 16,
      keyValueHeadCount: 8,
      usesGroupedQueryAttention: true,
      usesRotaryPositionEmbeddings: true,
      usesPreNormalization: true,
      usesRmsNorm: true,
      usesSwiGLU: true,
      contextLength: 32768
    },
    prompt: {
      rawText: prompt,
      tokenCount: tokens.length,
      maxPromptTokens: 48,
      truncated: false
    },
    tokens,
    layers: layerIndices.map((layerIndex, order) => ({
      layerIndex,
      displayName: order === 0 ? 'Early layer' : order === 1 ? 'Middle layer' : 'Final layer',
      summaryStatistics: { shape: [tokens.length, 1024], min: -1, max: 1, mean: 0, std: 0.2 + order * 0.05 },
      operations: [
        {
          operationId: `layer-${layerIndex}-norm-1`,
          kind: 'normalization',
          displayName: 'RMSNorm',
          inputShape: [tokens.length, 1024],
          outputShape: [tokens.length, 1024],
          description: 'Pre-normalization keeps residual streams stable before attention.',
          normType: 'rmsnorm',
          summaryStatistics: { shape: [tokens.length, 1024], min: -0.8, max: 0.8, mean: 0, std: 0.18 }
        },
        {
          operationId: `layer-${layerIndex}-attention`,
          kind: 'attention',
          displayName: 'Grouped-query self attention',
          inputShape: [tokens.length, 1024],
          outputShape: [tokens.length, 1024],
          description: 'A compact summary of selected head attention flow; not full attention tensors.',
          attentionType: 'gqa',
          queryHeadCount: 16,
          keyValueHeadCount: 8,
          selectedHeadIndex: 0,
          topAttentionLinks: tokens.flatMap((source) =>
            tokens.slice(Math.max(0, source.tokenIndex - 2), source.tokenIndex + 1).map((target, rank) => ({
              sourceTokenIndex: source.tokenIndex,
              targetTokenIndex: target.tokenIndex,
              weight: Number((0.75 / (rank + 1)).toFixed(3)),
              headIndex: 0,
              layerIndex
            }))
          ),
          compactHeatmap: {
            width: tokens.length,
            height: tokens.length,
            values: Array.from({ length: tokens.length * tokens.length }, (_, index) => {
              const row = Math.floor(index / tokens.length);
              const col = index % tokens.length;
              return col <= row ? Number((1 / (1 + row - col)).toFixed(3)) : 0;
            }),
            minValue: 0,
            maxValue: 1
          },
          summaryStatistics: { shape: [1, 16, tokens.length, tokens.length], min: 0, max: 1, mean: 0.25, std: 0.2 }
        },
        {
          operationId: `layer-${layerIndex}-mlp`,
          kind: 'mlp',
          displayName: 'SwiGLU MLP',
          inputShape: [tokens.length, 1024],
          outputShape: [tokens.length, 1024],
          description: 'Feed-forward expansion and gated activation summarized for visualization.',
          activationType: 'swiglu',
          summaryStatistics: { shape: [tokens.length, 3072], min: -2, max: 2, mean: 0.02, std: 0.35 }
        },
        {
          operationId: `layer-${layerIndex}-residual`,
          kind: 'residual',
          displayName: 'Residual add',
          inputShape: [tokens.length, 1024],
          outputShape: [tokens.length, 1024],
          description: 'Attention and MLP outputs rejoin the residual stream.'
        }
      ]
    })),
    logitsSummary: {
      topPredictions: [
        { text: ' attention', probability: 0.32 },
        { text: ' token', probability: 0.18 },
        { text: ' layer', probability: 0.12 }
      ],
      entropy: 2.4
    },
    warnings: ['Fake trace mode: values are synthetic and payload shape is representative.']
  };
}
