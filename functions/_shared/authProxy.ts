export interface PagesEnv {
  ACCESS_PASSWORD_HASH: string;
  COOKIE_SIGNING_SECRET: string;
  BACKEND_BASE_URL: string;
  BACKEND_SHARED_SECRET: string;
}

const textEncoder = new TextEncoder();
const SESSION_COOKIE_NAME = 'transformer_3d_session';

function toHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(input: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', textEncoder.encode(input)));
}

function base64UrlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const byteArray = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const binary = String.fromCharCode(...byteArray);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmacSha256(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', textEncoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return base64UrlEncode(await crypto.subtle.sign('HMAC', key, textEncoder.encode(message)));
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, expectedHash] = storedHash.split(':');
  if (!salt || !expectedHash) return false;
  const candidateHash = await sha256Hex(`${salt}:${password}`);
  return timingSafeEqual(candidateHash, expectedHash);
}

export async function createSessionCookie(secret: string, nowSeconds = Math.floor(Date.now() / 1000)): Promise<string> {
  const payload = JSON.stringify({ iat: nowSeconds, exp: nowSeconds + 60 * 60 * 12 });
  const encodedPayload = base64UrlEncode(textEncoder.encode(payload));
  const signature = await hmacSha256(encodedPayload, secret);
  return `${SESSION_COOKIE_NAME}=${encodedPayload}.${signature}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200`;
}

export function createExpiredSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

export async function hasValidSessionCookie(request: Request, secret: string, nowSeconds = Math.floor(Date.now() / 1000)): Promise<boolean> {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const value = cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.slice(SESSION_COOKIE_NAME.length + 1);
  if (!value) return false;
  const [encodedPayload, signature] = value.split('.');
  if (!encodedPayload || !signature) return false;
  const expectedSignature = await hmacSha256(encodedPayload, secret);
  if (!timingSafeEqual(signature, expectedSignature)) return false;
  try {
    const payloadJson = atob(encodedPayload.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson) as { exp?: number };
    return typeof payload.exp === 'number' && payload.exp > nowSeconds;
  } catch {
    return false;
  }
}

export function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('X-Frame-Options', 'DENY');
  headers.set(
    'Content-Security-Policy',
    "default-src 'self'; connect-src 'self'; img-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:; frame-ancestors 'none'"
  );
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export function withRobotsNoIndex(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('X-Robots-Tag', 'noindex, nofollow');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return withSecurityHeaders(
    new Response(JSON.stringify(body), {
      ...init,
      headers: { 'content-type': 'application/json', ...(init.headers ?? {}) }
    })
  );
}

export async function proxyApiRequest(request: Request, env: PagesEnv): Promise<Response> {
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
