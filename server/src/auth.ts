import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 32 };

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return `scrypt$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [kind, saltB64, keyB64] = stored.split('$');
  if (kind !== 'scrypt' || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, 'base64url');
  const key = scryptSync(password, Buffer.from(saltB64, 'base64url'), expected.length, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** 서명된 접근 토큰: base64url(JSON{uid,exp}).서명 */
export function signAccess(secret: string, userId: number, ttlSec: number, now: number): string {
  const body = Buffer.from(JSON.stringify({ uid: userId, exp: Math.floor(now / 1000) + ttlSec })).toString('base64url');
  const sig = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyAccess(secret: string, token: string, now: number): number | null {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = createHmac('sha256', secret).update(body).digest();
  const given = Buffer.from(sig, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const { uid, exp } = JSON.parse(Buffer.from(body, 'base64url').toString()) as { uid: number; exp: number };
    if (typeof uid !== 'number' || typeof exp !== 'number' || exp * 1000 <= now) return null;
    return uid;
  } catch {
    return null;
  }
}

export function newRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

export function sha256(s: string): string {
  return createHash('sha256').update(s).digest('base64url');
}

const NAME_RE = /^[a-zA-Z0-9_가-힣]{2,16}$/;

export function validateCredentials(username: unknown, password: unknown): string | null {
  if (typeof username !== 'string' || !NAME_RE.test(username)) return '아이디는 2~16자의 한글·영문·숫자·밑줄만 쓸 수 있어요.';
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) return '비밀번호는 8~128자로 정해 주세요.';
  return null;
}
