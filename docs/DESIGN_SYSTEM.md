# SKALA-SKCT Design System

랜딩에서 확립한 시각 언어를 학습 페이지(실전 모의고사 · 모의고사 문제 연습 · 유형별 문제 연습)에 적용하기 위한 **시각 규격서**입니다.

| | |
|---|---|
| **버전** | 0.3.0 |
| **적용 대상** | 마더(`SKALA-SKCT-Mother`) · 랜딩(`SKALA-SKCT-Landing`) · 학습 앱(`SKALA-SKCT-MockTest`, `SKALA-SKCT-MockPractice`) |
| **기준 코드** | 마더 `src/index.css` · `src/landing/*.module.css` · `src/components/*` / 랜딩 `app/globals.css` · `components/*.module.css` |
| **문서 구조** | Primer / Polaris / Carbon 참고 — Principles → Foundations → Translation → Components → Guardrails |

> **이 문서가 다루는 것**: 색·서체·간격·라운드·그림자·모션·상태 표현·접근성 기준.
> **이 문서가 다루지 않는 것**: 화면 구성, 정보 구조, 플로우, 기능 동작. 페이지를 어떻게 짤지는 이 문서의 권한이 아닙니다. 아래 컴포넌트 규격은 **어떤 구조에 놓든 그 컴포넌트가 어떻게 보여야 하는지**만 정의합니다.

**상태 배지** — `Stable`(다중 사용) / `Single-use`(단일 사용) / `Unused`(선언만, 채택·삭제 결정 필요) / `New`(제품 적용을 위해 신설 필요)

---

## 목차

