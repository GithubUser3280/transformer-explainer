import { timingSafeEqual } from './auth';

const textEncoder = new TextEncoder();
const SESSION_COOKIE_NAME = 'transformer_3d_session';

function base64UrlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const byteArray = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const binary = String.fromCharCode(...byteArray);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmacSha256(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', textEncoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return base64UrlEncode(await crypto.subtle.sign('HMAC', key, textEncoder.encode(message)));
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
