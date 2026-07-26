// 정답표 OCR 핵심 로직 (AI 제공자: Google Gemini).
// Cloudflare Pages Function(엣지)과 Vite 개발 미들웨어(Node)가 공유. 둘 다 native fetch 사용.
// responseMimeType + responseSchema(structured output)로 응답을 스키마에 강제해 인식 신뢰도를 높인다.

export const SECTIONS = ['언어이해', '자료해석', '창의수리', '언어추리', '수열추리'];

// Gemini responseSchema: OpenAPI 3.0 서브셋. type은 대문자, additionalProperties 미지원.
const SCHEMA = {
  type: 'OBJECT',
  properties: {
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          section: { type: 'STRING', enum: SECTIONS },
          number: { type: 'INTEGER' },
          answer: { type: 'INTEGER' },
          correctRate: { type: 'NUMBER' },
        },
        required: ['section', 'number', 'answer', 'correctRate'],
        propertyOrdering: ['section', 'number', 'answer', 'correctRate'],
      },
    },
  },
  required: ['items'],
};

function buildPrompt(section?: string, count = 1): string {
  const common =
    '각 문항: number(영역 내 문항 번호, 정수), answer(정답 선택지 정수 1~5), correctRate(정답률 0~100; 표에 오답률만 있으면 correctRate = 100 - 오답률; 비율이 없으면 50). 읽을 수 있는 행만 포함하고, 스키마에 맞는 JSON만 반환하세요.';
  const multi =
    count > 1
      ? ` 총 ${count}장의 이미지는 같은 영역 정답표의 여러 페이지입니다. 모든 이미지를 함께 보고 문항을 추출해 하나의 목록으로 합치되, 문항 번호가 중복되면 한 번만 포함하세요.`
      : '';
  if (section && SECTIONS.includes(section)) {
    return `이 이미지는 SKCT "${section}" 영역의 정답표(정답 + 정답률)입니다.${multi} 이 영역의 모든 문항을 추출하세요. 모든 행의 section은 "${section}"으로 설정하세요.\n${common}`;
  }
  return `이 이미지는 SKCT 정답표(정답 + 정답률)입니다.${multi} 표의 모든 문항을 추출하세요. section은 다음 5개 영역 중 하나로 매핑 — 언어이해, 자료해석, 창의수리, 언어추리, 수열추리. 표의 영역 제목/헤더를 보고 매핑하고, 단일 영역만 있고 라벨이 없으면 가장 가까운 영역으로 추정하세요.\n${common}`;
}

export interface OcrImage {
  imageBase64: string;
  mediaType?: string;
}

export interface OcrParams {
  images: OcrImage[]; // 같은 영역의 1~3장(여러 페이지) — 한 번의 호출로 함께 인식
  section?: string;
  apiKey: string;
  model?: string; // GEMINI_MODEL 환경변수로 덮어쓰기 가능
}

// 영역당 최대 이미지 수 (클라이언트·서버 공통 상한).
export const MAX_OCR_IMAGES = 3;

/**
 * 요청 본문에서 이미지 배열을 정규화한다.
 * body.images(배열)를 우선 사용하고, 하위호환으로 단일 body.imageBase64도 허용.
 * imageBase64 문자열이 있는 항목만 남겨 최대 MAX_OCR_IMAGES장으로 자른다.
 */
export function normalizeImages(body: any): OcrImage[] {
  const arr: any[] = Array.isArray(body?.images)
    ? body.images
    : body?.imageBase64
      ? [{ imageBase64: body.imageBase64, mediaType: body.mediaType }]
      : [];
  return arr
    .filter((im) => im && typeof im.imageBase64 === 'string' && im.imageBase64.length > 0)
    .map((im) => ({ imageBase64: im.imageBase64 as string, mediaType: im.mediaType }))
    .slice(0, MAX_OCR_IMAGES);
}

export interface OcrResult {
  ok: boolean;
  status: number;
  items?: unknown[];
  error?: string;
}

// 기본 모델. .env(GEMINI_MODEL)로 덮어쓸 수 있음 (예: gemini-2.5-flash, gemini-2.5-flash-lite).
const DEFAULT_MODEL = 'gemini-3.5-flash';

export async function extractAnswerKey(p: OcrParams): Promise<OcrResult> {
  const images = (p.images ?? []).filter((im) => im?.imageBase64);
  if (images.length === 0) return { ok: false, status: 400, error: '이미지가 없습니다.' };
  const section = p.section && SECTIONS.includes(p.section) ? p.section : undefined;
  const model = (p.model && p.model.trim()) || DEFAULT_MODEL;

  const imageParts = images.map((im) => ({
    inlineData: { mimeType: im.mediaType || 'image/png', data: im.imageBase64 },
  }));

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'x-goog-api-key': p.apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [...imageParts, { text: buildPrompt(section, images.length) }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: SCHEMA,
          maxOutputTokens: 8192,
        },
      }),
    },
  );

  const data: any = await resp.json().catch(() => null);
  if (!resp.ok) {
    return { ok: false, status: 502, error: data?.error?.message ?? `Gemini API 오류 (${resp.status})` };
  }
  const cand = data?.candidates?.[0];
  if (!cand) {
    const reason = data?.promptFeedback?.blockReason;
    return { ok: false, status: 502, error: reason ? `Gemini 차단: ${reason}` : 'Gemini 응답이 비었어요.' };
  }
  // JSON 모드: 사고(thought) 파트를 제외한 텍스트 파트만 이어붙인다.
  const parts: any[] = cand?.content?.parts ?? [];
  const text = parts
    .filter((pt) => typeof pt?.text === 'string' && !pt.thought)
    .map((pt) => pt.text)
    .join('');
  let parsed: any;
  try {
    parsed = JSON.parse(text || '{"items":[]}');
  } catch {
    return { ok: false, status: 502, error: '응답 파싱 실패' };
  }
  const raw: any[] = Array.isArray(parsed?.items) ? parsed.items : [];
  const items = section ? raw.map((it) => ({ ...it, section })) : raw;
  return { ok: true, status: 200, items };
}
