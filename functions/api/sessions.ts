import { compareSessions, mergeSession, readKvEntries, readOriginalSets } from '../../src/session-history.ts';
import type { Session } from '../../src/types.ts';
import { isHiddenProblemSet } from '../../src/linkareer-catalog.ts';

// KV: 응시 결과(세션). 로그인 유저별로 분리 → sess:<user>:<id>.
function json(o: unknown, status = 200): Response {
  return new Response(JSON.stringify(o), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export async function onRequestGet(context: any): Promise<Response> {
  const kv = context.env?.SKCT_KV;
  const user: string | undefined = context.data?.user;
  if (!kv) return json({ error: 'KV(SKCT_KV) 바인딩이 없습니다.' }, 500);
  if (!user) return json({ error: '로그인이 필요합니다.' }, 401);
  const [originals, stored] = await Promise.all([readOriginalSets(kv), readKvEntries<Session>(kv, `sess:${user}:`)]);
  const sessions = [...stored.values()].map((session) => mergeSession(session, originals))
    .filter((session): session is Session => session !== null).sort((a, b) => compareSessions(b, a));
  return json(sessions);
}

export async function onRequestPost(context: any): Promise<Response> {
  const kv = context.env?.SKCT_KV;
  const user: string | undefined = context.data?.user;
  if (!kv) return json({ error: 'KV(SKCT_KV) 바인딩이 없습니다.' }, 500);
  if (!user) return json({ error: '로그인이 필요합니다.' }, 401);
  const s = await context.request.json();
  if (!s?.id) return json({ error: '잘못된 세션' }, 400);
  const existing = await kv.get(`sess:${user}:${s.id}`, 'json');
  if (isHiddenProblemSet(existing?.problemSetId)) {
    const merged = mergeSession(existing, await readOriginalSets(kv));
    if (!merged || merged.problemSetId !== s.problemSetId) return json({ error: '결과를 찾을 수 없습니다.' }, 404);
    await kv.put(`sess:${user}:${s.id}`, JSON.stringify({ ...existing, review: s.review }));
    return json({ ok: true });
  }
  if (isHiddenProblemSet(s.problemSetId)) {
    return json({ error: '결과를 찾을 수 없습니다.' }, 404);
  }
  await kv.put(`sess:${user}:${s.id}`, JSON.stringify(s));
  return json({ ok: true });
}