1. [설계 원칙 — 두 개의 표면](#1-설계-원칙--두-개의-표면)
2. [Foundations](#2-foundations)
3. [랜딩 → 제품 변환 규칙](#3-랜딩--제품-변환-규칙)
4. [Components](#4-components)
5. [가드레일 — 랜딩에서 가져오지 말 것](#5-가드레일--랜딩에서-가져오지-말-것)
6. [Accessibility](#6-accessibility)
7. [Content & Voice](#7-content--voice)
8. [토큰·컴포넌트 정리 순서](#8-토큰컴포넌트-정리-순서)
9. [Appendix A. 랜딩 컴포넌트 레퍼런스](#appendix-a-랜딩-컴포넌트-레퍼런스)
10. [Appendix B. 알려진 부채](#appendix-b-알려진-부채)

---

## 1. 설계 원칙 — 두 개의 표면

이 서비스에는 성격이 다른 두 표면이 있습니다. **같은 토큰을 쓰지만 스케일과 모션 규칙은 다릅니다.**

| | **Marketing surface** | **Product surface** |
|---|---|---|
| 화면 | 랜딩, 로그인/회원가입, 안내 | 학습·응시·결과 화면 |
| 사용자 상태 | 둘러보는 중, 시간 여유 | 과업 중, 제한 시간, 실수 비용 큼 |
| 타입 | 큰 디스플레이(44–86px) | 조밀한 UI(11–32px) |
| 모션 | 400–1200ms 연출 허용 | **≤200ms**, 상태 피드백만 |
| 스크롤 | 연출 장치(스티키·확장) | 직선 스크롤 |
| 배경 | 풀블리드 그라데이션 | 무채 서피스 |

### P1. UI는 통일하고 밀도는 분리한다
색·서체·라운드·아이콘은 공유합니다. 크기·간격·모션은 표면별 스케일을 씁니다. "랜딩과 똑같이"가 아니라 "같은 가족으로"가 목표입니다.

### P2. 과업 화면의 모션은 기능일 때만 존재한다
상태 변화(선택됨·저장됨·오류·경고)를 알리는 전환만 씁니다. 등장 연출은 쓰지 않습니다. 제한 시간이 흐르는 화면에서 200ms 이상의 지연은 사용자의 자원을 씁니다.

### P3. 빨강은 브랜드이자 경고다 — 역할을 토큰으로 분리한다
랜딩의 빨강은 브랜드 강조입니다. 학습 화면에서는 오답·시간 부족·되돌릴 수 없는 동작에도 빨강이 필요합니다. 그래서 `--brand`와 `--danger`/`--incorrect`를 **다른 토큰**으로 둡니다([2.1](#21-color)).

### P4. 색만으로 상태를 말하지 않는다
정답/오답, 응답/미응답, 선택됨은 색 + **모양·아이콘·텍스트** 중 하나를 함께 씁니다. 색으로만 표현하면 색약 사용자에게 정보가 전달되지 않습니다.

### P5. 이 문서는 리스타일링 기준이다
기존 화면 구성과 플로우는 그대로 두고 외형만 정리하는 데 쓰입니다. 구조 변경이 필요하다고 판단되면 그건 이 문서 밖에서 결정할 일입니다.

---

## 2. Foundations

### 2.1 Color

현재 세 벌의 색 체계가 공존합니다.

| 출처 | 배경 | 잉크 | 레드 |
|---|---|---|---|
| 랜딩 | `#f7f7f5` | `#202020` | `#ea002c` |
| 앱 `globals.css` | `#fefdfc` | `#0b0b0b` | `#e94343` |
| 앱 컴포넌트(Tailwind 직접) | `zinc-50` | `zinc-900` | `red-600` |

#### 기본 팔레트 (통일안)

랜딩 값을 기준으로 삼습니다. 랜딩이 이미 배포된 첫 인상이고, `#f7f7f5`/`#202020`이 앱의 웜톤보다 장시간 읽기에 중립적입니다.

| 토큰 | 값 | 용도 |
|---|---|---|
| `--bg` | `#f7f7f5` | 페이지 배경 |
| `--surface` | `#ffffff` | 카드·패널·모달 |
| `--surface-sunken` | `#f4f4f2` | 본문 블록, 입력 배경 `New(채택)` |
| `--ink` | `#202020` | 제목·본문 |
| `--ink-muted` | `#686868` | 보조 설명, 라벨 |
| `--ink-faint` | `#9a9a97` | 메타(회차·시각), 비활성 `New(채택)` |
| `--ink-inverse` | `#ffffff` | 어두운 면 위 텍스트 |
| `--line` | `rgba(0,0,0,0.08)` | 기본 테두리 `New(채택)` |
| `--line-strong` | `rgba(0,0,0,0.14)` | 강조 테두리, 구분선 `New(채택)` |
| `--brand` | `#ea002c` | 브랜드 강조, 주 CTA |

#### 상태 시맨틱 `New`

학습 화면에 필요한 상태색입니다. 토큰으로 추가하고 Tailwind의 `red-600`/`zinc-*`를 직접 쓰지 않습니다.

| 토큰 | 값 | 용도 | 함께 쓰는 비색 신호 |
|---|---|---|---|
| `--correct` | `#1c7a4a` | 정답 | ✓ 아이콘 + 라벨 |
| `--correct-soft` | `#e8f3ec` | 정답 배경 | |
| `--incorrect` | `#c0271f` | 오답 | ✗ 아이콘 + 라벨 |
| `--incorrect-soft` | `#fbeceb` | 오답 배경 | |
| `--danger` | `#c0271f` | 되돌릴 수 없는 동작 | |
| `--warn` | `#b26a00` | 경고(시간 부족·미응답 존재) | 아이콘 + 텍스트 |
| `--warn-soft` | `#fdf3e3` | 경고 배너 배경 | |
| `--info-soft` | `#eef2f7` | 안내 배너 배경 | |
| `--selected` | `#202020` | 선택된 항목 테두리 | 굵은 테두리 + 채운 마커 |
| `--answered` | `#202020` | 응답 완료 | 채운 사각형 |
| `--unanswered` | `rgba(0,0,0,0.10)` | 미응답 | 빈 사각형 |
| `--flagged` | `#b26a00` | 표시한 항목 | 코너 마커 |

**금지 조합**

- 정답/오답을 `--brand`로 표시 — 브랜드와 오답이 같은 빨강이면 오답이 강조로 읽힙니다.
- 주 CTA(`--brand`)와 파괴적 동작(`--danger`)을 같은 크기·같은 채도로 나란히 배치 — 파괴적 동작은 외곽선+텍스트로 낮춥니다.

#### Scene-dark

랜딩의 배경 확장 구간 전용 반전 테마입니다. **학습 화면에는 적용하지 않습니다**(상태 시맨틱 대비가 무너집니다).

| 대상 | 오버라이드 |
|---|---|
| `header` | `background: transparent`, blur 해제, `--ink: #f5f5f3`, `--ink-inverse: #131313` |
| `#practice` 섹션 | `color: #f5f5f3`, `--ink: #f5f5f3`, `--ink-muted: rgba(245,245,243,.64)` |
| 그 외 | 변경 없음 |

토글 주체는 `GrowthSection.tsx` 한 곳, on 조건 `p ≥ 0.5 && fade ≥ 0.5`, off 조건 `op ≤ 0.05 || p ≤ 0.05`.

### 2.2 Typography

폰트는 두 표면 공통입니다.

```
"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont,
"Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif
```

기본 `16px / 1.7 / 400`. 숫자를 비교·정렬하는 곳(점수·시간·등수)은 **`font-variant-numeric: tabular-nums` 필수**.

#### 제품 타입 스케일 `New`

랜딩 스케일(`.display` 90px, `.heading` 44px)은 학습 화면에 쓰지 않습니다. 아래 단계에서 고릅니다.

| 이름 | 크기 | line-height | letter-spacing | weight | 쓰임 |
|---|---|---|---|---|---|
| `p-page-title` | 28 / 24(≤768) | 1.3 | -0.6px | 700 | 페이지 제목 |
| `p-section-title` | 20 | 1.4 | -0.4px | 600 | 묶음 제목 |
| `p-card-title` | 16 | 1.5 | -0.2px | 600 | 카드·항목 제목 |
| `p-question` | 17 | 1.75 | -0.2px | 600 | 문항 지문 |
| `p-option` | 15 | 1.6 | 0 | 400 | 보기 텍스트 |
| `p-body` | 14 | 1.7 | 0 | 400 | 설명·해설 |
| `p-meta` | 12 | 1.5 | 0 | 500 | 라벨·메타·배지 |
| `p-metric` | 32 / 28(≤768) | 1.2 | -1px | 700 | 수치 (tabular) |
| `p-timer` | 24 | 1 | 0 | 700 | 시간 (tabular, `font-mono` 허용) |

**지문 17px / 1.75의 근거** — 현재 앱은 지문을 `15px / leading-7`로 렌더합니다. 국문 장문을 제한 시간 안에 읽는 화면에서는 한 단계 크고 행간이 넉넉한 편이 유리합니다. 20px 이상은 스크롤이 늘어 역효과이므로 17px에서 멈춥니다.

**한 줄 길이** — 본문 텍스트 컬럼은 한 줄 45–60자를 넘기지 않는 폭으로 둡니다(17px 기준 약 720px). 넘어가면 줄 추적이 어려워집니다.

**줄바꿈** — 길이가 가변인 텍스트(문항·해설·사용자 데이터)에는 `\n`을 넣지 않고 자동 개행 + `[word-break:keep-all]`로 어절 단위 개행만 보장합니다. 랜딩의 `white-space: pre-line` 관례는 길이가 고정된 마케팅 문구 전용입니다.

### 2.3 Spacing & Density `New`

4px 그리드. 한 화면 안에서는 하나의 밀도를 일관되게 씁니다.

| 밀도 | 카드 패딩 | 항목 간격 | 성격 |
|---|---|---|---|
| **Comfortable** | 24px | 16px | 목록·요약 등 훑는 영역 |
| **Compact** | 16px | 12px | 사이드바·툴·조밀한 그리드 |
| **Focus** | 28–32px | 20px | 단독 집중 영역 |

| 값 | 용도 |
|---|---|
| 4 / 8 | 아이콘-텍스트, 배지 내부 |
| 12 | 항목 간격, 버튼 내부 세로 |
| 16 | 카드 내부 블록 간격 |
| 24 | 카드 패딩, 카드 간 간격 |
| 32 / 40 | 블록 간격 |
| 64 | 페이지 상하 여백 (랜딩은 180–200px) |

**컨테이너 폭** — 목록/요약 화면 1200px(랜딩과 동일), 본문 텍스트 컬럼 720px 상한, 모달 480px(확인) / 640px(안내).

### 2.4 Radius · Border · Elevation

라운드는 랜딩보다 한 단계 작게 씁니다. 조밀한 화면에서 큰 라운드는 정렬감을 떨어뜨립니다.

| 토큰 | 값 | 쓰임 |
|---|---|---|
| `--r-xs` | 6px | 배지, 작은 칩 |
| `--r-sm` | 10px | 버튼, 입력, 목록 항목 |
| `--r-md` | 14px | 카드, 패널 |
| `--r-lg` | 16px | 모달, 큰 패널 (랜딩 카드 기본값과 동일) |
| `--r-pill` | 100px | 필터 칩, 알약 |

**테두리** — 학습 화면은 그림자보다 테두리에 의존합니다.

| 값 | 용도 |
|---|---|
| `1px solid var(--line)` | 카드·입력 기본 |
| `1px solid var(--line-strong)` | 구분선, 활성 입력 |
| 선택 상태 | `box-shadow: inset 0 0 0 2px var(--selected)` — 테두리 두께를 바꾸면 레이아웃이 흔들리므로 inset 그림자로 표현 |

**Elevation** — 3단계만.

| 단계 | 값 | 용도 |
|---|---|---|
| `e0` | none | 기본 카드(테두리만) |
| `e1` | `0 1px 2px rgba(0,0,0,.04)` | 떠 있는 요소, 드롭다운 |
| `e2` | `0 18px 40px rgba(0,0,0,.06)` | 모달, 플로팅 패널 |

랜딩의 `0 28px 80px` 급 그림자는 쓰지 않습니다.

### 2.5 Motion

| 표면 | 상한 | 이징 |
|---|---|---|
| Marketing | 1200ms | `cubic-bezier(0.16,0.82,0.18,1)` |
| **Product** | **200ms** | `cubic-bezier(0.2,0.7,0.2,1)` |

**허용되는 전환**

| 대상 | 지속 | 속성 |
|---|---|---|
| hover · press | 120ms | `background-color`, `border-color` |
| 선택 상태 | 140ms | `border-color`, `background-color`, inset shadow |
| 모달 열림 | 180ms | `opacity`, `transform: scale(.98→1)` |
| 배너·토스트 | 180ms | `opacity`, `transform: translateY(4px→0)` |
| 아코디언 | 200ms | `grid-template-rows: 0fr→1fr` |
| 경고 상태 진입 | 200ms | `color`, `background-color` |

**금지**

- 콘텐츠 등장 애니메이션(`.reveal` 계열)
- 스크롤 연동 변환(위치·크기 보간)
- 스무스 스크롤 라이브러리(Lenis)
- 200ms 초과 트랜지션
- 시간 표시 숫자의 트랜지션(값이 흐려짐), 1초 주기 점멸

`prefers-reduced-motion`에서는 전환 없이 즉시 상태 변경.

### 2.6 Interaction & Focus `New`

| 항목 | 규격 |
|---|---|
| 최소 히트 영역 | **44×44px** |
| 포커스 링 | `outline: 2px solid var(--brand); outline-offset: 2px` — `:focus-visible`로 전역 정의 |
| 비활성 | `opacity: .45` + `cursor: not-allowed` + `aria-disabled` |
| 로딩 | 버튼 내부 스피너 + **라벨 유지**(라벨을 지우면 무슨 동작이었는지 사라짐) |

---

## 3. 랜딩 → 제품 변환 규칙

랜딩 값을 그대로 옮기면 안 되는 항목의 대응표입니다.

| 항목 | 랜딩 | 제품 | 이유 |
|---|---|---|---|
| 페이지 제목 | `.heading` 44px/700 | `p-page-title` 28px/700 | 도구가 함께 있는 화면에서 44px은 스크롤만 늘림 |
| 히어로 제목 | 78px | 사용 안 함 | — |
| 본문 | 18px | 14–15px | 정보 밀도 |
| 상하 여백 | 180–200px | 64px | 한 화면에서 파악 가능한 정보량 |
| 항목 간격 | 34vh | 16–24px | 뷰포트 비례 간격은 도구 화면에서 예측 불가 |
| 카드 라운드 | 16px | 14px | 조밀한 화면 정렬감 |
| 그림자 | `0 28px 80px` | `0 1px 2px` 또는 테두리 | 카드가 많아지면 그림자가 노이즈 |
| 등장 모션 | 1.05–1.2s | 없음 | 과업 지연 |
| 스크롤 | Lenis + 스티키 스택 | 네이티브 직선 스크롤 | 입력과 스크롤 위치의 일치 |
| 배경 | 풀블리드 그라데이션 | `--bg` 무채 | 본문 가독성 |
| 강조색 | `--brand` 단독 | `--brand` + 상태 시맨틱 | 오답을 브랜드색으로 칠하지 않기 위해 |
| 줄바꿈 | `\n` + `pre-line` | 자동 개행 + `keep-all` | 가변 길이 콘텐츠 |

**가져와도 되는 것** — 팔레트, 서체, `tabular-nums`, `--r-*` 체계(한 단계 축소), 아코디언 높이 기법(`grid-template-rows`, 200ms로), 카드 기본형(흰 서피스 + 얇은 테두리), eyebrow 라벨(`p-meta` + `letter-spacing: .16em`으로 축소), `prefers-reduced-motion` 대응 구조.

---

## 4. Components

**각 항목은 "이 컴포넌트가 어떻게 보여야 하는가"만 정의합니다.** 어디에 배치할지, 어떤 순서로 쓸지, 어떤 조건에서 노출할지는 이 문서에서 정하지 않습니다.

### 4.1 Button `New`

| 변종 | 배경 | 텍스트 | 테두리 | 성격 |
|---|---|---|---|---|
| `primary` | `--brand` | `--ink-inverse` | none | 주 동작 |
| `neutral` | `--ink` | `--ink-inverse` | none | 중립 강조 |
| `secondary` | `--surface` | `--ink` | `1px var(--line-strong)` | 보조 |
| `ghost` | transparent | `--ink-muted` | none | 부가 |
| `danger` | `--surface` | `--danger` | `1px currentColor` | 되돌릴 수 없는 동작 |

| 크기 | 높이 | 패딩 | 타입 |
|---|---|---|---|
| `lg` | 48px | 0 24px | 15px/600 |
| `md` | 40px | 0 16px | 14px/600 |
| `sm` | 32px | 0 12px | 13px/500 |

라운드 `--r-sm`. hover는 밝기 6% 변화, press에서 위로 떠오르는 모션은 쓰지 않습니다.

> 현재 앱은 `bg-red-600` / `bg-zinc-900` / 외곽선 조합이 화면마다 조금씩 다른 값으로 반복됩니다(`ExamRunner.tsx` 등). 이 5변종 × 3크기로 수렴시키는 것이 이번 적용에서 체감이 가장 큰 개선입니다.

### 4.2 Card `Stable(랜딩 계승)`

`--surface` + `1px var(--line)` + `--r-md` + `e0`. 내부 패딩은 밀도 등급을 따릅니다.
앱의 `.card`(radius 18px + 이중 그림자)는 `--r-md` + `e1`로 정리합니다.

### 4.3 Chip / Badge `New`

| 유형 | 스펙 |
|---|---|
| 선택 가능한 칩 | 32px 높이, `--r-pill`, 기본 `--surface` + `1px var(--line)`, 선택 시 `--ink` 배경 + 흰 텍스트 |
| 상태 배지(읽기 전용) | 24px 높이, `--r-xs`, `p-meta`, soft 배경 + 진한 텍스트 |
| 카운트 배지 | 20px 원형, `--ink` 배경 |

배지는 **텍스트를 포함**합니다(색만 있는 점 배지 금지 — P4).

### 4.4 Input / Select `New`

| 속성 | 값 |
|---|---|
| 높이 | 40px(md) / 48px(lg) |
| 배경·테두리 | `--surface` + `1px var(--line)`, focus 시 `--line-strong` + 포커스 링 |
| 라운드 | `--r-sm` |
| 라벨 | `p-meta`, 위쪽 6px 간격 |
| 도움말·오류 | `p-meta`, 오류는 `--incorrect` + 아이콘 + 텍스트 |

### 4.5 Modal `New`

| 속성 | 값 |
|---|---|
| 오버레이 | `rgba(0,0,0,0.4)` |
| 패널 | 480px, `--surface`, `--r-lg`, 24px 패딩, `e2` |
| 제목 / 본문 | `p-section-title` / `p-body` `--ink-muted` |
| 액션 | 우측 정렬, `secondary` + (`primary` 또는 `danger`) |
| 접근성 | 포커스 트랩, `Esc` 닫기, 열릴 때 첫 액션에 포커스 |

되돌릴 수 없는 동작의 확인 모달은 본문에 결과를 구체적으로 적습니다(무엇이 사라지는지).

### 4.6 Banner (안내 · 경고) `New`

| 유형 | 배경 | 텍스트 | 아이콘 |
|---|---|---|---|
| info | `--info-soft` | `--ink` | ⓘ |
| warn | `--warn-soft` | `--warn` | ⚠ |
| error | `--incorrect-soft` | `--incorrect` | ✗ |

패딩 `12px 16px`, `--r-sm`, 좌측 아이콘 20px + 12px 간격. 아이콘 없이 색만으로 종류를 구분하지 않습니다.

### 4.7 Timer `New` (현재: `ExamRunner.tsx`)

| 상태 | 표현 |
|---|---|
| normal | `p-timer`, `--ink` |
| warn | `--warn` + 배경 `--warn-soft` + ⚠ + 남은 시간 텍스트 |
| critical | `--danger` + 배경 `--incorrect-soft`. **점멸 금지**(시각 피로·주의 분산) |

`tabular-nums` 고정 폭, `mm:ss`. 접근성 처리는 [6.1](#61-필수-요건) 참고.

### 4.8 상태 그리드 (문항 번호 등) `New`

| 상태 | 표현 |
|---|---|
| 기본/미응답 | `--surface` + `1px var(--line-strong)` |
| 완료 | `--answered` 배경 + 흰 숫자 |
| 현재 | 2px `--brand` 테두리 + 굵은 숫자 |
| 표시(플래그) | 우상단 6px 삼각 마커 `--flagged` |

칩 32×32px, `--r-xs`, `p-meta`, gap 4px(컨테이너 패딩으로 히트 영역 44px 확보). **범례를 함께 표시**하고, `aria-label`에 상태를 문자로 포함합니다.

### 4.9 선택 목록 (보기 등) `New`

| 속성 | 값 |
|---|---|
| 항목 | 최소 높이 48px, 패딩 `12px 16px`, `--r-sm`, `1px var(--line)` |
| 마커 | 원형 번호 24px, 좌측 고정, 텍스트와 12px 간격 |
| 텍스트 | `p-option`, 좌측 정렬, `[word-break:keep-all]` |
| hover | 배경 `--surface-sunken` |
| 선택 | `inset 0 0 0 2px var(--selected)` + 마커 채움 |
| 정답 공개 시 | 정답 `--correct-soft` + ✓ + 라벨 / 고른 오답 `--incorrect-soft` + ✗ + 라벨 |

단일 선택이면 `role="radiogroup"` + `role="radio"` + `aria-checked`.

### 4.10 본문 블록 (지문 · 해설) `New`

| 속성 | 값 |
|---|---|
| 배경·라운드 | `--surface-sunken`, `--r-md`, 20px 패딩 |
| 타입 | 지문 `p-question` / 해설 `p-body` |
| 폭 | 720px 상한 |
| 첨부 이미지·표 | 최대 폭 100%, `--r-sm`, `1px var(--line)` |

### 4.11 Floating Panel (계산기 · 메모 등) `New` (현재: `Calculator.tsx`, `MemoPad.tsx`)

| 속성 | 값 |
|---|---|
| 패널 | `--surface`, `--r-lg`, `e2`, 드래그 가능 |
| 헤더 | 32px, 제목 + 닫기, 드래그 핸들 |
| 성격 | **비모달** — 뒤 콘텐츠를 가리지 않고 상호작용 가능(현재 구현의 강점) |
| 닫기 | `Esc`, 포커스 트랩 없음 |

### 4.12 StatTile `Stable(랜딩 계승)`

| 속성 | 값 |
|---|---|
| 수치 | `p-metric`, `tabular-nums` |
| 라벨 | `p-card-title` |
| 보조 | `p-body`, `--ink-muted` |
| 증감 | ▲/▼ + `--correct`/`--incorrect` + 부호 텍스트 |

랜딩의 카운트업(1.4초)은 마케팅 표면 전용입니다. 즉시 확인이 필요한 수치에는 쓰지 않습니다.

### 4.13 Progress `New`

4px 높이 바 + 수치 텍스트. `--surface-sunken` 트랙, `--ink` 인디케이터. 작은 크기에서 값을 읽기 어려운 원형 프로그레스는 쓰지 않습니다.

### 4.14 EmptyState · Skeleton `New`

| 유형 | 규격 |
|---|---|
| Empty | 아이콘 40px + `p-section-title` 한 줄 + `p-body` 한 줄 |
| Skeleton | `--surface-sunken` 블록, **펄스 애니메이션 없음**. 실제 레이아웃과 같은 높이로 고정해 리플로우를 막습니다 |

### 4.15 Tab · Header `New`

| 속성 | 값 |
|---|---|
| 헤더 | `sticky top:0`, `z-index: 60`, 56px, `rgba(247,247,245,.86)` + `blur(18px)` |
| 탭 항목 | `p-card-title`, 좌우 패딩 14px, 활성 `--ink` + 2px 하단 인디케이터(`--brand`) |
| 비활성 탭 | `--ink-muted`, hover `--ink` |
| 접근성 | `role="tablist"`, 활성 항목 `aria-current` |

---

## 5. 가드레일 — 랜딩에서 가져오지 말 것

| # | 랜딩 요소 | 근거 |
|---|---|---|
| G1 | Lenis 스무스 스크롤 | 스크롤 위치가 입력과 어긋나 오클릭 유발, 프로그래매틱 이동도 어려워짐 |
| G2 | `.reveal` 등장(1.05–1.2s) | 콘텐츠가 늦게 나타나면 과업이 지연됨 |
| G3 | 스티키 카드 스택 | 카드가 겹치면 항목 간 비교가 불가능 |
| G4 | 배경 확장 핸드오프 | 스크롤당 리페인트가 크고, 본문 뒤 배경이 바뀌면 가독성이 흔들림 |
| G5 | 풀블리드 그라데이션 배경 | 본문 대비 예측 불가 |
| G6 | 78px / 44px 제목 | 정보 밀도 |
| G7 | `34vh` 간격 | 뷰포트 비례 간격은 도구 화면에서 예측 불가 |
| G8 | 카운트업(1.4s) | 즉시 확인이 필요한 수치를 지연시킴 |
| G9 | 마퀴 무한 루프 | 주의 분산 |
| G10 | `scene-dark` 반전 | 상태 시맨틱(정답/오답) 대비 붕괴 |

**반드시 가져올 것** — 팔레트, 서체, `tabular-nums`, 카드 기본형, 아코디언 높이 기법, eyebrow 라벨(축소), `prefers-reduced-motion` 대응 구조.

---

## 6. Accessibility

### 6.1 필수 요건

| 항목 | 요구 |
|---|---|
| 키보드 | 마우스 없이 모든 동작 도달 가능, 포커스 순서가 시각 순서와 일치 |
| 포커스 표시 | `:focus-visible` 전역 정의 ([2.6](#26-interaction--focus-new)) |
| 히트 영역 | 44×44px 이상 |
| 상태 전달 | 색 + 아이콘 + 텍스트 3중 (P4) |
| 시간 표시 | 숫자는 `aria-hidden`, 임계 시점(예: 5분·1분)만 `aria-live="polite"`로 1회 알림. 매초 읽히면 소음이 됩니다 |
| 동적 변경 | 변경된 부분만 라이브 리전으로 알림(본문 전체 재낭독 방지) |
| 모달 | 포커스 트랩 + `Esc` + 첫 액션 포커스 |
| 비모달 패널 | 트랩 없음, `Esc`로 닫고 트리거로 포커스 복귀 |
| 축소 모션 | `prefers-reduced-motion`에서 전환 제거 |

### 6.2 대비 기준

| 조합 | 비율 | 판정 |
|---|---|---|
| `--ink` / `--bg` | 15.3:1 | AAA |
| `--ink-muted` / `--bg` | 5.3:1 | AA |
| `--ink-faint` / `--bg` | 2.6:1 | **본문 불가** — 12px 이상 메타 텍스트에만, 중요한 정보에는 쓰지 않음 |
| `--correct` / `--correct-soft` | 5.4:1 | AA |
| `--incorrect` / `--incorrect-soft` | 6.1:1 | AA |
| `--ink-inverse` / `--brand` | 4.7:1 | AA(14px 이상 굵게 권장) |

### 6.3 현재 앱에서 고쳐야 하는 것

- 문항 번호 칩 28px → 44px 히트 영역 확보
- `:focus-visible` 전역 스타일 없음
- 보기 선택이 `<button>`이라 `radiogroup` 시맨틱 부재
- 시간 표시가 매초 갱신되며 라이브 리전 처리 없음

---

## 7. Content & Voice

| 항목 | 규칙 |
|---|---|
| 종결어미 | `~해요`체 통일. 시스템 경고·모달 본문은 `~합니다`체 허용 |
| AI 피드백 | 진단 → 개선점 → 다음 행동, `~습니다`/`~보세요` (랜딩 말풍선과 동일 톤) |
| 마침표 | 완결 문장 있음 / 라벨·체크리스트 없음 / 같은 그룹 내 통일 |
| 버튼 라벨 | 동사로 시작하고 결과를 말합니다. "확인"보다 "유형 제출", "저장"보다 "답안 저장" |
| 파괴적 확인 | 무엇이 사라지는지 구체적으로 |
| 숫자 단위 | 단위를 붙이고 `tabular-nums` |
| 금지 | 사용자가 시스템에 지시하는 말투(`~해줘`), 과장 부사 |

---

## 8. 토큰·컴포넌트 정리 순서

화면을 갈아엎지 않고 **토큰 → 원자 컴포넌트** 순으로만 올라가는 작업 순서입니다.

### 1단계 — 토큰 통일 (리스크 낮음)

- `src/app/globals.css`의 `:root`를 [2.1](#21-color)/[2.4](#24-radius--border--elevation) 값으로 교체
- Tailwind v4 `@theme inline`에 상태 시맨틱(`--correct`, `--incorrect`, `--warn`, `--danger`, `--selected` …) 등록
- 미사용 시리즈 색(`--series-group/class/campus`)은 차트 전용으로 이름 변경 또는 삭제

### 2단계 — 원자 컴포넌트 추출

- `Button`(5변종×3크기), `Card`, `Chip`, `Badge`, `Input`, `Modal`, `Banner`를 컴포넌트로 분리
- 화면에 흩어진 `bg-red-600`/`bg-zinc-900`/`border-zinc-200` 인라인 조합을 이 컴포넌트로 치환
- 이 단계만으로 화면 간 버튼 크기·라운드 불일치가 해소됩니다

### 3단계 — 접근성 기준 적용

- 히트 영역 44px, `:focus-visible`, `radiogroup` 시맨틱, 라이브 리전 처리

### 4단계 — 랜딩 자산 분리

- 랜딩의 Lenis·`.reveal`은 **랜딩 라우트에서만** 마운트되도록 경로 분리. 전역 레이아웃에 넣으면 G1·G2 위반입니다.

### 검증 체크리스트

- [ ] 학습 화면에 200ms 초과 트랜지션이 없는가
- [ ] 색을 흑백으로 바꿔도 정답/오답/미응답이 구분되는가
- [ ] 본문 한 줄이 60자를 넘지 않는가
- [ ] 시간 표시가 스크린리더에서 매초 읽히지 않는가
- [ ] 키보드만으로 모든 동작에 도달하는가
- [ ] `prefers-reduced-motion`에서 즉시 최종 상태인가
- [ ] Tailwind 원색(`red-600`, `zinc-*`)을 직접 쓴 곳이 남아 있지 않은가

---

## Appendix A. 랜딩 컴포넌트 레퍼런스

랜딩 구현 실측값입니다. 제품 적용 시 [3장](#3-랜딩--제품-변환-규칙) 변환을 거칩니다.

### A.1 타입 스케일 (전역 클래스)

| 클래스 | ≥1200 | ≤1199.98 | ≤767.98 | weight | 상태 |
|---|---|---|---|---|---|
| `.display` | 90 | 72 | 42 | 500 | `Unused` |
| `.heading` | 44 | 35 | 28 | 700 | `Stable`(7곳) |
| `.subheading` | 36 | 30 | 26 | 500 | `Unused` |
| `.title` | 24 | — | — | 500 | `Unused` |
| `.counter` | 40 | 36 | 30 | 600 | `Unused` |
| `.lede` | 18 | — | — | 400 | `Single-use` |
| `.body-sm` | 16 | — | — | 400 | `Unused` |

### A.2 섹션 리듬

| 섹션 | padding (top/x/bottom) |
|---|---|
| Hero | 92 / 30 / 280 |
| LogoMarquee | 84 / — / 96 |
| Solutions | 110 / 30 / 0 |
| Growth | 180 / 30 / 0 |
| DataPlatform | 180 / 30 / 0 |
| Stats | 128 / 30 / 0 |
| Workflow · Opportunity | 200 / 30 / 0 |
| FAQ | 128 / 30 / 30 |
| BottomCta | 180 / 30 / 180 (min-h 620) |
| Footer | 160 / 30 / 72 |

### A.3 주요 컴포넌트 요약

| 컴포넌트 | 핵심 스펙 |
|---|---|
| SiteHeader | sticky, 68px, `rgba(247,247,245,.86)` + blur(18) saturate(160%), 내비 gap 34, hover `--sk-red` |
| Hero | plate `aspect 1.82094`, frame 911px/`aspect 1.32799`/radius 32/blur 54, shot 크로스페이드 1.1s |
| PillSwitcher | radius 100, `min-height 46`, gap 40, 활성 `--ink` + 아이콘 |
| LogoMarquee | 16개 항목, gap 88, `marquee 84s linear infinite`, 마스크 그라데이션, hover 정지 없음 |
| SolutionCard | sticky top 200/230/260, radius 16, `min-height 478`, gap 144(반전 72) |
| AssistCard | `min-height 620`, 패딩 57/95/57/54, 헤드라인 32px `pre-line`, 말풍선 20px·radius 26·`max-width 860` |
| StepFeature | 그리드 `0.62fr / 1.62fr` gap 72, 문구 `min-height 58vh` gap 34vh, 하단 패딩 **12vh**(스티키 릴리즈 타이밍), 비주얼 sticky top 132 |
| StatTile | 카드 패딩 60/64, 수치 40px tabular, 카운트업 1400ms |
| WorkflowStep | 4등분, 좌측 1px 구분선, `min-height 264`, 제목 `max-width 158` |
| FeatureTile | 패널 104/78, 2×2 gap 40/24, 타일 hover `translateY(-10px) scale(1.03)` |
| FaqItem | radius 16, 트리거 18px/600 패딩 24, 답변 `grid-template-rows 0fr→1fr` 0.62s |
| BottomCta | `min-height 620`, 제목 `clamp(46px,5.1vw,86px)` |

### A.4 랜딩 전용 패턴

| 패턴 | 핵심 |
|---|---|
| Scroll Reveal | `:root[data-reveal="on"]` 게이팅, `--reveal-y`(56px)·`--reveal-delay`, threshold 0.06 |
| Sticky Stack | 카드별 top 오프셋 + `z-index: index+1`, ≤767.98px 해제 |
| Sticky Split | 활성 판정 threshold `[.35,.5,.65]`, rootMargin `-28%` |
| Scene Hand-off | `GROW_START .88` / `GROW_VIEWPORTS .4` / `EPS .004`, 소멸 분모 `.32vh`, 문구 페이드 `1-p×2.4` |
| Count-up | 1400ms, `1-(1-t)³`, threshold 0.4, 1회 |
| Smooth Scroll | Lenis `lerp .065`, `wheelMultiplier .72` |

**배경 확장에서 얻은 교훈** (재발 방지)

| 증상 | 원인 | 해결 |
|---|---|---|
| 박스 이중 표시 | 교체 대상에 `transition: opacity` | 교체 속성에서 트랜지션 제거 |
| 교체 순간 튐 | `background-image(cover)` vs `img(object-fit)` 크롭 차이 | 동일한 `<img>` 사용 |
| 1–2px 점프 | 임계값에서 이미 확대된 상태 | 지오메트리를 `EPS`부터 재매핑 |
| 헤더 깜빡임 | 켜기 조건이 가시성을 확인하지 않음 | `fade ≥ 0.5` 게이트 추가 |
| 프레임 드롭 | opacity 0↔1 컴포짓 레이어 생성/파괴 | `will-change: opacity` |

---

## Appendix B. 알려진 부채

### B.1 랜딩

| # | 내용 |
|---|---|
| 1 | `DataPlatformSection`의 `.screen`이 `feature.image`를 렌더하지 않아 흰 박스만 보임 |
| 2 | `--r-*`, `--shadow-*`, `--line*`, 타입 스케일 다수가 참조 0회. 같은 값이 컴포넌트에 하드코딩 |
| 3 | `metadataBase`가 `http://localhost:3001` — 배포 도메인은 `https://skala-skct-landing.vercel.app` |
| 4 | ≤900px에서 내비·CTA가 사라지고 대체 메뉴 없음 |
| 5 | 브레이크포인트 5종 혼용(1199.98 / 1099.98 / 1000 / 900 / 767.98) → 1199.98·767.98로 수렴 |
| 6 | `solutions.cards`와 `dataPlatform.features`가 거의 같은 문구를 중복 보유 |
| 7 | `DraggableChips.tsx` 미사용 |
| 8 | 통계 수치 중 `300+`, `5개`는 임시값 |
| 9 | `:focus-visible` 스타일 미정의 |

### B.2 앱

| # | 내용 |
|---|---|
| 1 | 색 체계 3중(랜딩 / `globals.css` 토큰 / Tailwind `zinc·red` 직접 사용) |
| 2 | 버튼 스타일이 화면마다 다른 인라인 조합으로 반복 |
| 3 | 문항 번호 칩 28px(히트 영역 미달) |
| 4 | 보기 목록에 `radiogroup` 시맨틱 없음 |
| 5 | 시간 표시 라이브 리전 처리 없음 |
| 6 | `:focus-visible` 스타일 미정의 |
| 7 | 카드 라운드 18px + 이중 그림자 → `--r-md` + `e1`로 정리 필요 |
