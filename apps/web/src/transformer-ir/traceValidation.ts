import type { TransformerTrace } from './traceTypes';

type LooseRecord = Record<string, unknown>;

function isRecord(value: unknown): value is LooseRecord {
  return Boolean(value) && typeof value === 'object';
}

function asNumberArray(value: unknown): number[] {
  return Array.isArray(value) ? value.filter((v): v is number => typeof v === 'number') : [];
}

function fail(path: string, detail: string): never {
  throw new Error(`Trace validation failed at ${path}: ${detail}`);
}

function parseV1(trace: LooseRecord): TransformerTrace | null {
  if (trace.schemaVersion !== '1.0') return null;
  if (!isRecord(trace.model)) fail('model', 'expected object');
  if (!isRecord(trace.input)) fail('input', 'expected object');
  if (!isRecord(trace.output)) fail('output', 'expected object');
  if (!Array.isArray(trace.layers)) fail('layers', 'expected array');
  return trace as unknown as TransformerTrace;
}

function parseLegacy(trace: LooseRecord): TransformerTrace | null {
  if (!trace.traceId || !isRecord(trace.modelMetadata) || !isRecord(trace.prompt) || !Array.isArray(trace.tokens) || !Array.isArray(trace.layers)) return null;
  const modelMetadata = trace.modelMetadata as LooseRecord;
  const prompt = trace.prompt as LooseRecord;
  const tokens = trace.tokens as LooseRecord[];
  const layers = (trace.layers as LooseRecord[]).map((layer) => {
    const operations = Array.isArray(layer.operations) ? (layer.operations as LooseRecord[]) : [];
    const attentionOp = operations.find((op) => op.kind === 'attention' && isRecord(op));
    const heatmap = isRecord(attentionOp?.compactHeatmap) ? (attentionOp?.compactHeatmap as LooseRecord) : null;
    const width = typeof heatmap?.width === 'number' ? heatmap.width : 0;
    const values = asNumberArray(heatmap?.values);
    const weights = width > 0 ? Array.from({ length: width }, (_, r) => values.slice(r * width, (r + 1) * width)) : [];
    return {
      layerIndex: typeof layer.layerIndex === 'number' ? layer.layerIndex : 0,
      residualStream: {
        tokenNormsBefore: [],
        tokenNormsAfterAttention: [],
        tokenNormsAfterMlp: []
      },
      attention: {
        heads: [{ headIndex: 0, weights, queryPreview: null, keyPreview: null, valuePreview: null }]
      },
      hiddenStatePreview: []
    };
  });

  return {
    schemaVersion: '1.0',
    model: {
      name: String(modelMetadata.modelId ?? 'unknown-model'),
      architecture: String(modelMetadata.architectureFamily ?? 'decoder-only-transformer'),
      numLayers: typeof modelMetadata.layerCount === 'number' ? modelMetadata.layerCount : layers.length,
      numHeads: typeof modelMetadata.queryHeadCount === 'number' ? modelMetadata.queryHeadCount : 1,
      hiddenSize: typeof modelMetadata.hiddenSize === 'number' ? modelMetadata.hiddenSize : 0,
      vocabSize: 0
    },
    input: {
      prompt: String(prompt.rawText ?? ''),
      tokens: tokens.map((token, index) => ({ index: typeof token.tokenIndex === 'number' ? token.tokenIndex : index, id: typeof token.tokenId === 'number' ? token.tokenId : index, text: String(token.text ?? '') }))
    },
    embedding: { tokenEmbeddingPreview: [], positionEmbeddingPreview: [], previewDimensions: 0 },
    layers,
    output: {
      nextTokenTopK: isRecord(trace.logitsSummary) && Array.isArray((trace.logitsSummary as LooseRecord).topPredictions)
        ? ((trace.logitsSummary as LooseRecord).topPredictions as LooseRecord[]).map((p, i) => ({ tokenId: typeof p.tokenId === 'number' ? p.tokenId : i, text: String(p.text ?? ''), logit: 0, probability: typeof p.probability === 'number' ? p.probability : 0 }))
        : []
    },
    limits: { maxSequenceTokens: typeof prompt.maxPromptTokens === 'number' ? prompt.maxPromptTokens : 0, previewDimensions: 0, returnedLayers: layers.length, returnedHeadsPerLayer: 1 },
    warnings: Array.isArray(trace.warnings) ? trace.warnings.filter((w): w is string => typeof w === 'string') : ['Using legacy trace shape normalization.']
  };
}

export function validateTransformerTrace(candidate: unknown): TransformerTrace {
  if (!isRecord(candidate)) fail('$', 'response is not an object');
  const parsedV1 = parseV1(candidate);
  if (parsedV1) return parsedV1;
  const parsedLegacy = parseLegacy(candidate);
  if (parsedLegacy) return parsedLegacy;
  fail('$', 'missing required fields for v1 or legacy trace schema');
}
