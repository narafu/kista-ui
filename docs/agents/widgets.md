# widgets/ — 페이지 합성 단위

페이지를 구성하는 독립 UI 블록. `features/`, `entities/`, `shared/`를 import 가능하며 `app/` 라우트 페이지에서 직접 사용하는 최상위 UI 단위다.

## 의존성 규칙

```text
widgets/{slice}  ->  features/  ->  entities/  ->  shared/
```

widget 슬라이스끼리 cross-import 금지. **단, "공용 UI 위젯" 목록(kpi-card, revealable-value, theme-toggle, page-header 등)은 다른 widget에서 import 허용** (조합 위젯의 구성 요소로 사용). 이외 페이지 위젯을 조합해야 하면 `app/` 페이지에서 처리.

## 대표 슬라이스

- 페이지 위젯: `admin-user-list`, `admin-trade-list`, `admin-log-list`, `admin-privacy-trade-list`, `all-strategies`, `dashboard`, `account-detail`, `accounts-grid`, `strategy-detail`, `strategy-list`, `cycle-history`, `fear-greed-card`, `market-holiday-calendar`, `stats-overview`, `benchmark-comparison`, `error-display`
- 공용 UI 위젯: `layout`, `account-card`, `strategy-card`, `kpi-card`, `revealable-value`, `glass-card`, `page-header`, `theme-toggle`, `timeline`, `pull-to-refresh`
- shared/ui로 이동됨: `stepper`, `percent-gauge`, `SectionError` (도메인 무관 UI 컴포넌트로 분류. `SectionError`는 `stats-overview`·`benchmark-comparison` 양쪽에서 쓰여 cross-widget import를 피하려 이동)

## shadcn / UI 컴포넌트

- **shadcn v4**: `asChild` 대신 `cn(buttonVariants({ variant, size }))` 패턴 사용
- **AlertDialog**: `open`/`onOpenChange` 직접 제어 필요. `AlertDialogTrigger`에 `disabled` prop 없음 → `className`에 `opacity-40 pointer-events-none`
- **disabled 버튼 툴팁**: wrapper `div` + `group-hover` 패턴 사용
- **vaul Drawer**: `direction="bottom"`, 내부 스크롤 래퍼 필요

## CSS 토큰 · 스타일링

- `--warn`, `--warn-bg`, `--status-ok`, `--status-ok-bg`, `--status-error`/`--status-error-bg` 계열 토큰 사용
- **시맨틱 토큰 용도**: `--info`/`--info-bg`(대기·일반 정보성 상태 — 사이클 시드 MAX, 주문 PLACED/LOC 등) · `--admin-fg`/`--admin-bg`(관리자 전용 액센트, 골드 계열 — violet/indigo 하드코딩 대체) · `--status-error`/`--status-error-bg`(실패·에러, FAILED 배지 등). 셋 다 라이트·다크 값 `globals.css`에 정의됨
- `--gold`는 다크 오버라이드 존재(`.dark { --gold: ... }`) — 휴장 표시 등 라이트 전용 골드값을 다크에서 그대로 쓰지 않는다
- 손익/상태 액센트는 CSS 토큰 기반 인라인 style 사용 가능
- 거래내역 테이블 헤더는 전용 클래스 패턴 유지
- 로즈골드/다크모드 gradient는 `globals.css` 오버라이드 기준으로 맞춘다
- **`.reveal-stagger`**: 컨테이너에 부여 시 직계 자식이 `revealUp` 키프레임으로 순차 페이드업(`nth-child(1~5)` 개별 delay, `n+6`은 동일 delay로 묶임 — 직계 자식 5개 이하 컨테이너에서 가장 효과적). `prefers-reduced-motion: reduce`에서 애니메이션 비활성화 자동 처리. 페이지 최초 진입(첫 페인트) 같은 고임팩트 순간에만 사용 — 남용 금지

## 반응형 · 레이아웃

- `style={{ display: ... }}`는 반응형 클래스를 깨뜨리므로 금지
- 커스텀 반응형 그리드는 `globals.css` 정의 클래스 사용
- AuthLayout에서 flex 자식 수축 이슈에 주의
- 이벤트 핸들러가 있으면 `'use client'` 선언 필요

## 컴포넌트 설계 패턴

- 인터랙션 추가 시 Client Component를 분리하고 페이지 전체를 `'use client'`로 바꾸지 않는다
- 가변 서버 상태와 계산 값은 `docs/agents/cache-policy.md`에 따라 직접 cache write 또는 key factory 기반 invalidate로 동기화한다. routine mutation 성공 시 `router.refresh()`를 사용하지 않는다
- `router.refresh()`는 명시적 pull-to-refresh와 SSE provider 예외에만 허용한다. 예외의 rationale과 종료 조건은 `docs/agents/cache-policy.md` 참고
- "방금 동작 결과"는 toast, "현재 상태 경고"는 고정 텍스트로 남긴다
- 독립 API 호출은 try/catch를 분리한다
- JSX 내 IIFE 금지
- **아이콘 전용 버튼 44px 히트영역**: `shared/ui/IconButton.tsx` 사용 (`<button>` 전용, `aria-label` 필수 prop). `<Link>`로 아이콘 버튼을 구현해야 하는 경우 IconButton 미사용 — 동일한 `size-11 rounded-lg` 클래스 패턴을 직접 replicate

