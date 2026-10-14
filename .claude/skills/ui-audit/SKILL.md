---
name: ui-audit
description: 화면(라우트) 또는 디렉토리 단위로 UI 미흡점을 고정 체크리스트로 점검하고 file:line 표로 보고한다. 기본은 조사만(수정 없음). 예: /ui-audit /accounts/[id]/strategies/[sid], /ui-audit widgets/strategy-detail --focus 상태표현,카피
user-invocable: true
---

인자: `<대상> [--focus <관점,...>] [--fix]`

- `<대상>`: 라우트(`/strategies`), 디렉토리(`widgets/strategy-detail`), 파일 중 하나. 생략 시 사용자에게 물어본다.
- `--focus`: 아래 관점 번호 또는 이름(예: `상태표현,접근성`). 생략 시 전 관점.
- `--fix`: 지정 시에만 보고 후 수정까지 진행. 기본은 **조사만 하고 코드는 수정하지 않는다**.

## 1. 대상 범위 확정

라우트면 `app/` 아래 해당 `page.tsx`부터 렌더 트리를 따라 실제로 그려지는 widgets/features/entities 컴포넌트를 목록화한다(레이아웃·공용 셸은 제외). 목록을 먼저 짧게 보여주고 점검한다. 범위가 파일 15개를 넘으면 사용자에게 좁힐지 물어본다.

## 2. 체크리스트

규칙 원문은 문서에 있다 — 여기 복사하지 말고 해당 절을 읽고 대조한다.

| # | 관점 | 기준 문서 / 확인 방법 |
|---|---|---|
| 1 | 상태표현 | 같은 색이 다른 뜻으로 쓰임, 같은 상태가 화면마다 다른 단어·색, 색으로만 전달(텍스트 없음), enum 코드 원문 노출(`labelOf` 미사용). 토큰 의미는 `app/globals.css` 주석, 기존 헬퍼(`strategyStatusAccent`, `orderStatusBadgeClass`, `directionBadgeClass`)와 대조 |
| 2 | 카피 | `docs/agents/constraints.md` "카피" 절 — 종결 패턴, 토스트 마침표 레이어 규칙, 동의어 혼용(트리거 버튼·다이얼로그 제목·토스트 동사 일치), 앱 전역 grep으로 다수 표현 확인 |
| 3 | 접근성 | `docs/agents/constraints.md` "접근성" 절. 런타임 확인이 필요하면 `npm run a11y-check -- --url <url>` 실행 여부를 사용자에게 묻는다 |
| 4 | 상태관리 | `docs/agents/constraints.md` "TypeScript / React Query" 절 — 서버 상태 `useState` 복사, `onError` 토스트 중복, 게스트 401 게이팅(`docs/agents/architecture.md`) |
| 5 | 빈·로딩·에러 | 데이터 0건, 로딩, 실패 각각의 화면이 있는지·서로 구분되는지·다음 행동을 안내하는지 |
| 6 | 모바일 | 가로 넘침, 고정 폭, 터치 영역(24px+/아이콘 버튼 `IconButton`), `docs/agents/widgets.md` 반응형 절 |
| 7 | 레이어·구조 | FSD 위반·widget cross-import(`docs/agents/widgets.md` 화이트리스트), 같은 라벨/색 맵의 로컬 중복 정의 |

## 3. 보고 형식

```
| # | 위치(file:line) | 관점 | 현상 | 수정 제안 | 심각도(상/중/하) |
```

- 심각도: 상 = 사용자가 잘못 이해하거나 기능을 못 씀, 중 = 일관성·접근성 결함, 하 = 정리·리팩토링 후보
- 의도된 예외로 판단해 제외한 항목은 표 아래 "제외(사유)"로 따로 적는다 — 조용히 빼지 않는다
- 정적 분석만 했는지, 런타임(브라우저·axe)까지 봤는지 마지막 줄에 명시한다
- 같은 문제가 대상 밖 다른 화면에도 반복되는 것으로 보이면 "전역 후보"로 표시한다(앱 전체 관점 조사로 넘길 신호)

## 4. `--fix`일 때

보고 후 상/중 항목만 수정한다(하는 목록만). 공용 `entities/`·`shared/` 헬퍼를 바꿔야 하면 먼저 그것부터 고치고 소비처를 맞춘다. 수정 후 관련 테스트만 좁혀 돌리고, 커밋 전 검토자 검수 규칙(`docs/agents/constraints.md`)을 따른다.
