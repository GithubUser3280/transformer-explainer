import type { WorkerEnv } from './auth';

export async function proxyApiRequest(request: Request, env: WorkerEnv): Promise<Response> {
  const incomingUrl = new URL(request.url);
  const backendUrl = new URL(incomingUrl.pathname + incomingUrl.search, env.BACKEND_BASE_URL);
  const headers = new Headers(request.headers);
  headers.set('X-Backend-Shared-Secret', env.BACKEND_SHARED_SECRET);
  headers.delete('cookie');
  const backendResponse = await fetch(backendUrl.toString(), {
    method: request.method,
    headers,
    body: request.body,
    redirect: 'manual'
  });
  const passthrough = new Response(backendResponse.body, backendResponse);
  passthrough.headers.set('x-trace-backend-url', backendUrl.origin);
  passthrough.headers.set('x-trace-backend-status', String(backendResponse.status));
  return passthrough;
}
