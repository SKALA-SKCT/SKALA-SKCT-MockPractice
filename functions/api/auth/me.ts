// 현재 로그인 유저. 미들웨어가 context.data.user 를 세팅한다.
export async function onRequestGet(context: any): Promise<Response> {
  const user: string | undefined = context.data?.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }
  const isAdmin = !!context.env?.ADMIN_NICK && user === context.env.ADMIN_NICK;
  return new Response(JSON.stringify({ nickname: user, isAdmin }), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
