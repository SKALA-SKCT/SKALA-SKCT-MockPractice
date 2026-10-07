import { mergeSession, readKvEntries, readOriginalSets, visibleSets } from '../../src/session-history.ts';
import type { Session } from '../../src/types.ts';
import { regrade } from './share.ts';

import { isHiddenProblemSet } from '../../src/linkareer-catalog.ts';

// KV: 코호트 벤치마킹. 같은 문제셋의 핸들별 최고 점수만 유지.
// 키: cohort:<problemSetId>:<encoded handle>. GET은 익명 점수 배열만 반환(핸들 미노출).
function json(o: unknown, status = 200): Response {
  return new Response(JSON.stringify(o), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export async function onRequestPost(context: any): Promise<Response> {
  const kv = context.env?.SKCT_KV;
  const user: string | undefined = context.data?.user; // 신원은 서버가 결정(사칭 방지)
  if (!kv) return json({ error: 'KV(SKCT_KV) 바인딩이 없습니다.' }, 500);
  if (!user) return json({ error: '로그인이 필요합니다.' }, 401);
  const e = await context.request.json();
  if (!e?.problemSetId || typeof e?.scorePct !== 'number') {
    return json({ error: '잘못된 제출' }, 400);
  }
  if (isHiddenProblemSet(e.problemSetId)) return json({ error: '문제셋을 찾을 수 없습니다.' }, 404);
  const key = `cohort:${e.problemSetId}:${encodeURIComponent(user)}`;
  const prev = await kv.get(key, 'json');
  // 같은 유저는 최고 점수만 유지
  if (!prev || e.scorePct >= (prev.scorePct ?? -1)) {
    await kv.put(key, JSON.stringify({ ...e, handle: user }));
  }
  return json({ ok: true });
}

export async function onRequestGet(context: any): Promise<Response> {
  const kv = context.env?.SKCT_KV;
  if (!kv) return json({ error: 'KV(SKCT_KV) 바인딩이 없습니다.' }, 500);
  const setId = new URL(context.request.url).searchParams.get('set');
  if (!setId) return json({ error: 'set 파라미터가 필요합니다.' }, 400);
  if (isHiddenProblemSet(setId)) return json({ error: '문제셋을 찾을 수 없습니다.' }, 404);
  if (/^mocktest-r1[3-5]-s[1-5]$/.test(setId)) {
    // ponytail: 전체 응시를 읽습니다. 기록이 1만 건을 넘으면 문제셋별 색인을 추가합니다.
    const [originals, stored] = await Promise.all([readOriginalSets(kv), readKvEntries<Session>(kv, 'sess:')]);
    const target = visibleSets(originals).get(setId);
    if (!target) return json({ error: '문제셋을 찾을 수 없습니다.' }, 404);
    const best = new Map<string, number>();
    let mergedCount = 0;
    let unmatchedCount = 0;
    for (const [key, raw] of stored) {
      const session = mergeSession(raw, originals);
      if (isHiddenProblemSet(raw.problemSetId)) {
        if (session) mergedCount++;
        else unmatchedCount++;
      }
      if (!session || session.problemSetId !== setId) continue;
      const graded: Session = regrade(session, target);
      const score = graded.results.length ? Math.round(graded.results.filter((result) => result.correct === true).length / graded.results.length * 1000) / 10 : 0;
      const owner = key.slice(0, -(raw.id.length + 1));
      best.set(owner, Math.max(best.get(owner) ?? 0, score));
    }
    const scores = [...best.values()];
    const audit = context.data?.isAdmin && new URL(context.request.url).searchParams.get('audit') === '1'
      ? { storedCount: stored.size, mergedCount, unmatchedCount } : undefined;
    return json({ scores, count: scores.length, ...(audit ? { audit } : {}) });
  }
  const listed = await kv.list({ prefix: `cohort:${setId}:` });
  const entries = await Promise.all(listed.keys.map((k: any) => kv.get(k.name, 'json')));
  const scores = entries
    .filter(Boolean)
    .map((e: any) => e.scorePct)
    .filter((s: unknown) => typeof s === 'number');
  return json({ scores, count: scores.length });
}
