// Cloudflare Pages Function: 정답표 이미지 → Gemini 비전 OCR → 구조화 JSON.
// 관리자만 사용. API 키는 CF 시크릿(GEMINI_API_KEY)에서 읽는다(브라우저 노출 없음).
// 핵심 로직은 shared/ocr.ts 공유(개발 서버 미들웨어와 동일 동작).
import { extractAnswerKey, normalizeImages } from '../../shared/ocr';

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export async function onRequestPost(context: any): Promise<Response> {
  try {
    const body = await context.request.json();
    const images = normalizeImages(body);
    if (images.length === 0) return json({ error: '이미지가 없습니다.' }, 400);
    const apiKey: string | undefined = context.env?.GEMINI_API_KEY;
    if (!apiKey) return json({ error: 'GEMINI_API_KEY 시크릿이 설정되지 않았습니다.' }, 500);

    const result = await extractAnswerKey({
      images,
      section: body.section,
      apiKey,
      model: context.env?.GEMINI_MODEL,
    });
    if (!result.ok) return json({ error: result.error }, result.status);
    return json({ items: result.items });
  } catch (e: any) {
    return json({ error: e?.message ?? 'OCR 처리 중 오류' }, 500);
  }
}
