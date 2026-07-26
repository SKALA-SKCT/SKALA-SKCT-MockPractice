import type { ProblemSet, Session } from '../types';
import { localStore } from './local';
import { remoteStore } from './remote';

/**
 * 저장소 추상화.
 * - 개발(`npm run dev`): localStorage — 백엔드 없이 즉시 동작.
 * - 배포(프로덕션 빌드): Cloudflare Pages Functions + KV — 기기 간 동기화.
 */
export interface Store {
  listProblemSets(): Promise<ProblemSet[]>;
  getProblemSet(id: string): Promise<ProblemSet | null>;
  saveProblemSet(set: ProblemSet): Promise<void>;
  deleteProblemSet(id: string): Promise<void>;
  listSessions(): Promise<Session[]>;
  getSession(id: string): Promise<Session | null>;
  saveSession(session: Session): Promise<void>;
  deleteSession(id: string): Promise<void>;
}

export const store: Store = import.meta.env.PROD ? remoteStore : localStore;
