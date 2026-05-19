import fixture from '../src/fixtures/trace.the-cat-sat.json';
import { describe, expect, it } from 'vitest';
import { validateTransformerTrace } from '../src/transformer-ir/traceValidation';
import { useTraceStore } from '../src/state/useTraceStore';

describe('trace validation', () => {
  it('parses fixture', () => {
    const trace = validateTransformerTrace(fixture);
    expect(trace.input.tokens.length).toBeGreaterThan(0);
  });

  it('rejects malformed trace', () => {
    expect(() => validateTransformerTrace({ nope: true })).toThrow();
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
