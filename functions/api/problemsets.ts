import { isHiddenProblemSet, correctProblemSet, sourceSetId } from '../../src/linkareer-catalog.ts';
import type { ProblemSet } from '../../src/types.ts';

// KV 문제셋 목록과 저장입니다. 소유자만 편집할 수 있습니다.
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
  const originals = new Map<string, ProblemSet>(items.filter(Boolean).map((set: ProblemSet) => [set.id, set]));
  const sets = [...originals.values()].filter((set) => !isHiddenProblemSet(set.id)).map((set) => {
    const sourceId = sourceSetId(set.id);
    return sourceId ? correctProblemSet(set, originals.get(sourceId) ?? null) : set;
  }).sort((a, b) => {
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

  if (isHiddenProblemSet(ps.id)) return json({ error: '문제셋을 찾을 수 없습니다.' }, 404);
  const existing = await kv.get('ps:' + ps.id, 'json');
  if (existing?.owner && existing.owner !== user) {
    return json({ error: '다른 사람이 만든 문제셋은 편집할 수 없어요.' }, 403);
  }
  // 공식 문제셋은 관리자만 만들 수 있고, 관리자는 사설 문제셋도 만들 수 있다.
  const isAdmin = !!context.env?.ADMIN_NICK && user === context.env.ADMIN_NICK;
  ps.owner = user;
  ps.official = isAdmin && ps.official === true;
  await kv.put('ps:' + ps.id, JSON.stringify(ps));
  return json({ ok: true });
}
