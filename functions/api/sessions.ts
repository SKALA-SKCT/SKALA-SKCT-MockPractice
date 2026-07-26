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
  const listed = await kv.list({ prefix: `sess:${user}:` });
  const items = await Promise.all(listed.keys.map((k: any) => kv.get(k.name, 'json')));
  const sessions = items
    .filter(Boolean)
    .sort((a: any, b: any) => String(b.finishedAt || '').localeCompare(String(a.finishedAt || '')));
  return json(sessions);
}

export async function onRequestPost(context: any): Promise<Response> {
  const kv = context.env?.SKCT_KV;
  const user: string | undefined = context.data?.user;
  if (!kv) return json({ error: 'KV(SKCT_KV) 바인딩이 없습니다.' }, 500);
  if (!user) return json({ error: '로그인이 필요합니다.' }, 401);
  const s = await context.request.json();
  if (!s?.id) return json({ error: '잘못된 세션' }, 400);
  await kv.put(`sess:${user}:${s.id}`, JSON.stringify(s));
  return json({ ok: true });
}
