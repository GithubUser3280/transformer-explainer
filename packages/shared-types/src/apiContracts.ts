import type { TransformerTrace } from './transformerTrace';

export interface TraceRequest {
  prompt: string;
  maxGeneratedTokens?: number;
  topK?: number;
  modelName?: string;
}

export type TraceResponse = TransformerTrace;

export interface HealthResponse {
  status: 'ok';
  modelLoaded: boolean;
  modelId: string;
}
