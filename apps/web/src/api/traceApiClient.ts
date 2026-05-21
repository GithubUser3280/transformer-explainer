import type { TraceRequest, TransformerTrace } from '@transformer-3d-explainer/shared-types';
import { validateTransformerTrace } from '../transformer-ir/traceValidation';

export type StaticSecretsConfig = {
  apiBaseUrl: string;
  backendSharedSecret?: string;
  accessPassword?: string;
};

const STATIC_SECRETS_STORAGE_KEY = 'transformer-explainer-static-secrets';

function getStaticSecretsConfig(): StaticSecretsConfig | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(STATIC_SECRETS_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StaticSecretsConfig;
    if (!parsed.apiBaseUrl?.trim()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveStaticSecretsConfig(config: StaticSecretsConfig) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STATIC_SECRETS_STORAGE_KEY, JSON.stringify(config));
}

export class AuthRequiredError extends Error {}
export async function login(password: string, fetchImpl: typeof fetch = fetch) {
  const staticConfig = getStaticSecretsConfig();
  if (staticConfig) {
    saveStaticSecretsConfig({ ...staticConfig, accessPassword: password });
    return { ok: true as const };
  }

  const r = await fetchImpl('/login', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify({ password }) });
  if (!r.ok) throw new Error('Login failed'); return { ok: true as const };
}
export async function logout(fetchImpl: typeof fetch = fetch) { await fetchImpl('/logout', { method: 'POST', credentials: 'include' }); }

function hasResidualSummaries(trace: TransformerTrace): boolean {
  return trace.layers.some((layer) => layer.residualStream.tokenNormsAfterMlp.length > 0 || (layer.residualStream.tokenMeanAfterMlp?.length ?? 0) > 0 || (layer.residualStream.tokenMaxAbsAfterMlp?.length ?? 0) > 0);
}

function hasAttention(trace: TransformerTrace): boolean {
  return trace.layers.some((layer) => (layer.attention?.heads ?? []).some((head) => head.weights.length > 0));
}

export async function requestTransformerTrace(request: TraceRequest, fetchImpl: typeof fetch = fetch): Promise<TransformerTrace> {
  const staticConfig = getStaticSecretsConfig();
  const apiUrl = staticConfig ? `${staticConfig.apiBaseUrl.replace(/\/$/, '')}/api/trace` : '/api/trace';
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (staticConfig?.backendSharedSecret) {
    headers['X-Backend-Shared-Secret'] = staticConfig.backendSharedSecret;
  }
  if (staticConfig?.accessPassword) {
    headers['X-Access-Password'] = staticConfig.accessPassword;
  }

  const response = await fetchImpl(apiUrl, { method: 'POST', headers, credentials: staticConfig ? 'omit' : 'include', body: JSON.stringify(request) });
  if (response.status === 401) throw new AuthRequiredError();
  if (!response.ok) throw new Error(`Trace request failed with status ${response.status}`);
  const raw = await response.json();
  const normalized = validateTransformerTrace(raw);

  if (process.env.NODE_ENV !== 'production') {
    const firstLayer = (raw?.layers?.[0] ?? {}) as Record<string, unknown>;
    const firstLayerAttention = (firstLayer.attention ?? {}) as Record<string, unknown>;
    const firstLayerHeadCount = Array.isArray(firstLayerAttention.heads) ? firstLayerAttention.heads.length : 0;
    const rawHasTopK = Array.isArray(raw?.output?.nextTokenTopK) || Array.isArray(raw?.logitsSummary?.topPredictions);
    const rawHasResidual = Array.isArray(raw?.layers) && raw.layers.some((layer: Record<string, unknown>) => Boolean(layer?.residualStream));
    const rawHasAttention = Array.isArray(raw?.layers) && raw.layers.some((layer: Record<string, unknown>) => Array.isArray((layer?.attention as { heads?: unknown[] } | undefined)?.heads));
    const normalizedHasTopK = normalized.output.nextTokenTopK.length > 0;
    const normalizedHasResidual = hasResidualSummaries(normalized);
    const normalizedHasAttention = hasAttention(normalized);
    console.info('Trace API URL', apiUrl);
    console.table({ rawHasAttention, normalizedHasAttention, rawHasTopK, normalizedHasTopK, rawHasResidual, normalizedHasResidual, firstLayerHeadCount });
    console.info('Trace raw keys', Object.keys(raw ?? {}));
    console.info('Trace normalized keys', Object.keys(normalized));
    console.info('Trace first layer keys', Object.keys(firstLayer));
    console.info('Trace first layer attention keys', Object.keys(firstLayerAttention));
    console.info('Trace normalized summary', { outputTopKLength: normalized.output.nextTokenTopK.length, residualExists: normalizedHasResidual, attentionExists: normalizedHasAttention });
  }

  return normalized;
}

export async function fetchTransformerTrace(prompt: string): Promise<TransformerTrace> { return requestTransformerTrace({ prompt, maxGeneratedTokens: 1, topK: 10 }); }
