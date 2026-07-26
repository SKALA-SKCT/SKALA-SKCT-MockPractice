// 인증 게이트. /api/* 는 로그인 필요(/api/auth/* 제외). 세션 쿠키에서 유저를 도출해
// context.data.user 로 전달한다. 정적 자산/SPA는 통과(앱이 로그인 화면을 표시).
import { readSessionToken } from '../shared/auth';

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
    // 세션 쿠키 → 토큰 → 닉네임
    let user: string | undefined;
    const token = readSessionToken(request.headers.get('Cookie'));
    if (token && env.SKCT_KV) {
      user = (await env.SKCT_KV.get('tok:' + token)) || undefined;
    }
    context.data.user = user;

    // 인증 엔드포인트는 미인증 접근 허용, 그 외 /api/* 는 게이트
    if (!url.pathname.startsWith('/api/auth/') && !user) return json401();
  }

  return next();
}
