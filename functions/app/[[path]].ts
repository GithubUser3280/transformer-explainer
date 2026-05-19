import { hasValidSessionCookie, jsonResponse, withRobotsNoIndex, withSecurityHeaders, type PagesEnv } from '../_shared/authProxy';

export const onRequest = async (context: { request: Request; env: PagesEnv; next: () => Promise<Response> }) => {
  const hasSession = await hasValidSessionCookie(context.request, context.env.COOKIE_SIGNING_SECRET);
  if (!hasSession) {
    return withRobotsNoIndex(jsonResponse({ error: 'Authentication required' }, { status: 401 }));
  }

  return withRobotsNoIndex(withSecurityHeaders(await context.next()));
};
