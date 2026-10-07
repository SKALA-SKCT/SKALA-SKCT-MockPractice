import { isHiddenProblemSet } from '../../../src/linkareer-catalog.ts';

// KV: 단일 세션 조회/삭제. 로그인 유저 소유만. sess:<user>:<id>
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
  const s = await kv.get(`sess:${user}:${context.params.id}`, 'json');
  return json(isHiddenProblemSet(s?.problemSetId) ? null : s ?? null);
}

export async function onRequestDelete(context: any): Promise<Response> {
  const kv = context.env?.SKCT_KV;
  const user: string | undefined = context.data?.user;
  if (!kv) return json({ error: 'KV(SKCT_KV) 바인딩이 없습니다.' }, 500);
  if (!user) return json({ error: '로그인이 필요합니다.' }, 401);
  const s = await kv.get(`sess:${user}:${context.params.id}`, 'json');
  if (isHiddenProblemSet(s?.problemSetId)) return json({ error: '결과를 찾을 수 없습니다.' }, 404);
  await kv.delete(`sess:${user}:${context.params.id}`);
  return json({ ok: true });
}
