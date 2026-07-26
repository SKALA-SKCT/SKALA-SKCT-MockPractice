import type { ProblemSet, Session } from '../types';
import type { Store } from './index';

// Cloudflare Pages Functions(+KV) 백엔드. 배포 환경에서 사용 → 기기 간 동기화.
async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  if (!r.ok) {
    let msg = `요청 실패 (${r.status})`;
    try {
      const e = await r.json();
      if (e?.error) msg = e.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return (await r.json()) as T;
}

const JSON_HEADERS = { 'content-type': 'application/json' };

export const remoteStore: Store = {
  listProblemSets: () => req<ProblemSet[]>('/api/problemsets'),
  getProblemSet: (id) => req<ProblemSet | null>(`/api/problemsets/${encodeURIComponent(id)}`),
  saveProblemSet: async (set) => {
    await req('/api/problemsets', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(set) });
  },
  deleteProblemSet: async (id) => {
    await req(`/api/problemsets/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
  listSessions: () => req<Session[]>('/api/sessions'),
  getSession: (id) => req<Session | null>(`/api/sessions/${encodeURIComponent(id)}`),
  saveSession: async (s) => {
    await req('/api/sessions', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(s) });
  },
  deleteSession: async (id) => {
    await req(`/api/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
};
