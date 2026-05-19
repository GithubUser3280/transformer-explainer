import type { TransformerTrace } from '../src/transformer-ir/traceTypes';
import fixture from '../src/fixtures/trace.the-cat-sat.json';
import { describe, expect, it } from 'vitest';
import { buildLayerViewModelsFromTrace, buildOutputLogitViewModelsFromTrace, buildTokenViewModelsFromTrace, getSelectedAttentionHeadFromTrace, getSelectedLayerFromTrace } from '../src/scenes/traceViewModels';

const typedFixture = fixture as unknown as TransformerTrace;

describe('trace view models', () => {
  it('preserves sampled layer indices', () => {
    const vm = buildLayerViewModelsFromTrace(typedFixture, typedFixture.layers[0].layerIndex);
    expect(vm.map((x) => x.layerIndex)).toEqual(typedFixture.layers.map((l) => l.layerIndex));
  });

  it('selects attention head from selected layer', () => {
    const head = getSelectedAttentionHeadFromTrace(typedFixture, typedFixture.layers[0].layerIndex, typedFixture.layers[0].attention.heads[0].headIndex);
    expect(head?.weights.length).toBe(typedFixture.input.tokens.length);
  });

  it('builds logits vm from real top-k', () => {
    const logits = buildOutputLogitViewModelsFromTrace(typedFixture);
    expect(logits[0].tokenId).toBe(typedFixture.output.nextTokenTopK[0].tokenId);
  });

  it('handles missing attention as unavailable without crash', () => {
    const copy = structuredClone(typedFixture);
    // @ts-expect-error test missing
    copy.layers[0].attention = undefined;
    const layer = getSelectedLayerFromTrace(copy, copy.layers[0].layerIndex);
    expect(layer).toBeTruthy();
    const head = getSelectedAttentionHeadFromTrace(copy, copy.layers[0].layerIndex, 0);
    expect(head).toBeUndefined();
  });

  it('token vm handles whitespace markers', () => {
    const copy = structuredClone(typedFixture);
    copy.input.tokens[0].text = 'ĠThe';
    const tokens = buildTokenViewModelsFromTrace(copy, 0);
    expect(tokens[0].label.includes('␠')).toBe(true);
  });
});
