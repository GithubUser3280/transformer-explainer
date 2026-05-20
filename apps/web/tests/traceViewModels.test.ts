import fixture from '../src/fixtures/trace.the-cat-sat.json';
import { describe, expect, it } from 'vitest';
import { buildLayerViewModelsFromTrace, buildOutputLogitViewModelsFromTrace, buildTokenViewModelsFromTrace, getSelectedAttentionHeadFromTrace, getSelectedLayerFromTrace } from '../src/scenes/traceViewModels';
import { validateTransformerTrace } from '../src/transformer-ir/traceValidation';

const trace = validateTransformerTrace(fixture);

describe('trace view models', () => {
  it('preserves sampled layer indices', () => {
    const vm = buildLayerViewModelsFromTrace(trace, trace.layers[0].layerIndex);
    expect(vm.map((x) => x.layerIndex)).toEqual(trace.layers.map((l) => l.layerIndex));
  });

  it('selects attention head from selected layer', () => {
    const head = getSelectedAttentionHeadFromTrace(trace, trace.layers[0].layerIndex, trace.layers[0].attention.heads[0].headIndex);
    expect(head?.weights.length).toBe(trace.input.tokens.length);
  });

  it('builds logits vm from real top-k', () => {
    const logits = buildOutputLogitViewModelsFromTrace(trace);
    expect(logits[0].tokenId).toBe(trace.output.nextTokenTopK[0].tokenId);
  });

  it('handles missing attention as unavailable without crash', () => {
    const copy = structuredClone(trace);
    // @ts-expect-error test missing
    copy.layers[0].attention = undefined;
    const head = getSelectedAttentionHeadFromTrace(copy, copy.layers[0].layerIndex, 0);
    expect(head).toBeUndefined();
  });


  it('selected head supports multiple heads', () => {
    const copy = structuredClone(trace);
    copy.layers[0].attention.heads = [
      { headIndex: 0, weights: [[1]], queryPreview: null, keyPreview: null, valuePreview: null },
      { headIndex: 1, weights: [[0.5]], queryPreview: null, keyPreview: null, valuePreview: null }
    ];
    const selected = getSelectedAttentionHeadFromTrace(copy, copy.layers[0].layerIndex, 1);
    expect(selected?.headIndex).toBe(1);
  });

  it('token vm handles whitespace markers', () => {
    const copy = structuredClone(trace);
    copy.input.tokens[0].text = 'ĠThe';
    const tokens = buildTokenViewModelsFromTrace(copy, 0);
    expect(tokens[0].label.includes('␠')).toBe(true);
  });
});
