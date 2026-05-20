export type { TraceRequest, TransformerTrace } from '@transformer-3d-explainer/shared-types';
export interface TokenTrace { tokenIndex: number; text: string; normalizedPosition: [number, number, number]; }
export interface AttentionLink { sourceTokenIndex: number; targetTokenIndex: number; weight: number; layerIndex: number; headIndex?: number; }
