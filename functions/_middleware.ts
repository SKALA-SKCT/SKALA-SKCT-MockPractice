// 인증 게이트. 로그인은 마더(관문)에서만 하고, 여기선 공유 세션 JWT를 검증만 한다.
// 연습앱 데이터는 handle(=연결된 skala 닉네임 또는 통합 sub) 기준으로 서빙되므로
// context.data.user 에 handle 문자열을 넣어 downstream 함수가 그대로 쓰게 한다.
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
    let isAdmin = false;
    if (env.SESSION_SECRET) {
      const claims = await verifySession(
        readSharedSessionToken(request.headers.get('Cookie')),
        env.SESSION_SECRET,
      );
      if (claims) {
        // 연결된 skala 닉네임이 있으면 그 handle(기존 데이터), 없으면 통합 sub를 handle로.
        user = claims.skalaHandle || claims.sub;
        isAdmin = !!claims.admin || (!!env.ADMIN_NICK && user === env.ADMIN_NICK);
      }
    }
    context.data.user = user;
    context.data.isAdmin = isAdmin;

    // 인증 엔드포인트(me/logout)와 공유 결과 조회(GET /api/shared/*)는 미인증 접근 허용, 그 외 /api/* 는 게이트
    const isPublicSharedRead =
      url.pathname.startsWith('/api/shared/') && request.method === 'GET';
    if (!url.pathname.startsWith('/api/auth/') && !isPublicSharedRead && !user) return json401();
  }

  return next();
}
