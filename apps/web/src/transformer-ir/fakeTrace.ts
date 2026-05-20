import type { TransformerTrace } from './traceTypes';

export function createFakeTrace(prompt = 'The cat sat'): TransformerTrace {
  const t = prompt.split(/\s+/).filter(Boolean);
  const n = t.length || 3;
  const tokens = (t.length ? t : ['The', 'cat', 'sat']).map((text, index) => ({ index, id: 100 + index, text }));
  return {
    schemaVersion: '1.0',
    model: { name: 'fixture', architecture: 'gpt2', numLayers: 2, numHeads: 2, hiddenSize: 32, vocabSize: 50000 },
    input: { prompt, tokens },
    embedding: { tokenEmbeddingPreview: tokens.map((x) => ({ tokenIndex: x.index, values: Array.from({ length: 16 }, (_, i) => i / 16) })), positionEmbeddingPreview: tokens.map((x) => ({ tokenIndex: x.index, values: Array.from({ length: 16 }, (_, i) => (x.index + i) / 16) })), previewDimensions: 16 },
    layers: Array.from({ length: 2 }, (_, li) => ({ layerIndex: li, residualStream: { tokenNormsBefore: Array(n).fill(1), tokenNormsAfterAttention: Array(n).fill(1.1), tokenNormsAfterMlp: Array(n).fill(1.2) }, attention: { heads: [{ headIndex: 0, weights: Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => c <= r ? 1 : 0)), queryPreview: null, keyPreview: null, valuePreview: null }] }, hiddenStatePreview: tokens.map((x) => ({ tokenIndex: x.index, values: Array(16).fill(0.2) })) })),
    output: { nextTokenTopK: [{ tokenId: 1, text: ' on', logit: 1.2, probability: 0.4 }] },
    limits: { maxSequenceTokens: 32, previewDimensions: 16, returnedLayers: 2, returnedHeadsPerLayer: 1 },
    warnings: ['Fixture']
  };
}
