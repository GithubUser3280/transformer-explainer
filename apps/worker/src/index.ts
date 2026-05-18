import { type WorkerEnv, verifyPassword } from './auth';
import { createExpiredSessionCookie, createSessionCookie, hasValidSessionCookie } from './cookies';
import { proxyApiRequest } from './proxy';
import { jsonResponse, withSecurityHeaders } from './securityHeaders';

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/health') {
      return withSecurityHeaders(new Response('ok', { headers: { 'content-type': 'text/plain' } }));
    }

    if (request.method === 'POST' && url.pathname === '/login') {
      const body = (await request.json().catch(() => null)) as { password?: string } | null;
      if (!body?.password || !(await verifyPassword(body.password, env.ACCESS_PASSWORD_HASH))) {
        return jsonResponse({ error: 'Invalid password' }, { status: 401 });
      }
      const response = jsonResponse({ status: 'ok' });
      response.headers.append('set-cookie', await createSessionCookie(env.COOKIE_SIGNING_SECRET));
      return response;
    }

    if (request.method === 'POST' && url.pathname === '/logout') {
      const response = jsonResponse({ status: 'ok' });
      response.headers.append('set-cookie', createExpiredSessionCookie());
      return response;
    }

    const hasSession = await hasValidSessionCookie(request, env.COOKIE_SIGNING_SECRET);
    if (url.pathname.startsWith('/api/')) {
      if (!hasSession) return jsonResponse({ error: 'Authentication required' }, { status: 401 });
      return withSecurityHeaders(await proxyApiRequest(request, env));
    }

    if (url.pathname.startsWith('/app') && !hasSession) {
      return jsonResponse({ error: 'Authentication required' }, { status: 401 });
    }

    return jsonResponse({ error: 'Not found' }, { status: 404 });
  }
};
