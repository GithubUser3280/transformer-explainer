import { describe, expect, it } from 'vitest';
import type { TransformerTrace } from '../src/transformerTrace';

describe('shared TransformerTrace contract', () => {
  it('allows model-agnostic trace metadata', () => {
    const trace = {
      traceId: 'contract-test',
      createdAtIso: '2026-05-18T00:00:00.000Z',
      modelMetadata: {
        modelId: 'Qwen/Qwen3-0.6B',
        architectureFamily: 'decoder-only-transformer',
        parameterCountText: '0.6B',
        layerCount: 16,
        usesGroupedQueryAttention: true,
        usesRotaryPositionEmbeddings: true,
        usesPreNormalization: true,
        usesRmsNorm: true,
        usesSwiGLU: true
      },
      prompt: { rawText: 'hello', tokenCount: 1, maxPromptTokens: 48, truncated: false },
      tokens: [{ tokenIndex: 0, text: 'hello', normalizedPosition: [0, 0, 0] }],
      layers: [],
      warnings: []
    } satisfies TransformerTrace;

    expect(trace.modelMetadata.usesSwiGLU).toBe(true);
  });
});
