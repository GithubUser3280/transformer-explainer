import { createSessionCookie, jsonResponse, verifyPassword, type PagesEnv } from './_shared/authProxy';

export const onRequestPost = async (context: { request: Request; env: PagesEnv }) => {
  const body = (await context.request.json().catch(() => null)) as { password?: string } | null;
  if (!body?.password || !(await verifyPassword(body.password, context.env.ACCESS_PASSWORD_HASH))) {
    return jsonResponse({ error: 'Invalid password' }, { status: 401 });
  }

  const response = jsonResponse({ status: 'ok' });
  response.headers.append('set-cookie', await createSessionCookie(context.env.COOKIE_SIGNING_SECRET));
  return response;
};

export const onRequest = () => jsonResponse({ error: 'Method not allowed' }, { status: 405 });
