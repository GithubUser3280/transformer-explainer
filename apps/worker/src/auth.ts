export interface WorkerEnv {
  ACCESS_PASSWORD_HASH: string;
  COOKIE_SIGNING_SECRET: string;
  BACKEND_BASE_URL: string;
  BACKEND_SHARED_SECRET: string;
}

const textEncoder = new TextEncoder();

function toHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function sha256Hex(input: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', textEncoder.encode(input)));
}

export async function createPasswordHash(password: string, salt: string): Promise<string> {
  return `${salt}:${await sha256Hex(`${salt}:${password}`)}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, expectedHash] = storedHash.split(':');
  if (!salt || !expectedHash) return false;
  const candidateHash = await sha256Hex(`${salt}:${password}`);
  return timingSafeEqual(candidateHash, expectedHash);
}

export function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}
