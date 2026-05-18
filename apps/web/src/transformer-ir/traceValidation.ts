import type { TransformerTrace } from './traceTypes';

export function validateTransformerTrace(candidate: unknown): TransformerTrace {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error('Trace response is not an object.');
  }
  const trace = candidate as Partial<TransformerTrace>;
  if (!trace.traceId || !trace.modelMetadata || !trace.prompt || !Array.isArray(trace.tokens) || !Array.isArray(trace.layers)) {
    throw new Error('Trace response is missing required TransformerTrace fields.');
  }
  for (const layer of trace.layers) {
    if (!Array.isArray(layer.operations)) {
      throw new Error(`Layer ${layer.layerIndex} is missing operations.`);
    }
  }
  return trace as TransformerTrace;
}
