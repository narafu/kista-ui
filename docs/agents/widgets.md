# widgets/ — 페이지 합성 단위

페이지를 구성하는 독립 UI 블록. `features/`, `entities/`, `shared/`를 import 가능하며 `app/` 라우트 페이지에서 직접 사용하는 최상위 UI 단위다.

## 의존성 규칙

```text
widgets/{slice}  ->  features/  ->  entities/  ->  shared/
```

widget 슬라이스끼리 cross-import 금지. **단, 아래 "공용 UI 위젯" 화이트리스트에 명시된 슬라이스만 다른 widget에서 import 허용** (조합 위젯의 구성 요소·재사용 리스트로 사용). 화이트리스트는 아래 목록으로 **닫혀 있다** — "등"으로 임의 확장하지 않는다. 목록에 없는 페이지 위젯을 조합해야 하면 widget끼리 import하지 말고 `app/` 라우트 페이지에서 slot으로 합성한다(하위 위젯은 `ReactNode` prop으로 주입).

화이트리스트에 리스트형 위젯(`account-card`, `strategy-card`, `cycle-history`, `strategy-list`)이 포함되는 근거: 이들은 특정 페이지 전용이 아니라 여러 상위 위젯(예: `account-detail` 탭이 `strategy-list`·`cycle-history`를, `accounts-grid`가 `account-card`를)에서 재사용되는 표시 단위다.

화이트리스트 밖 조합이 필요했던 사례: `widgets/dashboard`가 과거 `market-holiday-calendar`·`fear-greed-card`를 직접 import하던 2건은 `app/(main)/dashboard` 페이지의 slot 합성(`marketPanels: ReactNode`)으로 이관해 해소했다 — 새 조합 위젯도 화이트리스트 밖 페이지 위젯이 필요하면 widget 간 import 대신 이 패턴(부모 위젯이 `ReactNode` slot prop을 받고 `app/` 라우트가 하위 위젯을 조립)을 따른다.

## 대표 슬라이스

페이지 위젯 목록은 `ls widgets/`로 확인한다. cross-import는 원칙적으로 금지되며, 아래 화이트리스트만 예외다.

- 공용 UI 위젯 (cross-import 허용 화이트리스트, 닫힌 목록): `layout`, `page-header`, `kpi-card`, `revealable-value`, `glass-card`, `theme-toggle`, `timeline`, `pull-to-refresh`, `account-card`, `strategy-card`, `cycle-history`, `strategy-list`
- `stepper`·`percent-gauge`·`SectionError`는 도메인 무관 UI로 `shared/ui`에 있다 (이동 배경 → `docs/agents/shared.md`)

## shadcn / UI 컴포넌트

- **shadcn v4**: `asChild` 대신 `cn(buttonVariants({ variant, size }))` 패턴 사용
- **Base UI Select**: `items` prop을 사용할 때 각 항목에 `value`와 표시용 `label` 메타데이터를 함께 제공한다
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
- 가변 서버 상태와 계산 값은 `docs/agents/entities.md`에 따라 직접 cache write 또는 key factory 기반 invalidate로 동기화한다. routine mutation 성공 시 `router.refresh()`를 사용하지 않는다
- `router.refresh()`는 명시적 pull-to-refresh와 SSE provider 예외에만 허용한다. 예외의 rationale과 종료 조건은 `docs/agents/shared.md` 참고
- "방금 동작 결과"는 toast, "현재 상태 경고"는 고정 텍스트로 남긴다
- 독립 API 호출은 try/catch를 분리한다
- JSX 내 IIFE 금지
- **아이콘 전용 버튼 44px 히트영역**: `shared/ui/IconButton.tsx` 사용 (`<button>` 전용, `aria-label` 필수 prop). `<Link>`로 아이콘 버튼을 구현해야 하는 경우 IconButton 미사용 — 같은 파일이 export하는 `ICON_LINK_GHOST_CLASS`를 그대로 가져다 쓴다(직접 클래스 문자열을 손으로 다시 이어 붙이지 않는다 — 과거 그렇게 했다가 스타일이 드리프트한 사례가 있어 export로 전환됨)

## 주요 슬라이스 quirk

