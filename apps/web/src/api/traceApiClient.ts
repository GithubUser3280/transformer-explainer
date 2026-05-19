import type { TraceRequest, TransformerTrace } from '@transformer-3d-explainer/shared-types';
import { validateTransformerTrace } from '../transformer-ir/traceValidation';

export class AuthRequiredError extends Error {}
export async function login(password: string, fetchImpl: typeof fetch = fetch) { const r = await fetchImpl('/login', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify({ password }) }); if (!r.ok) throw new Error('Login failed'); return { ok: true as const }; }
export async function logout(fetchImpl: typeof fetch = fetch) { await fetchImpl('/logout', { method: 'POST', credentials: 'include' }); }

export async function requestTransformerTrace(request: TraceRequest, fetchImpl: typeof fetch = fetch): Promise<TransformerTrace> {
  const response = await fetchImpl('/api/trace', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify(request) });
  if (response.status === 401) throw new AuthRequiredError();
  if (!response.ok) throw new Error(`Trace request failed with status ${response.status}`);
  return validateTransformerTrace(await response.json());
}

export async function fetchTransformerTrace(prompt: string): Promise<TransformerTrace> { return requestTransformerTrace({ prompt, maxGeneratedTokens: 1, topK: 10 }); }
