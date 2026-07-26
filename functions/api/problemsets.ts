// KV: 문제셋 목록/저장(공용). 소유자·공식 플래그는 서버가 결정. 편집은 소유자만.
function json(o: unknown, status = 200): Response {
  return new Response(JSON.stringify(o), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export async function onRequestGet(context: any): Promise<Response> {
  const kv = context.env?.SKCT_KV;
  if (!kv) return json({ error: 'KV(SKCT_KV) 바인딩이 없습니다.' }, 500);
  const listed = await kv.list({ prefix: 'ps:' });
  const items = await Promise.all(listed.keys.map((k: any) => kv.get(k.name, 'json')));
  // 공식(관리자) 먼저, 그다음 최신순
  const sets = items.filter(Boolean).sort((a: any, b: any) => {
    if (!!a.official !== !!b.official) return a.official ? -1 : 1;
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  });
  return json(sets);
}

export async function onRequestPost(context: any): Promise<Response> {
  const kv = context.env?.SKCT_KV;
  const user: string | undefined = context.data?.user;
  if (!kv) return json({ error: 'KV(SKCT_KV) 바인딩이 없습니다.' }, 500);
  if (!user) return json({ error: '로그인이 필요합니다.' }, 401);
  const ps = await context.request.json();
  if (!ps?.id) return json({ error: '잘못된 문제셋' }, 400);

  const existing = await kv.get('ps:' + ps.id, 'json');
  if (existing?.owner && existing.owner !== user) {
    return json({ error: '다른 사람이 만든 문제셋은 편집할 수 없어요.' }, 403);
  }
  // 신원·공식 여부는 서버가 강제
  ps.owner = user;
  ps.official = !!context.env?.ADMIN_NICK && user === context.env.ADMIN_NICK;
  await kv.put('ps:' + ps.id, JSON.stringify(ps));
  return json({ ok: true });
}
