// KV: 공유된 결과 조회. 공개 엔드포인트(미들웨어가 GET만 미인증 허용).
// share:<id> = { session, nickname, createdAt } → { session, nickname } 반환.
function json(o: unknown, status = 200): Response {
  return new Response(JSON.stringify(o), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export async function onRequestGet(context: any): Promise<Response> {
  const kv = context.env?.SKCT_KV;
  if (!kv) return json({ error: 'KV(SKCT_KV) 바인딩이 없습니다.' }, 500);
  const rec = await kv.get(`share:${context.params.id}`, 'json');
  if (!rec) return json({ error: '공유된 결과를 찾을 수 없습니다.' }, 404);
  return json({ session: rec.session, nickname: rec.nickname });
}
