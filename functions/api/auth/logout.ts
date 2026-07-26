import { CLEAR_COOKIE, readSessionToken } from '../../../shared/auth';

export async function onRequestPost(context: any): Promise<Response> {
  const token = readSessionToken(context.request.headers.get('Cookie'));
  if (token && context.env?.SKCT_KV) {
    await context.env.SKCT_KV.delete('tok:' + token);
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'set-cookie': CLEAR_COOKIE },
  });
}
