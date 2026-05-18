import type { TransformerTrace } from './transformerTrace';

export interface TraceRequest {
  prompt: string;
  maxPromptTokens?: number;
  selectedLayerIndices?: number[];
}

export type TraceResponse = TransformerTrace;

export interface HealthResponse {
  status: 'ok';
  modelLoaded: boolean;
  modelId: string;
}
