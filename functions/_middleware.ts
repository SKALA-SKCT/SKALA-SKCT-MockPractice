// 인증 게이트. 로그인은 마더(관문)에서만 하고, 여기선 공유 세션 JWT를 검증만 한다.
// 연습앱 데이터는 handle(=연결된 skala 닉네임 또는 통합 sub) 기준으로 서빙되므로
// context.data.user 에 handle 문자열을 넣어 downstream 함수가 그대로 쓰게 한다.
// 화면에 보여줄 이름은 handle과 다를 수 있어(kakao:<id> 등) context.data.nick 으로 따로 넘긴다.
import { readSharedSessionToken, verifySession } from '../shared/auth';

function json401(): Response {
  return new Response(JSON.stringify({ error: '로그인이 필요합니다.' }), {
    status: 401,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export async function onRequest(context: any): Promise<Response> {
  const { request, env, next } = context;
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/')) {
    let user: string | undefined;
    let nick: string | undefined;
    let isAdmin = false;
    if (env.SESSION_SECRET) {
      const claims = await verifySession(
        readSharedSessionToken(request.headers.get('Cookie')),
        env.SESSION_SECRET,
      );
      if (claims) {
        // 연결된 skala 닉네임이 있으면 그 handle(기존 데이터), 없으면 통합 sub를 handle로.
        user = claims.skalaHandle || claims.sub;
        nick = claims.nick;
        isAdmin = !!claims.admin || (!!env.ADMIN_NICK && user === env.ADMIN_NICK);
      }
    }
    context.data.user = user;
    context.data.nick = nick;
    context.data.isAdmin = isAdmin;

    // 인증 엔드포인트(me/logout)와 공유 결과 조회는 미인증 접근 허용, 그 외 /api/* 는 게이트
    const isSharedResultRead =
      request.method === 'GET' && /^\/api\/share\/[0-9a-f]+$/.test(url.pathname);
    if (!url.pathname.startsWith('/api/auth/') && !isSharedResultRead && !user) return json401();
  }

  return next();
}