## 주요 슬라이스 quirk

- **`account-detail`**: `TradesTab`은 `useReducer` + `CycleHistoryTable` 조합
- **`accounts-grid`**: `/accounts` 페이지는 Server Component에서 계좌/전략을 prefetch+hydrate하고, `AccountsPageContent`가 `useAccountsQuery()` 캐시 기준으로 EmptyState/`AccountsGrid`를 전환한다. `AccountsGrid`의 `strategiesByAccount`는 선택 prop이다
- **`dashboard`**: `/dashboard` 페이지는 계좌 목록을 prefetch+hydrate하고, `DashboardContent`가 `useAccountsQuery()` 캐시 기준으로 `DashboardEmpty`/`DashboardOverview`를 전환한다
- **`cycle-history`**: 계좌/전략 양쪽에서 공유
- **`strategy-detail`**: `useStrategyOrderPreviewQuery(strategyId)` 사용, 분할/리버스모드 배지 규칙 고정. VR은 `strategy.vr` 존재 여부로 운용 방식(적립식/거치식/인출식 + 금액), 밴드 폭, 주기, G, V, pool(현재 시작금액), pool 상한을 표시한다. `divisionCounts.length === 0`을 PRIVACY로 단정하지 않는다. `isScheduledStart(strategy)`가 true(시작예정일이 미래)면 상태 배지 그룹에 "N월 N일 시작예정" 배지(`--info`/`--info-bg` 토큰) 추가
- **`strategy-card`**: VR은 분할 배지 대신 compact `V $3,000.00` 형식의 배지를 표시한다. 왼쪽 변은 전략 활성 상태 색상, 위/오른쪽/아래 변은 당일 PLANNED 주문(녹색) 또는 예수금 부족(장 개시 전 주황, `marketSession=DIRECT` 이후 빨강)을 표시한다. `isScheduledStart(strategy)`면 배지 행(모바일 1행·PC 배지 row)에 "N월 N일 시작예정" 배지 추가 — `AccountCard`의 compact 배지 행에는 넣지 않는다(혼잡 방지)
- **`kpi-card`**: `<KpiCard />` 그리드 패턴 유지
- **`revealable-value`**: 마스킹 값 공개 토글
- **`all-strategies`**: `useAllStrategiesQuery(initialStrategies)` 초기 데이터 패턴
- **`stats-overview`**: `/stats` 페이지 전용, 탭 없이 운용 통계만 표시한다. 전략 유형 비교와 사이클 성과는 `sm` 이상에서 열 헤더가 있는 실제 `table` 마크업, `sm` 미만에서 명시적인 라벨-값 요약 행으로 표시한다. 각 섹션의 데스크탑/모바일 표현은 같은 조회·페이지네이션 상태를 공유한다. 누적 자산 추이 상단의 전략 타입 탭은 누적 자산 추이와 사이클 성과에만 적용하고, 전략 유형 비교는 비교 목적상 항상 전체 타입 집계를 표시하며 사이클 성과 아래에 배치한다. 사이클 성과는 전략/종목/기간/손익/수익률만 표시하고, 미종료 상태는 기간 값의 `진행 중` 텍스트로만 노출한다
- **`benchmark-comparison`**: `/benchmark` 페이지 전용(별도 최상위 메뉴, `/stats`의 하위 탭 아님). 진입점은 `HousingBenchmarkComparison` — ETF/아파트(HOUSING) 두 자산 유형을 `benchmarkType` 판별 유니온으로 함께 처리하며, 파일명은 아파트 벤치마크가 먼저 추가된 이력 때문에 `Housing~` 접두사이지만 ETF도 포괄한다. ETF 벤치마크 자산 선택지는 `runtime-config`의 `benchmarks.etf`를 우선 사용하고, 미등록 심볼은 사용자 설정 ETF로 표시한다
- **`admin-user-list`**: 이상감지 카드는 `AdminAnomalies { pausedAccounts, inactiveAccounts }`
- **`market-holiday-calendar/WeeklyMarketCalendar`**: 주간/월간 데이터를 여러 쿼리로 조합
- **`glass-card`**, **`pull-to-refresh`**, **`layout/DesktopSidebar`**: 일부 CSS 토큰/동적 계산 인라인 style 유지
- **`glass-card/GlassCard`**: `topBar` prop(ReactNode) — 로그인/pending/rejected 등 인증 흐름 페이지 좌상단 로고+우상단 액션(로그아웃 등)을 `justify-between` 오버레이 행으로 배치. 컴패니언 `BrandWordmark`(로고+워드마크)와 함께 사용 (`app/pending/page.tsx`, `app/rejected/page.tsx` 참고). 배경은 `brand-radial-bg` 클래스(`globals.css`) 고정 적용
