import type { ProblemSet, Session } from '../types';
import type { Store } from './index';

const PS_KEY = 'skct.problemSets';
const SESS_KEY = 'skct.sessions';

function read<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, list: T[]): void {
  localStorage.setItem(key, JSON.stringify(list));
}

function upsert<T extends { id: string }>(key: string, item: T): void {
  const list = read<T>(key).filter((x) => x.id !== item.id);
  list.push(item);
  write(key, list);
}

export const localStore: Store = {
  async listProblemSets() {
    return read<ProblemSet>(PS_KEY).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async getProblemSet(id) {
    return read<ProblemSet>(PS_KEY).find((s) => s.id === id) ?? null;
  },
  async saveProblemSet(set) {
    upsert(PS_KEY, set);
  },
  async deleteProblemSet(id) {
    write(
      PS_KEY,
      read<ProblemSet>(PS_KEY).filter((s) => s.id !== id),
    );
  },
  async listSessions() {
    return read<Session>(SESS_KEY).sort((a, b) => b.finishedAt.localeCompare(a.finishedAt));
  },
  async getSession(id) {
    return read<Session>(SESS_KEY).find((s) => s.id === id) ?? null;
  },
  async saveSession(session) {
    upsert(SESS_KEY, session);
  },
  async deleteSession(id) {
    write(
      SESS_KEY,
      read<Session>(SESS_KEY).filter((s) => s.id !== id),
    );
  },
};
