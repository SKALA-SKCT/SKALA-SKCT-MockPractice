// KV: 공유된 결과 공개 조회. 로그인 없이 접근 가능(미들웨어에서 예외 처리). share:<token>
function json(o: unknown, status = 200): Response {
  return new Response(JSON.stringify(o), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export async function onRequestGet(context: any): Promise<Response> {
  const kv = context.env?.SKCT_KV;
  if (!kv) return json({ error: 'KV(SKCT_KV) 바인딩이 없습니다.' }, 500);
  const token = String(context.params?.token ?? '');
  if (!/^[0-9a-f]{32}$/.test(token)) return json({ error: '잘못된 링크입니다.' }, 400);
  const shared = await kv.get(`share:${token}`, 'json');
  if (!shared?.session) return json({ error: '공유된 결과를 찾을 수 없습니다.' }, 404);
  return json({ session: shared.session });
}
