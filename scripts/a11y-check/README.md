# a11y-check

접근성 회귀 점검 도구. 이미 떠 있는 dev 서버를 Playwright로 열어 아래를 확인하고, 위반이 하나라도 있으면 exit 1.

- **axe**: 비회원·user·admin 페이지를 PC(1440)·모바일(390) × 라이트·다크 4조합으로 검사한다. 태그는 `wcag2a/aa`, `wcag21a/aa`, `wcag22aa`, `best-practice`.
- **포커스 링**: 라이트 모드에서 Tab으로 페이지를 순회하며, 포커스 전과 스타일(outline·box-shadow·border-color)이 달라지지 않는 요소를 잡는다.
- **다이얼로그**: `[data-slot=alert-dialog-trigger|dialog-trigger|sheet-trigger]`를 키보드로 열어 이름, 모달 전달(`aria-modal` 또는 배경 `main`의 `aria-hidden`/`inert` — base-ui는 후자), 초기 포커스, Tab·Shift+Tab 트랩, 모달 내부 axe, ESC로 닫힘, 같은 트리거 요소로 포커스 복귀를 본다.
- **라우트 모달**: 인터셉팅 라우트 모달(RouteModal)을 PC·모바일에서 같은 기준으로 본다.

```bash
npm run a11y-check -- --url http://localhost:3000                  # 전체 (수 분 걸림)
npm run a11y-check -- --url http://localhost:3000 --only '^/finance' # 경로 정규식 필터
npm run a11y-check -- --url http://localhost:3000 --skip tab,dialog  # 점검 종류 제외(axe,tab,dialog,modal)
```

규칙의 근거는 `docs/agents/constraints.md`의 "접근성" 섹션이다.

## 전제와 안전장치

- dev 서버와 로컬 kista-api(:8080, local 프로파일)가 떠 있어야 한다. 이 도구는 아무것도 기동하지 않는다. 다른 세션의 dev 서버를 쓰면 그 세션의 작업 중 변경까지 함께 점검된다는 점에 주의한다.
- 로컬 DB에는 실데이터가 있다. 브라우저에서 나가는 요청 중 GET/HEAD가 아닌 것은 전부 abort한다. 서버 쪽에서 GET 요청을 받아 upstream에 쓰기 요청을 보내는 Route Handler는 없다(추가되면 이 방식으로는 막히지 않으니 visual-diff의 GET 전용 프록시로 바꿔야 한다).
- 쓰기성 호출은 dev 토큰 발급(`POST /api/auth/dev-token`, `dev-admin-token`) 하나뿐이다.
- 계좌·전략 ID는 `scripts/shared/seed.mjs`(dev 시드, visual-diff와 공용)를 그대로 쓴다. 로컬 시드가 다르면 `VISUAL_DIFF_SEED`로 덮어쓴다.

## 판정에서 일부러 빼는 것

오탐으로 확인된 것만 뺀다. 새로 뺄 때는 실제 사례와 이유를 코드 주석에 남긴다.

- 다이얼로그 내부 axe의 `region`: 포털로 `body` 직속에 렌더되는 다이얼로그는 랜드마크 밖이 정상이다.
- 탭 순서의 "이름 없음"·"24px 미만"은 보지 않는다. `<label for>`나 svg `<title>`로 붙은 이름, 스위치의 `after:-inset` 확장 터치 영역을 bbox만으로 판단할 수 없어 오탐이 많다. 이름은 axe가 정확히 본다.

## 결과 해석

- Tab 후 150ms를 기다린다. base-ui 포커스 가드가 비동기로 포커스를 되돌려서, 바로 읽으면 가드 요소를 잡는다.
- SSE(`/api/trades/stream`) 때문에 `networkidle`에 도달하지 않아 `load` + 고정 대기를 쓴다. 첫 Turbopack 컴파일이 느리면 리다이렉트·빈 화면으로 보일 수 있다. 한 번 더 돌리거나 `--only`로 해당 경로만 다시 본다.
- `ERR_CONNECTION_REFUSED`로 중단되면 실행 도중 dev 서버가 재기동된 것이다. 동시 세션이 재기동하는 경우가 있다.
