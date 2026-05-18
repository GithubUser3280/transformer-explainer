import type { WorkerEnv } from './auth';

export async function proxyApiRequest(request: Request, env: WorkerEnv): Promise<Response> {
  const incomingUrl = new URL(request.url);
  const backendUrl = new URL(incomingUrl.pathname + incomingUrl.search, env.BACKEND_BASE_URL);
  const headers = new Headers(request.headers);
  headers.set('X-Backend-Shared-Secret', env.BACKEND_SHARED_SECRET);
  headers.delete('cookie');
  return fetch(backendUrl.toString(), {
    method: request.method,
    headers,
    body: request.body,
    redirect: 'manual'
  });
}
