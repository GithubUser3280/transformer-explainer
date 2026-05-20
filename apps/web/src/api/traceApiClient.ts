import type { TraceRequest, TransformerTrace } from '@transformer-3d-explainer/shared-types';
import { validateTransformerTrace } from '../transformer-ir/traceValidation';

export class AuthRequiredError extends Error {}
export async function login(password: string, fetchImpl: typeof fetch = fetch) { const r = await fetchImpl('/login', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify({ password }) }); if (!r.ok) throw new Error('Login failed'); return { ok: true as const }; }
export async function logout(fetchImpl: typeof fetch = fetch) { await fetchImpl('/logout', { method: 'POST', credentials: 'include' }); }

export interface TraceRawSummary {
  url: string;
  status: number;
  responseKeys: string[];
  traceId?: string;
  hasAttention: boolean;
  firstLayerHeadCount: number;
  hasTopK: boolean;
  topKLength: number;
  hasResidual: boolean;
  residualKey: string;
}

function summarizeRaw(raw: any, url: string, status: number): TraceRawSummary {
  const firstLayer = raw?.layers?.[0] ?? {};
  const heads = firstLayer?.attention?.heads;
  const residual = firstLayer?.residualStream ?? {};
  const residualKey = ['tokenNormsAfterMlp', 'tokenNormAfterMlp', 'tokenNormAfterAttention', 'tokenNormsAfterAttention'].find((k) => Array.isArray((residual as Record<string, unknown>)[k])) ?? 'none';
  const topKArr = raw?.output?.nextTokenTopK ?? raw?.logitsSummary?.topPredictions ?? [];
  return {
    url,
    status,
    responseKeys: Object.keys(raw ?? {}),
    traceId: raw?.traceId,
    hasAttention: Array.isArray(heads) && heads.length > 0,
    firstLayerHeadCount: Array.isArray(heads) ? heads.length : 0,
    hasTopK: Array.isArray(topKArr) && topKArr.length > 0,
    topKLength: Array.isArray(topKArr) ? topKArr.length : 0,
    hasResidual: residualKey !== 'none',
    residualKey,
  };
}

export async function requestTransformerTrace(request: TraceRequest, fetchImpl: typeof fetch = fetch): Promise<{ trace: TransformerTrace; rawSummary: TraceRawSummary }> {
  const apiUrl = '/api/trace';
  const response = await fetchImpl(apiUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify(request) });
  if (response.status === 401) throw new AuthRequiredError();
  if (!response.ok) throw new Error(`Trace request failed with status ${response.status}`);
  const raw = await response.json();
  const trace = validateTransformerTrace(raw);
  const rawSummary = summarizeRaw(raw, apiUrl, response.status);

  if (process.env.NODE_ENV !== 'production') {
    const normalizedHeads = trace.layers[0]?.attention?.heads.length ?? 0;
    const normalizedTopK = trace.output.nextTokenTopK.length;
    const normalizedResidual = trace.layers.some((layer) => layer.residualStream.tokenNormsAfterMlp.length > 0 || (layer.residualStream.tokenMeanAfterMlp?.length ?? 0) > 0 || (layer.residualStream.tokenMaxAbsAfterMlp?.length ?? 0) > 0);
    console.info('Trace API URL', apiUrl);
    console.table({ rawHasAttention: rawSummary.hasAttention, normalizedHasAttention: normalizedHeads > 0, rawHasTopK: rawSummary.hasTopK, normalizedHasTopK: normalizedTopK > 0, rawHasResidual: rawSummary.hasResidual, normalizedHasResidual: normalizedResidual, rawFirstLayerHeadCount: rawSummary.firstLayerHeadCount, normalizedFirstLayerHeadCount: normalizedHeads });
  }

  return { trace, rawSummary };
}

export async function fetchTransformerTrace(prompt: string): Promise<TransformerTrace> { return (await requestTransformerTrace({ prompt, maxGeneratedTokens: 1, topK: 10 })).trace; }
