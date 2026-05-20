export interface TransformerTrace {
  schemaVersion: '1.0';
  model: {
    name: string;
    architecture: string;
    numLayers: number;
    numHeads: number;
    keyValueHeads?: number;
    hiddenSize: number;
    vocabSize: number;
    sampledLayerIndices?: number[];
  };
  input: {
    prompt: string;
    tokens: Array<{ index: number; id: number; text: string }>;
  };
  embedding: {
    tokenEmbeddingPreview: Array<{ tokenIndex: number; values: number[] }>;
    positionEmbeddingPreview: Array<{ tokenIndex: number; values: number[] }>;
    previewDimensions: number;
  };
  layers: Array<{
    layerIndex: number;
    residualStream: {
      tokenNormsBefore: number[];
      tokenNormsAfterAttention: number[];
      tokenNormsAfterMlp: number[];
      tokenMeanAfterMlp?: number[];
      tokenMaxAbsAfterMlp?: number[];
    };
    attention: {
      heads: Array<{
        headIndex: number;
        weights: number[][];
        queryPreview: number[] | null;
        keyPreview: number[] | null;
        valuePreview: number[] | null;
      }>;
    };
    hiddenStatePreview: Array<{ tokenIndex: number; values: number[] }>;
  }>;
  output: {
    nextTokenTopK: Array<{ tokenId: number; text: string; logit: number; probability: number }>;
  };
  limits: {
    maxSequenceTokens: number;
    previewDimensions: number;
    returnedLayers: number;
    returnedHeadsPerLayer: number;
  };
  warnings?: string[];
}
