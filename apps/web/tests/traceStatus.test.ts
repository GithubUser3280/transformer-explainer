import { describe, expect, it } from 'vitest';
import fixture from '../src/fixtures/trace.the-cat-sat.json';
import { getDataAvailability } from '../src/scenes/traceViewModels';
import { useTraceStore } from '../src/state/useTraceStore';
import { validateTransformerTrace } from '../src/transformer-ir/traceValidation';

describe('trace status and availability', () => {
  it('transitions live success status', () => {
    const trace = validateTransformerTrace(fixture);
    useTraceStore.getState().setTraceSourceStatus('loading');
    useTraceStore.getState().setTrace(trace);
    useTraceStore.getState().setTraceSourceStatus('live-success');
    expect(useTraceStore.getState().traceDiagnostics.sourceStatus).toBe('live-success');
  });

  it('transitions fallback after failure', () => {
    const trace = validateTransformerTrace(fixture);
    useTraceStore.getState().setTraceSourceStatus('fallback-after-failure');
    useTraceStore.getState().setTraceError('bad schema');
    useTraceStore.getState().setTrace(trace);
    expect(useTraceStore.getState().traceDiagnostics.sourceStatus).toBe('fallback-after-failure');
    expect(useTraceStore.getState().traceDiagnostics.lastError).toBe('bad schema');
  });

  it('availability flags expose missing residual/top-k', () => {
    const trace = validateTransformerTrace(fixture);
    for (const layer of trace.layers) layer.residualStream.tokenNormsAfterMlp = [];
    trace.output.nextTokenTopK = [];
    const availability = getDataAvailability(trace);
    expect(availability.hasResidualSummary).toBe(false);
    expect(availability.hasOutputTopK).toBe(false);
  });
});


it('availability flags become true for enriched trace', () => {
  const trace = validateTransformerTrace(fixture);
  trace.layers[0].residualStream.tokenNormsAfterMlp = [0.1, 0.2, 0.3];
  const availability = getDataAvailability(trace);
  expect(availability.hasAttentionWeights).toBe(true);
  expect(availability.hasResidualSummary).toBe(true);
  expect(availability.hasOutputTopK).toBe(true);
});
