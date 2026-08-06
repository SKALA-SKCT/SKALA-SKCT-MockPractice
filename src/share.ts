// 결과 공유: 링크만 있으면 누구나 열 수 있는 비공개-토큰 공유.
// 프로덕션은 Pages Functions(+KV), 개발 서버는 백엔드가 없어 localStorage로 대체한다.
import type { Session } from './types';

export interface SharedResult {
  session: Session;
  nickname: string;
}

const DEV_KEY = 'skct.shares';

function devRead(): Record<string, SharedResult> {
  try {
    const raw = localStorage.getItem(DEV_KEY);
    return raw ? (JSON.parse(raw) as Record<string, SharedResult>) : {};
  } catch {
    return {};
  }
}

/** 세션을 공유하고 shareId를 돌려준다. 프로덕션은 세션 ID만 보내고 서버가 신원을 결정한다. */
export async function createShare(session: Session, nickname: string): Promise<string> {
  if (import.meta.env.DEV) {
    const shareId = (crypto.randomUUID?.() ?? String(Date.now())).replace(/-/g, '');
    const all = devRead();
    all[shareId] = { session, nickname };
    localStorage.setItem(DEV_KEY, JSON.stringify(all));
    return shareId;
  }
  const r = await fetch('/api/shared', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionId: session.id }),
  });
  if (!r.ok) {
    let msg = `공유 링크 생성 실패 (${r.status})`;
    try {
      const e = await r.json();
      if (e?.error) msg = e.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const data = (await r.json()) as { shareId: string };
  return data.shareId;
}

/** 공유된 결과를 조회한다. 없으면 null. */
export async function fetchShared(shareId: string): Promise<SharedResult | null> {
  if (import.meta.env.DEV) {
    return devRead()[shareId] ?? null;
  }
  const r = await fetch(`/api/shared/${encodeURIComponent(shareId)}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`공유 결과 조회 실패 (${r.status})`);
  return (await r.json()) as SharedResult;
}

export function shareUrlFor(shareId: string): string {
  return `${window.location.origin}/shared/${shareId}`;
}
