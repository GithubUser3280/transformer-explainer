import type { TransformerTrace } from './traceTypes';

export function validateTransformerTrace(candidate: unknown): TransformerTrace {
  if (!candidate || typeof candidate !== 'object') throw new Error('Trace response is not an object');
  const trace = candidate as Partial<TransformerTrace>;
  if (trace.schemaVersion !== '1.0' || !trace.model || !trace.input || !trace.embedding || !Array.isArray(trace.layers) || !trace.output) {
    throw new Error('Trace response is missing required fields');
  }
  return trace as TransformerTrace;
}
