// KV: 단일 문제셋 조회/삭제. 삭제는 소유자만. ps:<id>
function json(o: unknown, status = 200): Response {
  return new Response(JSON.stringify(o), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export async function onRequestGet(context: any): Promise<Response> {
  const kv = context.env?.SKCT_KV;
  if (!kv) return json({ error: 'KV(SKCT_KV) 바인딩이 없습니다.' }, 500);
  const ps = await kv.get('ps:' + context.params.id, 'json');
  return json(ps ?? null);
}

export async function onRequestDelete(context: any): Promise<Response> {
  const kv = context.env?.SKCT_KV;
  const user: string | undefined = context.data?.user;
  if (!kv) return json({ error: 'KV(SKCT_KV) 바인딩이 없습니다.' }, 500);
  if (!user) return json({ error: '로그인이 필요합니다.' }, 401);
  const existing = await kv.get('ps:' + context.params.id, 'json');
  if (existing?.owner && existing.owner !== user) {
    return json({ error: '다른 사람이 만든 문제셋은 삭제할 수 없어요.' }, 403);
  }
  await kv.delete('ps:' + context.params.id);
  return json({ ok: true });
}
