// 결과 공유: 세션 스냅샷을 서버에 저장하고, 공개 토큰 링크로 누구나 조회한다.
import type { Session } from './types';

function isSession(value: unknown): value is Session {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.id === 'string' &&
    typeof s.problemSetName === 'string' &&
    typeof s.finishedAt === 'string' &&
    typeof s.config === 'object' &&
    Array.isArray(s.results)
  );
}

/** 공유 토큰을 만들고(같은 세션이면 재사용) 공개 URL을 돌려준다. */
export async function createShareLink(sessionId: string): Promise<string> {
  const r = await fetch('/api/share', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
  let data: unknown = null;
  try {
    data = await r.json();
  } catch {
    /* JSON 아님 → 아래에서 실패 처리 */
  }
  const token =
    typeof data === 'object' && data !== null && 'token' in data ? data.token : undefined;
  if (!r.ok || typeof token !== 'string') {
    const errorMsg =
      typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
        ? data.error
        : `공유 링크 생성 실패 (${r.status})`;
    throw new Error(errorMsg);
  }
  return `${window.location.origin}/share/${token}`;
}

/** 공유된 세션 스냅샷 조회. 없거나 잘못된 링크면 null. */
export async function fetchSharedSession(token: string): Promise<Session | null> {
  const r = await fetch(`/api/share/${encodeURIComponent(token)}`);
  if (r.status === 400 || r.status === 404) return null;
  if (!r.ok) throw new Error(`공유 결과 조회 실패 (${r.status})`);
  let data: unknown = null;
  try {
    data = await r.json();
  } catch {
    return null;
  }
  const session =
    typeof data === 'object' && data !== null && 'session' in data ? data.session : null;
  return isSession(session) ? session : null;
}
