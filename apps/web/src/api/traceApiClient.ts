import type { TraceRequest, TransformerTrace } from '@transformer-3d-explainer/shared-types';
import { validateTransformerTrace } from '../transformer-ir/traceValidation';

export async function requestTransformerTrace(request: TraceRequest, fetchImpl: typeof fetch = fetch): Promise<TransformerTrace> {
  const response = await fetchImpl('/api/trace', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    throw new Error(`Trace request failed with status ${response.status}`);
  }

  return validateTransformerTrace(await response.json());
}
