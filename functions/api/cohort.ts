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
  const listed = await kv.list({ prefix: `cohort:${setId}:` });
  const entries = await Promise.all(listed.keys.map((k: any) => kv.get(k.name, 'json')));
  const scores = entries
    .filter(Boolean)
    .map((e: any) => e.scorePct)
    .filter((s: unknown) => typeof s === 'number');
  return json({ scores, count: scores.length });
}
