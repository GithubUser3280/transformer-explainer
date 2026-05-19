import fixture from '../src/fixtures/trace.the-cat-sat.json';
import { describe, expect, it } from 'vitest';
import { validateTransformerTrace } from '../src/transformer-ir/traceValidation';
import { useTraceStore } from '../src/state/useTraceStore';

describe('trace validation', () => {
  it('parses fixture legacy schema and normalizes', () => {
    const trace = validateTransformerTrace(fixture);
    expect(trace.schemaVersion).toBe('1.0');
    expect(trace.input.tokens.length).toBeGreaterThan(0);
  });

  it('parses live-style legacy trace', () => {
    const trace = validateTransformerTrace({ ...fixture, layers: [{ layerIndex: 0, operations: [{ kind: 'attention', compactHeatmap: { width: 2, height: 2, values: [1,0,0.4,0.6] } }] }, { layerIndex: 4, operations: [] }, { layerIndex: 8, operations: [] }, { layerIndex: 12, operations: [] }, { layerIndex: 14, operations: [] }, { layerIndex: 16, operations: [] }] });
    expect(trace.layers.map((l) => l.layerIndex)).toEqual([0, 4, 8, 12, 14, 16]);
  });

  it('fails with clear required-field error', () => {
    expect(() => validateTransformerTrace({ nope: true })).toThrow(/missing required fields/i);
  });

  it('nullable qkv previews are allowed', () => {
    const trace = validateTransformerTrace({ schemaVersion: '1.0', model: { name: 'm', architecture: 'a', numLayers: 1, numHeads: 1, hiddenSize: 1, vocabSize: 1 }, input: { prompt: 'x', tokens: [{ index: 0, id: 1, text: 'x' }] }, embedding: { tokenEmbeddingPreview: [], positionEmbeddingPreview: [], previewDimensions: 0 }, layers: [{ layerIndex: 0, residualStream: { tokenNormsBefore: [1], tokenNormsAfterAttention: [1], tokenNormsAfterMlp: [1] }, attention: { heads: [{ headIndex: 0, weights: [[1]], queryPreview: null, keyPreview: null, valuePreview: null }] }, hiddenStatePreview: [] }], output: { nextTokenTopK: [] }, limits: { maxSequenceTokens: 1, previewDimensions: 0, returnedLayers: 1, returnedHeadsPerLayer: 1 }, warnings: [] });
    expect(trace.layers[0].attention.heads[0].queryPreview).toBeNull();
  });

  it('updates selection state', () => {
    useTraceStore.getState().setSelectedLayerIndex(1);
    useTraceStore.getState().setSelectedHeadIndex(2);
    useTraceStore.getState().setSelectedTokenIndex(3);
    expect(useTraceStore.getState().selectedLayerIndex).toBe(1);
    expect(useTraceStore.getState().selectedHeadIndex).toBe(2);
    expect(useTraceStore.getState().selectedTokenIndex).toBe(3);
  });
});
