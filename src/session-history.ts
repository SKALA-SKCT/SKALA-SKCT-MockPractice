import type { ProblemSet, Session } from './types.ts';
import { correctProblemSet, isHiddenProblemSet, sourceSetId } from './linkareer-catalog.ts';

export function compareSessions(a: Session, b: Session): number {
  return Date.parse(a.startedAt) - Date.parse(b.startedAt) ||
    Date.parse(a.finishedAt) - Date.parse(b.finishedAt) || a.id.localeCompare(b.id);
}

function sameAnswers(a: ProblemSet['items'], b: ProblemSet['items']): boolean {
  if (a.length !== 20 || b.length !== 20) return false;
  const answers = new Map(a.map((item) => [`${item.section}:${item.number}`, item.answer]));
  return answers.size === 20 && new Set(b.map((item) => `${item.section}:${item.number}`)).size === 20 &&
    b.every((item) => answers.get(`${item.section}:${item.number}`) === item.answer);
}

export function mergeSession(session: Session, originals: Map<string, ProblemSet>): Session | null {
  if (!isHiddenProblemSet(session.problemSetId)) return session;
  const match = /^mocktest-r(1[0-2])-s([1-5])$/.exec(session.problemSetId)!;
  // 같은 원본 문항 링크를 가진 회차만 후보로 사용합니다.
  const canonicalId = `mocktest-r${Number(match[1]) + 3}-s${match[2]}`;
  const source = originals.get(session.problemSetId);
  const target = originals.get(canonicalId);
  if (!source || !target || !sameAnswers(source.items, target.items) ||
      !sameAnswers(session.results, target.items)) return null;
  return { ...session, problemSetId: target.id, problemSetName: target.name, sourceProblemSetId: session.problemSetId };
}

export function visibleSets(originals: Map<string, ProblemSet>): Map<string, ProblemSet> {
  return new Map([...originals.values()].filter((set) => !isHiddenProblemSet(set.id)).map((set) => {
    const source = sourceSetId(set.id);
    return [set.id, source ? correctProblemSet(set, originals.get(source) ?? null) : set];
  }));
}

export async function readKvEntries<T>(kv: any, prefix: string): Promise<Map<string, T>> {
  const entries = new Map<string, T>();
  let cursor: string | undefined;
  do {
    const page = await kv.list({ prefix, cursor });
    for (let i = 0; i < page.keys.length; i += 100) {
      const values: Map<string, T | null> = await kv.get(page.keys.slice(i, i + 100).map((key: { name: string }) => key.name), 'json');
      for (const [key, value] of values) if (value) entries.set(key, value);
    }
    cursor = page.list_complete === false ? page.cursor : undefined;
  } while (cursor);
  return entries;
}

export async function readOriginalSets(kv: any): Promise<Map<string, ProblemSet>> {
  return new Map([...(await readKvEntries<ProblemSet>(kv, 'ps:')).values()].map((set) => [set.id, set]));
}
