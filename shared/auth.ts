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

/* ── 공유 세션 JWT (마더가 HS256로 서명, 여기선 검증만) ───────────
   통합 로그인은 마더(관문)에서만. skala는 `skct_session` 쿠키의 JWT를
   서명 검증만 해서 사용자를 식별한다(오프라인, 마더 호출 불필요). */
export const SHARED_SESSION_COOKIE = 'skct_session';

export interface SharedSessionClaims {
  sub: string; // kakao:<id> | skct:<userId> | skala:<nick>
  nick?: string;
  skctUserId?: number;
  skalaHandle?: string;
  admin?: boolean;
  exp?: number;
}

const _enc = new TextEncoder();
const _dec = new TextDecoder();
const _bs = (b: Uint8Array): BufferSource => b as unknown as BufferSource;

function b64urlToBytes(s: string): Uint8Array {
  let t = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = t.length % 4 ? 4 - (t.length % 4) : 0;
  t += '='.repeat(pad);
  const bin = atob(t);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const b64urlToStr = (s: string) => _dec.decode(b64urlToBytes(s));

export async function verifySession(
  token: string | null,
  secret: string,
): Promise<SharedSessionClaims | null> {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  try {
    if (JSON.parse(b64urlToStr(h))?.alg !== 'HS256') return null;
  } catch {
    return null;
  }
  const key = await crypto.subtle.importKey(
    'raw',
    _bs(_enc.encode(secret)),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  let ok = false;
  try {
    ok = await crypto.subtle.verify('HMAC', key, _bs(b64urlToBytes(s)), _bs(_enc.encode(h + '.' + p)));
  } catch {
    return null;
  }
  if (!ok) return null;
  let payload: SharedSessionClaims;
  try {
    payload = JSON.parse(b64urlToStr(p));
  } catch {
    return null;
  }
  if (typeof payload.exp === 'number' && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export function readSharedSessionToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const i = part.indexOf('=');
    if (i !== -1 && part.slice(0, i).trim() === SHARED_SESSION_COOKIE) return part.slice(i + 1).trim();
  }
  return null;
}

export function clearSharedCookie(opts: { domain?: string; secure?: boolean } = {}): string {
  const domain = opts.domain ? ` Domain=${opts.domain};` : '';
  const secure = opts.secure ? ' Secure;' : '';
  return `${SHARED_SESSION_COOKIE}=; Path=/;${domain} HttpOnly;${secure} SameSite=Lax; Max-Age=0`;
}