- **`account-detail`**: `TradesTab`은 `useReducer` + `CycleHistoryTable` 조합
- **`accounts-grid`**: `/accounts` 페이지는 Server Component에서 계좌/계좌별 전략을 prefetch+hydrate하고, `AccountsPageContent`가 `useAccountsQuery()` 캐시 기준으로 EmptyState/`AccountsGrid`를 전환한다. `AccountsGrid`는 `accounts`만 받고 각 `AccountCard`가 canonical 계좌별 전략 query를 소비한다
- **`dashboard`**: `/dashboard`는 비회원도 접근 가능한 유일한 `(main)` 경로다(`proxy.ts`의 `PROTECTED_PREFIXES`에 없음). `app/(main)/dashboard/page.tsx`가 `isAuthenticated`(`!!token && !isJwtExpired(token)`)를 계산해 `DashboardContent`·`WeeklyMarketCalendar`에 prop으로 내려주고, 계좌 목록과 휴장일(`monthlyHolidaysQueryOptions`)을 인증 시에만 prefetch+hydrate한다. `DashboardContent`는 `isAuthenticated`가 false면 `useAccountsQuery({ enabled: false })`로 조회 자체를 막고 바로 `DashboardEmpty`를 렌더한다 — 게이팅 없이 게스트가 401을 맞으면 `clientFetch`의 전역 401 처리(리프레시 실패 시 로그아웃 후 리로드)가 무한 루프에 빠진다. `WeeklyMarketCalendar`도 같은 이유로 `isAuthenticated` prop을 받아 `useAccountsQuery({ enabled: isAuthenticated })`를 호출한다(`accountIds` 자체는 여전히 prop이 아니라 캐시에서 직접 파생). `WeeklyMarketCalendar`·`FearGreedSection`은 `widgets/dashboard`가 직접 import하지 않는다 — 페이지가 `marketPanels`(ReactNode) slot으로 조립해 `DashboardContent → DashboardEmpty`/`DashboardOverview`로 그대로 흘려보낸다
- **`cycle-history`**: 계좌/전략 양쪽에서 공유
- **`strategy-detail`**: `useStrategyOrderPreviewQuery(strategyId)` 사용, 분할/리버스모드 배지 규칙 고정. VR은 `strategy.vr` 존재 여부로 운용 방식(적립식/거치식/인출식 + 금액), 밴드 폭, 주기, G, V, pool(현재 시작금액), pool 상한을 표시한다. `divisionCounts.length === 0`을 PRIVACY로 단정하지 않는다. `isScheduledStart(strategy)`가 true(시작예정일이 미래)면 상태 배지 그룹에 "N월 N일 시작예정" 배지(`--info`/`--info-bg` 토큰) 추가. 주문 내역의 방향·유형·상태 Select는 모바일에서 동일 너비 3열, PC에서 한 행으로 배치해 가로 넘침을 만들지 않는다. 필터는 기간 조회 결과에 AND 조건으로 적용한 뒤 페이지네이션하며, 필터 변경 시 1페이지로 초기화하고 원본 주문 없음과 필터 결과 없음을 서로 다른 빈 상태로 표시한다
- **`strategy-card`**: VR은 분할 배지 대신 compact `V $3,000.00` 형식의 배지를 표시한다. 왼쪽 변은 전략 활성 상태 색상, 위/오른쪽/아래 변은 당일 PLANNED 주문(녹색) 또는 예수금 부족(장 개시 전 주황, `marketSession=DIRECT` 이후 빨강)을 표시한다. `isScheduledStart(strategy)`면 배지 행(모바일 1행·PC 배지 row)에 "N월 N일 시작예정" 배지 추가 — `AccountCard`의 compact 배지 행에는 넣지 않는다(혼잡 방지)
- **`kpi-card`**: `<KpiCard />` 그리드 패턴 유지
- **`revealable-value`**: 마스킹 값 공개 토글
- **`all-strategies`**: Server Component가 전체 전략과 계좌 목록을 prefetch+hydrate하고 `AllStrategiesList`가 인자 없는 `useAllStrategiesQuery()`와 `useAccountsQuery()`를 canonical cache source로 소비한다
- **`stats-overview`**: `/stats` 페이지(통계 메뉴의 "성과" 탭) 전용, 위젯 내부에는 별도 탭 없이 운용 통계만 표시한다. 전략 유형 비교와 사이클 성과는 `sm` 이상에서 열 헤더가 있는 실제 `table` 마크업, `sm` 미만에서 명시적인 라벨-값 요약 행으로 표시한다. 각 섹션의 데스크탑/모바일 표현은 같은 조회·페이지네이션 상태를 공유한다. 누적 자산 추이 상단의 전략 타입 탭은 누적 자산 추이와 사이클 성과에만 적용하고, 전략 유형 비교는 비교 목적상 항상 전체 타입 집계를 표시하며 사이클 성과 아래에 배치한다. 사이클 성과는 계좌/전략/종목/기간/손익/수익률을 표시하고(데스크탑은 계좌·전략 컬럼 분리, 가운데 정렬), 미종료 상태는 기간 값의 `진행 중` 텍스트로만 노출한다
- **`benchmark-comparison`**: `/stats/benchmark` 페이지(통계 메뉴의 "벤치마크" 탭) 전용. 진입점은 `HousingBenchmarkComparison` — ETF/아파트(HOUSING) 두 자산 유형을 `benchmarkType` 판별 유니온으로 함께 처리하며, 파일명은 아파트 벤치마크가 먼저 추가된 이력 때문에 `Housing~` 접두사이지만 ETF도 포괄한다. ETF 벤치마크 자산 선택지는 `runtime-config`의 `benchmarks.etf`를 우선 사용하고, 미등록 심볼은 사용자 설정 ETF로 표시한다
  - **규모 비교 축(investment vs. benchmark)**: `BenchmarkFilterBar.tsx` + `model/useBenchmarkFilters.ts`가 자산 탭(ETF/HOUSING)·전략 선택·기간·(HOUSING이면) `regionCode` 기반 지역 선택을 하나의 필터 상태로 통합 관리한다. 전략 선택은 3상태(전체/없음/개별 전략)이며 기본값은 "전체"(`useState('ALL')`)라 첫 진입 시에도 비교가 정상 수행된다 — 비교를 생략하는 조건은 "없음"(`NONE`)을 명시적으로 고른 경우뿐(`canQuery = !(selection === 'NONE')`). 이때는 `HousingPriceIndexChart.tsx`(아파트 주간 매매가격지수)/`EtfPriceChart.tsx`(ETF 일별 종가)가 CAGR 배지를 포함한 원본 시세만 보여준다. 그 외(전체/개별)에는 `HousingBenchmarkChart`/`HousingBenchmarkSummary`가 투자 대비 비교 결과를 표시한다
  - **5분위(quintile) 원본 섹션 — 별도 이원 구조**: `HousingBenchmarkQuintileTrendChart`(5분위 매매평균가 원본 추이)와 `HousingBenchmarkRegionQuintileInfo`(선택 지역 5분위 안내)는 위 regionCode 비교 축과 독립적으로 `HousingBenchmarkComparison.tsx` 안에 여전히 마운트돼 있다 — HOUSING 탭에서만, 상단 "비교 기간" 필터의 from/to를 그대로 공유하지만 investment 데이터·전략 선택과는 무관하게 항상 렌더링된다. 즉 이 위젯은 "regionCode 기반 투자-벤치마크 비교"와 "5분위 원본 시계열 참고자료"라는 목적이 다른 두 섹션을 한 페이지에 함께 갖고 있다 — 신규 작업자는 어느 컴포넌트가 어느 축인지 파일명으로 구분한다(`HousingPriceIndexChart`/`EtfPriceChart`/`HousingBenchmarkChart`=비교 축, `HousingBenchmarkQuintileTrendChart`/`HousingBenchmarkRegionQuintileInfo`=5분위 원본 축)
