// 현재 로그인 유저. 미들웨어가 context.data.user(handle) / nick / isAdmin 을 세팅한다.
// nickname 은 데이터 키로 쓰는 handle, displayName 은 화면에 보여줄 이름이다.
export async function onRequestGet(context: any): Promise<Response> {
  const user: string | undefined = context.data?.user;
  const nick: string | undefined = context.data?.nick;
  if (!user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }
  const body = { nickname: user, displayName: nick || user, isAdmin: !!context.data?.isAdmin };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
