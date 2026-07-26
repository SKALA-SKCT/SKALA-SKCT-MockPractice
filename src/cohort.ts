// 코호트(익명 벤치마킹): 같은 문제셋 내 등수/백분위.
// 신원은 로그인 계정(닉네임). 프로덕션에선 서버가 쿠키로 신원을 결정한다.

export interface CohortSubmit {
  handle: string; // 로그인 닉네임(개발용). 프로덕션 서버는 이 값을 무시하고 세션 유저를 사용.
  problemSetId: string;
  problemSetName: string;
  score: number; // 정답 수
  total: number; // 전체 문항
  scorePct: number; // 정답/전체 (0-100, 소수1)
  finishedAt: string;
}

export async function submitCohort(entry: CohortSubmit): Promise<void> {
  await fetch('/api/cohort', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(entry),
  });
}

/** 같은 문제셋의 (익명) 점수 분포. 핸들은 반환하지 않는다. */
export async function fetchScores(problemSetId: string): Promise<number[]> {
  const r = await fetch('/api/cohort?set=' + encodeURIComponent(problemSetId));
  const raw = await r.text();
  if (!r.ok) {
    let msg = `등수 조회 실패 (${r.status})`;
    try {
      const e = raw ? JSON.parse(raw) : {};
      if (e?.error) msg = e.error;
    } catch {
      /* non-JSON */
    }
    throw new Error(msg);
  }
  const data = raw ? JSON.parse(raw) : {};
  return Array.isArray(data.scores) ? data.scores.filter((s: unknown) => typeof s === 'number') : [];
}

export interface RankResult {
  n: number;
  rank: number; // 1 = 최고
  topPercent: number; // 상위 %
  percentile: number; // 백분위(높을수록 좋음)
}

export function computeRank(scores: number[], myScore: number): RankResult {
  const n = scores.length;
  if (n === 0) return { n: 0, rank: 1, topPercent: 100, percentile: 0 };
  const greater = scores.filter((s) => s > myScore).length;
  const leq = scores.filter((s) => s <= myScore).length;
  const rank = greater + 1;
  return {
    n,
    rank,
    topPercent: Math.max(1, Math.round((rank / n) * 100)),
    percentile: Math.round((leq / n) * 100),
  };
}

export function scorePctOf(correct: number, total: number): number {
  return total > 0 ? Math.round((correct / total) * 1000) / 10 : 0;
}
