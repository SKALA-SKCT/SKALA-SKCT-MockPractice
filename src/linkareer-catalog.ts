import type { ProblemSet } from './types.ts';

export function isHiddenProblemSet(id: unknown): boolean {
  return typeof id === 'string' && /^mocktest-r1[0-2]-s[1-5]$/.test(id);
}

// PDF의 기출 반영 학기와 현재 링커리어 회차명이 달라진 구간입니다.
// 원본 ID: 2490~2492는 2025년 상반기, 2507~2509는 2025년 하반기입니다.
export function sourceSetId(id: string): string | null {
  const match = /^mocktest-r(0[7-9]|1[0-2])-s([1-5])$/.exec(id);
  if (!match) return null;
  return `mocktest-r${String(Number(match[1]) - 3).padStart(2, '0')}-s${match[2]}`;
}

export function correctProblemSet(set: ProblemSet, source: ProblemSet | null): ProblemSet {
  if (!sourceSetId(set.id)) return set;
  if (!source || source.id !== sourceSetId(set.id) || source.items.length !== 20 ||
      source.items.some((item, index) => item.number !== index + 1 ||
        !set.sections.includes(item.section) || !Number.isInteger(item.answer) ||
        item.answer < 1 || item.answer > set.config.choices)) {
    throw new Error('링커리어 원본 정답표를 확인하지 못했습니다.');
  }
  return { ...set, items: source.items };
}

export async function getProblemSet(kv: { get(key: string, type: 'json'): Promise<ProblemSet | null> }, id: string) {
  if (isHiddenProblemSet(id)) return null;
  const set = await kv.get(`ps:${id}`, 'json');
  if (!set) return null;
  const sourceId = sourceSetId(id);
  return sourceId ? correctProblemSet(set, await kv.get(`ps:${sourceId}`, 'json')) : set;
}
