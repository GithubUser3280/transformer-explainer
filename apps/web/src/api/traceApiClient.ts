import type { TraceRequest, TransformerTrace } from '@transformer-3d-explainer/shared-types';
import { validateTransformerTrace } from '../transformer-ir/traceValidation';

export class AuthRequiredError extends Error {
  constructor(message = 'Authentication required. Please log in to generate a real trace.') {
    super(message);
    this.name = 'AuthRequiredError';
  }
}

export type LoginResult = { ok: true };

export async function login(password: string, fetchImpl: typeof fetch = fetch): Promise<LoginResult> {
  const response = await fetchImpl('/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ password })
  });

  if (!response.ok) {
    throw new Error(response.status === 401 ? 'Incorrect password.' : `Login failed with status ${response.status}`);
  }

  return { ok: true };
}

export async function logout(fetchImpl: typeof fetch = fetch): Promise<void> {
  const response = await fetchImpl('/logout', {
    method: 'POST',
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error(`Logout failed with status ${response.status}`);
  }
}

export async function requestTransformerTrace(request: TraceRequest, fetchImpl: typeof fetch = fetch): Promise<TransformerTrace> {
  const response = await fetchImpl('/api/trace', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(request)
  });

  if (response.status === 401) {
    throw new AuthRequiredError();
  }

  if (!response.ok) {
    throw new Error(`Trace request failed with status ${response.status}`);
  }

  return validateTransformerTrace(await response.json());
}
