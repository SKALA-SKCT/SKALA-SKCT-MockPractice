// KV: 결과 공유 생성. 내 세션 스냅샷을 공개 토큰으로 저장한다.
// share:<token> → { session, createdAt }, shareof:<user>:<sessionId> → token (재공유 시 토큰 재사용)
function json(o: unknown, status = 200): Response {
  return new Response(JSON.stringify(o), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

// 저장된 세션의 results[]는 응시 시점 채점 스냅샷이다. 정답표가 나중에 수정될 수 있으므로
// 공유 시점의 현재 정답표로 재채점해 저장한다(src/recompute.ts와 동일 규칙).
function regrade(session: any, set: any): any {
  if (!Array.isArray(set?.items) || !Array.isArray(session?.results)) return session;
  const idx = new Map<string, any>();
  for (const it of set.items) idx.set(`${it.section}:${it.number}`, it);
  const results = session.results.map((r: any) => {
    const it = idx.get(`${r.section}:${r.number}`);
    if (!it) return r; // 정답표에서 사라진 문항 → 기존 스냅샷 유지
    const correct =
      r.status === 'answered' && r.userAnswer != null ? r.userAnswer === it.answer : null;
    return { ...r, answer: it.answer, correctRate: it.correctRate, correct };
  });
  return { ...session, results };
}

export async function onRequestPost(context: any): Promise<Response> {
  const kv = context.env?.SKCT_KV;
  const user: string | undefined = context.data?.user;
  if (!kv) return json({ error: 'KV(SKCT_KV) 바인딩이 없습니다.' }, 500);
  if (!user) return json({ error: '로그인이 필요합니다.' }, 401);
  const body = await context.request.json().catch(() => null);
  const sessionId = body?.sessionId;
  if (typeof sessionId !== 'string' || !sessionId) return json({ error: '잘못된 요청' }, 400);

  const stored = await kv.get(`sess:${user}:${sessionId}`, 'json');
  if (!stored) return json({ error: '결과를 찾을 수 없습니다.' }, 404);
  const set = await kv.get(`ps:${stored.problemSetId}`, 'json');
  const session = regrade(stored, set);

  const mapKey = `shareof:${user}:${sessionId}`;
  let token: string | null = await kv.get(mapKey);
  if (!token) {
    token = crypto.randomUUID().replace(/-/g, '');
    await kv.put(mapKey, token);
  }
  // 다시 공유하면 스냅샷을 최신 세션으로 갱신한다(토큰/URL은 유지).
  await kv.put(`share:${token}`, JSON.stringify({ session, createdAt: new Date().toISOString() }));
  return json({ token });
}
