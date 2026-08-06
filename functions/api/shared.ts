// KV: 결과 공유 링크 생성. 소유자만 자기 세션을 공유할 수 있다(신원은 서버가 결정).
// 공유 레코드: share:<shareId> = { session, nickname, createdAt }.
// 같은 세션을 다시 공유하면 기존 링크를 재사용한다: shareof:<user>:<sessionId> = shareId.
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

  const body = await context.request.json().catch(() => null);
  const sessionId: string | undefined = body?.sessionId;
  if (!sessionId) return json({ error: '세션 ID가 필요합니다.' }, 400);

  const session = await kv.get(`sess:${user}:${sessionId}`, 'json');
  if (!session) return json({ error: '결과를 찾을 수 없습니다.' }, 404);

  const ofKey = `shareof:${user}:${sessionId}`;
  const existing = await kv.get(ofKey);
  if (existing) {
    // 링크는 유지하되 최신 결과 스냅샷으로 갱신
    await kv.put(`share:${existing}`, JSON.stringify({ session, nickname: user, createdAt: new Date().toISOString() }));
    return json({ shareId: existing });
  }

  const shareId = crypto.randomUUID().replace(/-/g, '');
  await kv.put(`share:${shareId}`, JSON.stringify({ session, nickname: user, createdAt: new Date().toISOString() }));
  await kv.put(ofKey, shareId);
  return json({ shareId });
}
