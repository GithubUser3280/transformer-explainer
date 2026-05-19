import { createExpiredSessionCookie, jsonResponse } from './_shared/authProxy';

export const onRequestPost = async () => {
  const response = jsonResponse({ status: 'ok' });
  response.headers.append('set-cookie', createExpiredSessionCookie());
  return response;
};

export const onRequest = () => jsonResponse({ error: 'Method not allowed' }, { status: 405 });
