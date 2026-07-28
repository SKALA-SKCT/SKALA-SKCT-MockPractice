// 로그아웃: 공유 세션 쿠키(skct_session, Domain 스코프)를 클리어 → 세 서브도메인 모두 무효화.
import { clearSharedCookie } from '../../../shared/auth';

export async function onRequestPost(context: any): Promise<Response> {
  const { request, env } = context;
  const secure = new URL(request.url).protocol === 'https:';
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'set-cookie': clearSharedCookie({ domain: env.SESSION_COOKIE_DOMAIN || undefined, secure }),
    },
  });
}
