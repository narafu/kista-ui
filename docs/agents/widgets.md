# widgets/ — 페이지 합성 단위

페이지를 구성하는 독립 UI 블록. `features/`, `entities/`, `shared/`를 import 가능하며 `app/` 라우트 페이지에서 직접 사용하는 최상위 UI 단위다.

## 의존성 규칙

```text
widgets/{slice}  ->  features/  ->  entities/  ->  shared/
```

widget 슬라이스끼리 cross-import 금지. **단, "공용 UI 위젯" 목록(kpi-card, revealable-value, theme-toggle, page-header 등)은 다른 widget에서 import 허용** (조합 위젯의 구성 요소로 사용). 이외 페이지 위젯을 조합해야 하면 `app/` 페이지에서 처리.

## 대표 슬라이스

- 페이지 위젯: `admin-user-list`, `admin-trade-list`, `admin-privacy-trade-list`, `all-strategies`, `dashboard`, `account-detail`, `accounts-grid`, `strategy-detail`, `strategy-list`, `cycle-history`, `fear-greed-card`, `market-holiday-calendar`, `error-display`
- 공용 UI 위젯: `layout`, `account-card`, `strategy-card`, `kpi-card`, `revealable-value`, `glass-card`, `page-header`, `theme-toggle`, `timeline`, `pull-to-refresh`
- shared/ui로 이동됨: `stepper`, `percent-gauge` (도메인 무관 UI 컴포넌트로 분류)

## shadcn / UI 컴포넌트

- **shadcn v4**: `asChild` 대신 `cn(buttonVariants({ variant, size }))` 패턴 사용
- **AlertDialog**: `open`/`onOpenChange` 직접 제어 필요
- **disabled 버튼 툴팁**: wrapper `div` + `group-hover` 패턴 사용
- **vaul Drawer**: `direction="bottom"`, 내부 스크롤 래퍼 필요

## CSS 토큰 · 스타일링

- `--warn`, `--warn-bg`, `--status-ok`, `--status-ok-bg`, `--status-error` 계열 토큰 사용
- 손익/상태 액센트는 CSS 토큰 기반 인라인 style 사용 가능
- 거래내역 테이블 헤더는 전용 클래스 패턴 유지
- 로즈골드/다크모드 gradient는 `globals.css` 오버라이드 기준으로 맞춘다

## 반응형 · 레이아웃

- `style={{ display: ... }}`는 반응형 클래스를 깨뜨리므로 금지
- 커스텀 반응형 그리드는 `globals.css` 정의 클래스 사용
- AuthLayout에서 flex 자식 수축 이슈에 주의
- 이벤트 핸들러가 있으면 `'use client'` 선언 필요

## 컴포넌트 설계 패턴

- 인터랙션 추가 시 Client Component를 분리하고 페이지 전체를 `'use client'`로 바꾸지 않는다
- 서버 계산 값 갱신은 `queryClient.invalidateQueries`와 `router.refresh()`를 함께 고려한다
- `router.refresh()` 후 prop/state 재동기화가 필요하면 `useEffect` 패턴을 사용한다
- "방금 동작 결과"는 toast, "현재 상태 경고"는 고정 텍스트로 남긴다
- 독립 API 호출은 try/catch를 분리한다
- JSX 내 IIFE 금지

## 주요 슬라이스 quirk

- **`account-detail`**: `TradesTab`은 `useReducer` + `CycleHistoryTable` 조합
- **`cycle-history`**: 계좌/전략 양쪽에서 공유
- **`strategy-detail`**: `useStrategyOrderPreviewQuery(strategyId)` 사용, 분할/리버스모드 배지 규칙 고정. VR은 `strategy.vr` 존재 여부로 V값, 밴드 폭, pool 상한, G를 표시한다. `divisionCounts.length === 0`을 PRIVACY로 단정하지 않는다
- **`strategy-card`**: VR은 분할 배지 대신 compact `V $3,000.00` 형식의 배지를 표시한다
- **`kpi-card`**: `<KpiCard />` 그리드 패턴 유지
- **`revealable-value`**: 마스킹 값 공개 토글
- **`all-strategies`**: `useAllStrategiesQuery(initialStrategies)` 초기 데이터 패턴
- **`admin-user-list`**: 이상감지 카드는 `AdminAnomalies { pausedAccounts, inactiveAccounts }`
- **`market-holiday-calendar/WeeklyMarketCalendar`**: 주간/월간 데이터를 여러 쿼리로 조합
- **`glass-card`**, **`pull-to-refresh`**, **`layout/DesktopSidebar`**: 일부 CSS 토큰/동적 계산 인라인 style 유지
