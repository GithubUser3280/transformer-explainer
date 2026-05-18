import { describe, expect, it } from 'vitest';
import { createPasswordHash, verifyPassword } from '../src/auth';
import { createSessionCookie, hasValidSessionCookie } from '../src/cookies';

describe('worker auth helpers', () => {
  it('verifies successful and failed salted password hashes', async () => {
    const hash = await createPasswordHash('correct horse battery staple', 'local-salt');
    await expect(verifyPassword('correct horse battery staple', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong password', hash)).resolves.toBe(false);
  });

  it('signs and verifies session cookies', async () => {
    const cookie = await createSessionCookie('test-cookie-secret', 100);
    const request = new Request('https://example.test/api/trace', { headers: { cookie } });
    await expect(hasValidSessionCookie(request, 'test-cookie-secret', 200)).resolves.toBe(true);
    await expect(hasValidSessionCookie(request, 'wrong-secret', 200)).resolves.toBe(false);
  });
});
