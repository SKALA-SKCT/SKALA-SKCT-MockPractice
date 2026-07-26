# SKCT 연습 도구

SKCT(SK그룹 종합역량검사) 실전 연습용 웹앱. **문제는 외부 창(책·PDF)에서 보고, 이 앱에는 답만** 적습니다.
실제 시험처럼 **지나간 문제는 다시 못 풀며**, 끝나고 **문항별 소요시간과 오답 패턴**을 분석해 줍니다.

## 무엇을 해주나

- **응시 환경**: SKCT 인지역량 5영역(언어이해·자료해석·창의수리·언어추리·수열추리) 프리셋, 5지선다,
  무빙백 금지, 영역별 카운트다운(기본 15분), 문항별 타이머.
- **보조 도구**: 계산기 · 메모장 · 그림판(캔버스) · 타이머 — 시험 화면 옆에 도킹.
- **결과 분석**: 채점 + `오답률 × 소요시간` 산점도와 함께 세 갈래로 분류
  - 🟡 **아까운 실수** — 오답률 낮은데(쉬운데) 틀린 문제. 최우선 보완.
  - 🔴 **시간 관리 누수** — 오답률 높은데(어려운데) 안 넘기고 붙잡은 문제.
  - ⏳ **미착수** — 시간이 부족해 손도 못 댄 문제의 **개수 + 번호**.
  - 영역별 정답률·평균 시간, 세션 누적 정답률 추이.
- **관리자 · 정답표 등록**: **영역별로 정답표 이미지를 따로 업로드**(언어이해·자료해석·창의수리·언어추리·수열추리,
  최대 5장)하면 **AI(OCR)** 가 그 영역의 정답·정답률을 추출해 표를 채워줍니다(검수 후 저장). 수동 입력·빠른 붙여넣기도 지원.

## 기술 스택

- **프런트**: Vite + React + TypeScript (외부 UI 라이브러리 0 — 계산기·캔버스·산점도 모두 자체 구현).
- **백엔드/배포**: Cloudflare Pages + Pages Functions.
  - `functions/api/ocr` — Gemini 비전 API로 정답표 OCR(키는 CF 시크릿). 기본 모델 `gemini-3.5-flash`,
    `GEMINI_MODEL` 환경변수로 변경 가능(예: `gemini-2.5-flash`).
  - `functions/api/problemsets`, `functions/api/sessions` — Cloudflare KV 저장(기기 간 동기화).
- **저장소 자동 전환**: 개발(`npm run dev`)은 브라우저 `localStorage`, 배포 빌드는 KV.

## 빠른 시작

```bash
npm install
npm run dev          # http://localhost:5173
```

- 데이터는 이 브라우저의 localStorage에 저장됩니다(개발 모드).
- **OCR도 개발 서버에서 바로 됩니다.** 프로젝트 루트에 `.env.local` 파일을 만들고 Gemini 키를 넣은 뒤 dev 서버를 재시작하세요:
  ```
  GEMINI_API_KEY=...
  ```
  키 발급은 [Google AI Studio](https://aistudio.google.com/apikey)에서. 키는 Vite 서버(Node) 안에서만
  쓰이고 브라우저에 노출되지 않습니다. 키가 없으면 관리자에서 **수동 입력/붙여넣기**로 문제셋을 만들 수 있어요.

## OCR·KV까지 로컬에서 테스트 (Cloudflare Pages dev)

1. Cloudflare 계정 로그인:
   ```bash
   npx wrangler login
   ```
2. KV 네임스페이스 생성 후 `wrangler.toml`의 `id`를 교체:
   ```bash
   npx wrangler kv namespace create SKCT_KV
   # (선택) 로컬 프리뷰용: npx wrangler kv namespace create SKCT_KV --preview
   ```
3. OCR용 API 키를 로컬 시크릿으로:
   ```bash
   cp .dev.vars.example .dev.vars    # 그리고 GEMINI_API_KEY 값 채우기
   ```
4. 빌드 + Functions 포함 서버 실행:
   ```bash
   npm run pages:dev                 # dist 빌드 후 wrangler가 Functions까지 서빙
   ```

## 배포

```bash
npm run pages:deploy
```

배포 후 한 번 설정:

- **시크릿(OCR)**: `npx wrangler pages secret put GEMINI_API_KEY`
  (또는 Cloudflare 대시보드 → Pages 프로젝트 → Settings → Environment variables/secrets)
- **시크릿(조직 게이트, 선택)**: `npx wrangler pages secret put SITE_PASSWORD`
  → 설정하면 사이트 접속 시 이 비밀번호를 요구(조직 전용). 비우면 게이트 비활성(개방).
  게이트는 배포 환경에서만 동작하며 `npm run dev`에는 적용되지 않음.
- **KV 바인딩**: 대시보드에서 프로젝트에 `SKCT_KV` 바인딩 연결(또는 `wrangler.toml`의 `id` 반영).

> 배포 빌드는 저장을 KV로 하므로, KV 바인딩이 없으면 문제셋/결과 저장이 실패합니다.

## 사용 흐름

1. **관리자**(`/admin`)에서 문제셋 생성 — 정답표 이미지 OCR 또는 수동 입력. 정답률이 분석 기준이 됩니다.
2. 홈에서 문제셋을 골라 **응시 시작**. 외부 창에 실제 문제를 띄워두고, 이 앱엔 답만 입력.
3. 끝나면 **결과 페이지**에서 산점도·분류·미착수 번호·영역별 지표 확인. `기록`에서 추이도 볼 수 있어요.

## 폴더 구조

```
src/
  pages/        Home · Admin · Exam · Results · History
  components/   Calculator · Memo · DrawPad · ToolDock · ScatterChart
  exam/         useExam.ts (무빙백·타이머·미착수 상태머신)
  admin/        answerKey.ts (정답표 파싱·편집 헬퍼)
  analytics.ts  채점 + 오답 분류 로직
  store/        local(localStorage) · remote(KV) · 자동 전환
functions/api/  ocr · problemsets · sessions (Cloudflare Pages Functions)
```

> 문항 수·시간·구성은 시행 시기·계열사마다 다를 수 있어요. 관리자 설정에서 조정하세요.
