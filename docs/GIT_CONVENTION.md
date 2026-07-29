# Git Convention

이 문서는 Landing/MockTest 프로젝트의 이슈·PR 자동화 규칙을 Mother 프로젝트에서 그대로 쓰기 위한 기준입니다.

## 작업 흐름

1. 작업 전 GitHub Issue를 먼저 생성합니다.
2. 이슈 번호를 브랜치명과 PR 제목 또는 본문에 포함합니다.
3. PR 본문에는 반드시 `Closes #이슈번호`를 적습니다.
4. PR에는 변경 요약, 테스트, 스크린샷이 필요한 경우 스크린샷을 남깁니다.

## 브랜치 이름

권장 형식:

```text
feat/#12-login-ui
fix/#18-kakao-callback
docs/#21-design-system
refactor/#24-auth-shell
style/#27-landing-match
chore/#30-github-template
```

## 작업 타입

Issue/PR 제목은 자동 라벨링을 위해 아래 타입을 사용합니다.

| 타입 | 용도 |
|---|---|
| `Feat` | 기능 추가 |
| `Fix` | 버그 수정 |
| `Docs` | 문서 수정 |
| `Refactor` | 동작 변경 없는 구조 개선 |
| `Style` | UI/CSS/표현 수정 |
| `Chore` | 설정, 자동화, 기타 관리 작업 |

권장 제목:

```text
[Feat] 카카오 로그인 화면 연결
[Fix] 기존 계정 연결 안내 문구 수정
[Docs] 디자인 시스템 문서 추가
```

## 작업 영역 라벨

자동화는 본문이나 제목에 아래 키워드가 있으면 영역 라벨을 붙입니다.

| 라벨 | 용도 |
|---|---|
| `FRONTEND` | 화면, 라우팅, 클라이언트 코드 |
| `BACKEND` | API, 인증, 서버 로직 |
| `INFRA` | 배포, 환경변수, 플랫폼 설정 |
| `DESIGN` | 디자인 시스템, UI 표현 |

## 우선순위

필요하면 이슈 본문에 `P0`, `P1`, `P2`, `P3`를 적습니다.

| 우선순위 | 의미 |
|---|---|
| `P0` | 즉시 처리해야 하는 장애 |
| `P1` | 핵심 기능에 영향 |
| `P2` | 일반 작업 |
| `P3` | 낮은 우선순위 개선 |

## PR 체크

기본 확인 항목:

```text
npm run build
```

UI 변경이 있으면 스크린샷을 첨부합니다.
