import { normalizeNick, randomToken, sessionCookie, verifyPassword } from '../../../shared/auth';

function json(o: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(o), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extra },
  });
}

export async function onRequestPost(context: any): Promise<Response> {
  const kv = context.env?.SKCT_KV;
  if (!kv) return json({ error: 'KV(SKCT_KV) 바인딩이 없습니다.' }, 500);

  const b = await context.request.json().catch(() => ({}));
  const nickname = String(b?.nickname ?? '').trim();
  const password = String(b?.password ?? '');

  const rec = await kv.get('usr:' + normalizeNick(nickname), 'json');
  if (!rec || !(await verifyPassword(password, rec.pw))) {
    return json({ error: '닉네임 또는 비밀번호가 올바르지 않아요.' }, 401);
  }

  const token = randomToken();
  await kv.put('tok:' + token, rec.nickname, { expirationTtl: 60 * 60 * 24 * 30 });
  const isHttps = new URL(context.request.url).protocol === 'https:';
  const isAdmin = !!context.env?.ADMIN_NICK && rec.nickname === context.env.ADMIN_NICK;
  return json({ ok: true, nickname: rec.nickname, isAdmin }, 200, {
    'set-cookie': sessionCookie(token, isHttps),
  });
}
