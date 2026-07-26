import { hashPassword, normalizeNick, randomToken, sessionCookie } from '../../../shared/auth';

function json(o: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(o), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extra },
  });
}

const NICK_RE = /^[\w가-힣][\w가-힣 .\-]*$/;

export async function onRequestPost(context: any): Promise<Response> {
  const kv = context.env?.SKCT_KV;
  if (!kv) return json({ error: 'KV(SKCT_KV) 바인딩이 없습니다.' }, 500);
  const invite: string | undefined = context.env?.SITE_PASSWORD;
  if (!invite) return json({ error: '서버에 초대코드(SITE_PASSWORD)가 설정되지 않았습니다.' }, 500);

  const b = await context.request.json().catch(() => ({}));
  const nickname = String(b?.nickname ?? '').trim();
  const password = String(b?.password ?? '');

  if (b?.invite !== invite) return json({ error: '초대코드가 올바르지 않습니다.' }, 403);
  if (nickname.length < 2 || nickname.length > 20)
    return json({ error: '닉네임은 2~20자로 정해주세요.' }, 400);
  if (!NICK_RE.test(nickname)) return json({ error: '닉네임에 사용할 수 없는 문자가 있어요.' }, 400);
  if (password.length < 4) return json({ error: '비밀번호는 4자 이상이어야 해요.' }, 400);

  const key = 'usr:' + normalizeNick(nickname);
  if (await kv.get(key)) return json({ error: '이미 사용 중인 닉네임이에요.' }, 409);

  const pw = await hashPassword(password);
  await kv.put(key, JSON.stringify({ nickname, pw, createdAt: new Date().toISOString() }));

  const token = randomToken();
  await kv.put('tok:' + token, nickname, { expirationTtl: 60 * 60 * 24 * 30 });
  const isHttps = new URL(context.request.url).protocol === 'https:';
  const isAdmin = !!context.env?.ADMIN_NICK && nickname === context.env.ADMIN_NICK;
  return json({ ok: true, nickname, isAdmin }, 200, {
    'set-cookie': sessionCookie(token, isHttps),
  });
}
