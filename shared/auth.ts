// 인증 핵심 헬퍼(순수). Cloudflare Pages Functions(엣지)와 노드 테스트가 공유.
// 비밀번호는 PBKDF2-SHA256 해시로만 저장. Web Crypto(crypto.subtle) 사용.

const ITER = 100_000;

function toHex(buf: ArrayBufferLike): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function fromHex(hex: string) {
  const a = new Uint8Array(hex.length / 2);
  for (let i = 0; i < a.length; i++) a[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return a;
}

async function pbkdf2(password: string, salt: BufferSource, iter: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' },
    key,
    256,
  );
  return toHex(bits);
}

export interface PwRecord {
  salt: string;
  hash: string;
  iter: number;
}

export async function hashPassword(password: string): Promise<PwRecord> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, ITER);
  return { salt: toHex(salt.buffer), hash, iter: ITER };
}

export async function verifyPassword(password: string, rec: PwRecord | undefined | null): Promise<boolean> {
  if (!rec?.salt || !rec?.hash || !rec?.iter) return false;
  const hash = await pbkdf2(password, fromHex(rec.salt), rec.iter);
  if (hash.length !== rec.hash.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ rec.hash.charCodeAt(i);
  return diff === 0;
}

export function randomToken(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(24)).buffer);
}

export function normalizeNick(n: string): string {
  return n.trim().toLowerCase();
}

const MAX_AGE = 60 * 60 * 24 * 30; // 30일

export function sessionCookie(token: string, isHttps: boolean): string {
  const secure = isHttps ? ' Secure;' : '';
  return `skct_sess=${token}; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=${MAX_AGE}`;
}

export const CLEAR_COOKIE = 'skct_sess=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0';

export function readSessionToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const i = part.indexOf('=');
    if (i !== -1 && part.slice(0, i).trim() === 'skct_sess') return part.slice(i + 1).trim();
  }
  return null;
}