- **`admin-user-list`**: 이상감지 카드는 `AdminAnomalies { pausedAccounts, inactiveAccounts }`
- **`market-holiday-calendar/WeeklyMarketCalendar`**: 주간/월간 데이터를 여러 쿼리로 조합
- **`/finance`(가계부) 페이지 탭 구조**: `app/(main)/finance/FinanceDashboard.tsx`가 자산/수입/소비/저축/설정 5탭(`AssetTab = 'investment'|'income'|'expense'|'saving'|'settings'`, 2026-08부터 `investment`가 첫 탭)을 소유한다. 아래 5개 자산 위젯(`AssetOverview` 등)은 `investment`(자산) 탭에서만 렌더링되고, `NewAssetButton`도 `investment` 탭에서만 노출된다. `settings` 탭은 `widgets/asset-settings/AssetSettingsPanel`을 렌더한다(예산 관리 카드는 2026-08 제거 — 아래 참고). `investment` 탭의 `AssetTrend`(월별 추이)·`AssetComposition`(월별 구성비)은 모바일에서 구성비가 먼저 보이도록 `order-*` 유틸리티로 순서를 뒤집고 PC(`lg:`)에서는 추이-구성비 순서를 유지한다. 수입/소비/저축 3탭은 `widgets/finance-summary`·`widgets/finance-budget-progress`(2026-08부터 INCOME/EXPENSE/SAVING 전부 허용, 셋 다 예산 대비 렌더)·`widgets/finance-trend`·`widgets/finance-record-list`를 이 순서로, `type: FinanceCategoryType` prop 하나로 재사용한다(탭별 전용 위젯을 만들지 않는다) — 세부 데이터 흐름(12개월 윈도우 쿼리·카테고리 인덱스)은 `docs/agents/entities.md`의 finance 항목 참고. 기간 상태(`Period = {month, mode}`)와 12개월 윈도우 조회는 `investment` 탭의 `selectedMonth`와 별개로 `FinanceDashboard`가 소유하고 위젯들에 props로 내려보낸다(위젯 cross-import 금지 규칙에 따른 동일한 해법). PageHeader actions에는 `income`/`expense`/`saving` 탭에서 `features/finance/manage-budgets`의 `BudgetManagerDialog`("예산등록" 버튼, 해당 탭 type 고정)와 `NewTransactionButton`(`features/finance/save-transaction`, "내역등록")이 나란히 노출된다(`NewAssetButton`은 `investment` 탭 전용으로 그대로 유지)
- **`asset-overview`/`asset-trend`/`asset-composition`/`asset-record-check`/`asset-record-list`**: 위 `investment` 탭을 구성하는 5개 슬라이스. 위젯끼리 cross-import가 금지돼 있고 Server Component는 함수를 prop으로 넘길 수 없어, `asset-overview`(월 선택 UI)와 `asset-record-check`(선택된 월 기준 점검)가 공유하는 "기준 월" 상태는 `FinanceDashboard.tsx`(app 레이어의 client 부모)가 소유하고 각 위젯에 `month`/`onMonthChange` prop으로 흘려보낸다 — `market-holiday-calendar`류의 `marketPanels` slot 패턴과 같은 이유의 같은 해법이다. `asset-trend`(recharts LineChart)·`asset-composition`(recharts 스택 BarChart ×2)은 각각 Shell + `next/dynamic({ ssr: false })` Inner 분리 구조이며, `react-doctor/prefer-dynamic-import` 룰은 파일 간 도달 가능성을 보지 않고 recharts 정적 import를 항상 감지하므로 기존 recharts 위젯과 동일하게 `// eslint-disable-next-line react-doctor/prefer-dynamic-import`를 import 직전 줄에 둔다(설명 주석은 disable 지시문보다 앞에 — 지시문과 import 사이에 다른 줄이 끼면 타겟팅이 깨진다). 두 Shell 모두 모바일 순서 뒤집기용 `className` prop을 받아 `Card`에 전달한다. 순자산·카테고리별/자산군별 현황·구성비 계산은 전부 `entities/finance/lib/aggregate.ts`의 순수 함수를 공유한다(위젯 계층에 중복 구현 금지). `assetClass`/`market`은 서버 닫힌 enum이라 라벨은 `useMeta()`의 `labelOf('assetClasses'|'markets', code)`로 얻고, L1 카테고리 라벨은 `formatAssetL1CategoryLabel(id)`로 얻는다(위젯에서 직접 라벨 맵을 두지 않는다)
- **`asset-settings/AssetSettingsPanel`**: `/finance` 설정 탭의 조합 위젯. `features/finance/manage-categories`(카테고리 CRUD)·`manage-accounts`(계좌 CRUD)·`manage-strategy-suggestions`(운용전략 추천 목록, ADMIN 전용 — 계좌관리 아래)·`manage-group`(그룹 전환·멤버·초대)을 `SettingsPageContent`와 동일한 "Surface 카드로 묶기" 패턴으로 나열한다. 화이트리스트 밖 페이지 위젯이라 다른 widget에서 import 금지 — `FinanceDashboard.tsx`(app 레이어)만 마운트한다
- **`glass-card`**, **`pull-to-refresh`**, **`layout/DesktopSidebar`**: 일부 CSS 토큰/동적 계산 인라인 style 유지
- **`glass-card/GlassCard`**: `topBar` prop(ReactNode) — 로그인/pending/rejected 등 인증 흐름 페이지 좌상단 로고+우상단 액션(로그아웃 등)을 `justify-between` 오버레이 행으로 배치. 컴패니언 `BrandWordmark`(로고+워드마크)와 함께 사용 (`app/pending/page.tsx`, `app/rejected/page.tsx` 참고). 배경은 `brand-radial-bg` 클래스(`globals.css`) 고정 적용
