export interface TransformerTrace {
  traceId: string;
  createdAtIso: string;
  modelMetadata: ModelMetadata;
  prompt: PromptTrace;
  tokens: TokenTrace[];
  layers: LayerTrace[];
  logitsSummary?: LogitsSummary;
  warnings: string[];
}

export interface ModelMetadata {
  modelId: string;
  architectureFamily: string;
  parameterCountText: string;
  layerCount: number;
  hiddenSize?: number;
  intermediateSize?: number;
  queryHeadCount?: number;
  keyValueHeadCount?: number;
  usesGroupedQueryAttention: boolean;
  usesRotaryPositionEmbeddings: boolean;
  usesPreNormalization: boolean;
  usesRmsNorm: boolean;
  usesSwiGLU: boolean;
  contextLength?: number;
}

export interface PromptTrace {
  rawText: string;
  tokenCount: number;
  maxPromptTokens: number;
  truncated: boolean;
}

export interface TokenTrace {
  tokenIndex: number;
  text: string;
  tokenId?: number;
  normalizedPosition: [number, number, number];
}

export interface LayerTrace {
  layerIndex: number;
  displayName: string;
  operations: TransformerOperation[];
  summaryStatistics?: TensorSummaryStatistics;
}

export type TransformerOperation =
  | EmbeddingOperation
  | PositionalEncodingOperation
  | NormalizationOperation
  | AttentionOperation
  | ResidualOperation
  | MlpOperation
  | LogitsOperation;

export interface BaseOperation {
  operationId: string;
  kind: TransformerOperationKind;
  displayName: string;
  inputShape: number[];
  outputShape: number[];
  description: string;
}

export type TransformerOperationKind =
  | 'embedding'
  | 'positional_encoding'
  | 'normalization'
  | 'attention'
  | 'residual'
  | 'mlp'
  | 'logits';

export interface EmbeddingOperation extends BaseOperation {
  kind: 'embedding';
}

export interface PositionalEncodingOperation extends BaseOperation {
  kind: 'positional_encoding';
  encodingType: 'rope' | 'absolute' | 'alibi' | 'unknown';
}

export interface NormalizationOperation extends BaseOperation {
  kind: 'normalization';
  normType: 'rmsnorm' | 'layernorm' | 'unknown';
  summaryStatistics?: TensorSummaryStatistics;
}

export interface AttentionOperation extends BaseOperation {
  kind: 'attention';
  attentionType: 'mha' | 'gqa' | 'mqa' | 'sliding_window' | 'local_global' | 'unknown';
  queryHeadCount: number;
  keyValueHeadCount: number;
  selectedHeadIndex?: number;
  topAttentionLinks: AttentionLink[];
  compactHeatmap?: CompactHeatmap;
  summaryStatistics?: TensorSummaryStatistics;
}

export interface ResidualOperation extends BaseOperation {
  kind: 'residual';
}

export interface MlpOperation extends BaseOperation {
  kind: 'mlp';
  activationType: 'swiglu' | 'gelu' | 'relu' | 'unknown';
  summaryStatistics?: TensorSummaryStatistics;
}

export interface LogitsOperation extends BaseOperation {
  kind: 'logits';
  topPredictions?: TokenPrediction[];
}

export interface TensorSummaryStatistics {
  shape: number[];
  min: number;
  max: number;
  mean: number;
  std: number;
}

export interface CompactHeatmap {
  width: number;
  height: number;
  values: number[];
  minValue: number;
  maxValue: number;
}

export interface AttentionLink {
  sourceTokenIndex: number;
  targetTokenIndex: number;
  weight: number;
  headIndex?: number;
  layerIndex: number;
}

export interface LogitsSummary {
  topPredictions: TokenPrediction[];
  entropy?: number;
}

export interface TokenPrediction {
  tokenId?: number;
  text: string;
  probability: number;
}
