# 백테스트 UI 설계

## 배경

kista-api에 백테스트 실행 API(`GET /api/backtest`, 미푸시 커밋 12건, `aa1d3541`까지)가 추가됐다. 과거 일봉으로 3전략(INFINITE/PRIVACY/VR)을 시뮬레이션해 자산 곡선·성과 요약·해석 주의사항(warnings)을 반환한다. 계좌와 무관한 순수 시뮬레이터(로그인만 필요, 소유권 검증 없음) — kista-ui에 대응하는 화면이 없다.

## 범위

- 신규 최상위 라우트 `/backtest` (사이드바 메뉴 추가, `PROTECTED_PREFIXES`에 등록)
- 3전략 전체 지원: 공통(type/ticker/from/to/seed) + INFINITE 전용(divisionCount) + VR 전용(bandWidth/intervalWeeks/recurringAmount/initialValue)
- 실행은 "실행" 버튼 클릭시에만 조회(자동 재조회 없음)
- 자산곡선 차트는 `widgets/stats-overview/EquityCurveChart`의 recharts 렌더링 부분을 `shared/ui`로 승격해 재사용
- 결과 저장/히스토리 없음(API가 무상태 — 매 실행은 단발성 결과)

### 범위 밖

- 계좌 연동, 결과 공유/저장, PDF/이미지 export
- VR 인출식 최소자산 등 복잡 도메인 공식의 클라이언트 사전 검증(서버 400 메시지를 그대로 노출)

## API 계약 (참고, kista-api 미푸시 12커밋 기준)

```
GET /api/backtest?type=&ticker=&from=&to=&seed=&divisionCount=&vrBandWidth=&vrIntervalWeeks=&vrRecurringAmount=&vrInitialValue=
→ { points: {date, totalAsset, principal}[], summary: {finalAsset, totalInvested, totalReturnRate, cagr, mdd, tradeCount, cycleCount}, warnings: string[] }
```

검증 실패는 전부 400 + 한글 메시지(`IllegalArgumentException` → `GlobalExceptionHandler`).

## FSD 계층 구현

### `app/`
- `app/api/backtest/route.ts`: `createProxyRoute({ basePath: '/api/backtest' })` (requireAuth 기본값 true 유지)
- `app/(main)/backtest/page.tsx`: Server Component, prefetch 없음 — 실행 트리거 방식이라 SSR 프리페치 대상이 없다. `widgets/backtest/BacktestPageContent`만 렌더
- `proxy.ts`의 `PROTECTED_PREFIXES`에 `/backtest` 추가
- 사이드바 메뉴: `widgets/layout/DesktopSidebar.tsx`의 `NAV_ITEMS`와 `widgets/layout/MobileBottomNav.tsx`의 동일 배열(중복 정의, 팩토리 없음) 양쪽에 `{ href: '/backtest', label: '백테스트', icon: ... }` 추가

### `entities/backtest/`
- `model/types.ts`: `BacktestCommand`(camelCase, API record 그대로 매핑), `BacktestResult`
- `api/index.ts`: `getBacktest(params, token?)` — `URLSearchParams` 빌더 + `fetchEither` (`entities/stats/api`의 `getEquityCurve` 패턴 그대로)
- `hooks/useBacktestQuery.ts`: `useQuery({ queryKey: backtestKeys.run(params), queryFn, enabled: false })` + `refetch` 반환 (수동 트리거)

### `features/backtest/run-backtest/`
- `BacktestForm.tsx`: Type 선택 → Ticker(타입별 `availableTickers`) → from/to/seed 공통 → 타입별 조건부 섹션
  - INFINITE: `divisionCount` (`create-strategy`의 `DivisionCountSection` UI 패턴)
  - VR: `bandWidth`/`intervalWeeks`/`recurringAmount`/`initialValue` (`VrSettingsSection` 패턴, 계좌 종속 로직 제외)
  - PRIVACY: 추가 파라미터 없음(ticker=SOXL 고정)
- `model/useBacktestForm.ts`: 폼 상태 + `submitDisabledReason` — 최소 검증만(seed>0, from<=to, VR 필수 필드 존재). 복잡 공식은 서버 400 메시지 그대로 인라인 표시
- 시드는 `create-strategy`처럼 계좌 잔고 대비 usage-ratio가 아니라 단순 금액 입력(계좌 무관이므로)

### `widgets/backtest/`
- `BacktestPageContent.tsx`: 폼 + 결과(차트/요약/경고) 조합. 화이트리스트 밖 페이지 위젯 — 다른 widget에서 import 금지
- `BacktestSummaryCards.tsx`: `KpiCard` 그리드 — finalAsset/totalReturnRate/cagr/mdd/tradeCount/cycleCount
- `BacktestWarnings.tsx`: warnings 배열을 `--warn`/`--warn-bg` 토큰 안내 박스로 나열

### `shared/ui/EquityLineChart.tsx` (신규 승격, 기존 리팩토링 포함)
- `widgets/stats-overview/EquityCurveChart.tsx`에서 recharts `LineChart` + axis + tooltip + principal/asset 라인 렌더링 부분만 추출한 순수 프레젠테이션 컴포넌트. props: `rows: { date: string; asset: number; principal: number }[]`
- 범위 토글(`RangeKey`)·전략타입 필터(`StrategyTypeFilterToggle`) 등 stats 전용 UI는 추출하지 않고 `widgets/stats-overview/EquityCurveChart.tsx`에 그대로 남긴다
- `EquityCurveChart.tsx`는 이 컴포넌트를 감싸는 얇은 wrapper로 리팩토링 — 렌더링 로직 중복 제거
- `widgets/backtest`는 `BacktestResponse.points`를 `{date, asset: totalAsset, principal}`로 매핑해 그대로 소비

## 데이터 흐름

1. 사용자가 폼 입력 → "실행" 클릭
2. `BacktestCommand` 조립 → `useBacktestQuery`의 `refetch()` 호출
3. 로딩 중: 제출 버튼 스피너(`StrategyForm` 패턴 재사용, 결과 영역은 이전 결과 유지 또는 최초 상태)
4. 성공: `BacktestSummaryCards` + `EquityLineChart` + `BacktestWarnings` 렌더
5. 실패: `ApiError.message`(서버 400 한글 메시지)를 폼 상단 고정 텍스트로 표시(토스트 아님 — "현재 상태 경고"는 고정 텍스트 규칙)

## 에러 처리

- 400(검증 실패): 서버 메시지 그대로 표시
- 그 외(5xx/네트워크): 공용 에러 문구("백테스트 실행에 실패했습니다. 잠시 후 다시 시도해주세요")
- 401: 전역 `clientFetch` 처리(로그아웃)에 위임 — 별도 처리 불필요

## 테스트

- `useBacktestForm`: 타입 전환 시 필드 초기화, `submitDisabledReason` 케이스
- `entities/backtest/api`: 쿼리스트링 빌더 테스트
- `EquityLineChart` 추출에 따른 `EquityCurveChart` 기존 테스트 회귀 확인
- E2E는 로컬 kista-api 필요(현재 세션 제약)로 생략 — `npm run typecheck` + 프로덕션 빌드로 검증
