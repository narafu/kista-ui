# widgets/ — 페이지 합성 단위

페이지를 구성하는 독립 UI 블록. `features/`, `entities/`, `shared/`를 import 가능하며 `app/` 라우트 페이지에서 직접 사용하는 최상위 UI 단위다.

- **가계부(finance) 작업 시 docs/agents/finance.md 필수 Read** — 관련: `/finance` 탭 구조, `asset-overview`, `asset-trend`, `asset-composition`, `asset-record-check`, `asset-record-list`, `asset-settings/AssetSettingsPanel`, `FinanceHeader`, `use-amount-hidden`
- **전략·DCA·크립토·브로커 분기 작업 시 docs/agents/strategy.md 필수 Read** — 관련: `strategy-card`, `strategy-detail`, `computeOrderReadiness`, `isScheduledStart`, DCA 분기(`DCA_MANUAL_EXECUTION_UNSUPPORTED`), `dca-executions`

## 의존성 규칙

```text
widgets/{slice}  ->  features/  ->  entities/  ->  shared/
```

widget 슬라이스끼리 cross-import 금지. **단, 아래 "대표 슬라이스"의 화이트리스트에 명시된 슬라이스만 다른 widget에서 import 허용**한다. 목록은 **닫혀 있다** — "등"으로 임의 확장하지 않는다. 목록에 없는 페이지 위젯을 조합해야 하면 widget끼리 import하지 말고 `app/` 라우트 페이지에서 slot으로 합성한다(하위 위젯은 `ReactNode` prop으로 주입).

화이트리스트에 리스트형 위젯(`account-card`, `strategy-card`, `cycle-history`, `strategy-list`)이 포함되는 근거: 이들은 특정 페이지 전용이 아니라 여러 상위 위젯(예: `account-detail` 탭이 `strategy-list`·`cycle-history`를, `accounts-grid`가 `account-card`를)에서 재사용되는 표시 단위다.

화이트리스트 밖 페이지 위젯이 필요하면(예: `dashboard`의 `marketPanels: ReactNode`) widget 간 import 대신 `app/` 라우트가 하위 위젯을 조립하고 부모 위젯은 `ReactNode` slot prop만 받는다. 자식이 부모 내부 상태(데이터)를 필요로 해서 순수 `ReactNode` slot으로는 부족한 경우, `ReactNode`를 반환하는 콜백 prop을 slot으로 쓰는 변형도 같은 원칙의 연장이다 — `benchmark-comparison`/`housing-quintile-trend`(`app/(main)/stats/benchmark/BenchmarkPageContent.tsx`)의 `renderHousingExtras` 참고.

## 대표 슬라이스

페이지 위젯 목록은 `ls widgets/`로 확인한다.

- cross-import 허용 화이트리스트(공용 UI 위젯): `layout`, `page-header`, `kpi-card`, `revealable-value`, `glass-card`, `theme-toggle`, `timeline`, `pull-to-refresh`, `account-card`, `strategy-card`, `cycle-history`, `strategy-list`
- `stepper`·`SectionError`는 도메인 무관 UI로 `shared/ui`에 있다 (이동 배경 → `docs/agents/shared.md`)

## shadcn / UI 컴포넌트

- **shadcn v4**: `asChild` 대신 `cn(buttonVariants({ variant, size }))` 패턴 사용. raw `<button>`에 색·높이를 직접 지정하지 않는다 — variant/size 체계와 사용 기준은 `docs/agents/shared.md` "CTA 버튼 위계"
- **Base UI Select**: `items` prop을 사용할 때 각 항목에 `value`와 표시용 `label` 메타데이터를 함께 제공한다
- **AlertDialog**: `open`/`onOpenChange` 직접 제어 필요. 모달 트리거의 `disabled` 처리는 `docs/agents/a11y.md` 참고
- **disabled 버튼 툴팁**: wrapper `div` + `group-hover` 패턴 사용

## CSS 토큰 · 스타일링

- `--warn`, `--warn-bg`, `--status-ok`, `--status-ok-bg`, `--status-error`/`--status-error-bg` 계열 토큰 사용
- **시맨틱 토큰 용도**: `--info`/`--info-bg`(대기·일반 정보성 상태 — 사이클 투자금 MAX, 주문 PLACED/LOC 등) · `--admin-fg`/`--admin-bg`(관리자 전용 액센트, 골드 계열) · `--status-error`/`--status-error-bg`(실패·에러, FAILED 배지 등).
- `--gold`는 다크 오버라이드 존재(`.dark { --gold: ... }`) — 휴장 표시 등 라이트 전용 골드값을 다크에서 그대로 쓰지 않는다
- 거래내역 테이블 헤더는 전용 클래스 패턴 유지
- **테이블 정렬**: 열 헤더(`TableHeadCell`·`SortableHeadCell`)는 기본값 가운데 정렬이고 `text-right`/`text-left`로 덮어쓰지 않는다. 숫자 데이터 셀(`TableDataCell`)은 `text-right tabular-nums`로 자릿수를 맞추고, 그 열의 헤더는 `numeric` prop을 준다 — 헤더는 가운데 그대로 두고 열 폭만 내용에 맞게 좁힌다(`w-px whitespace-nowrap`, 숫자 데이터 셀도 `whitespace-nowrap`). 값까지 가운데면 길이가 다른 금액의 자릿수가 어긋난다. 열 폭을 퍼센트로 고정한 비교 표(`HousingBenchmarkSummary`)는 `w-px`와 충돌하므로 행 헤더·값을 모두 가운데 정렬(`tabular-nums` 유지)한다 — 값 길이가 비슷한 퍼센트라 자릿수 어긋남이 작다
- 로즈골드/다크모드 gradient는 `globals.css` 오버라이드 기준으로 맞춘다
- **`.reveal-stagger`**: 컨테이너에 부여 시 직계 자식이 `revealUp` 키프레임으로 순차 페이드업(`nth-child(1~5)` 개별 delay, `n+6`은 동일 delay로 묶임 — 직계 자식 5개 이하 컨테이너에서 가장 효과적). `prefers-reduced-motion: reduce`에서 애니메이션 비활성화 자동 처리. 페이지 최초 진입(첫 페인트) 같은 고임팩트 순간에만 사용 — 남용 금지

## 반응형 · 레이아웃

- 커스텀 반응형 그리드는 `globals.css` 정의 클래스 사용
- AuthLayout에서 flex 자식 수축 이슈에 주의

## 컴포넌트 설계 패턴

- 인터랙션 추가 시 Client Component를 분리하고 페이지 전체를 `'use client'`로 바꾸지 않는다
- "방금 동작 결과"는 toast, "현재 상태 경고"는 고정 텍스트로 남긴다
- JSX 내 IIFE 금지
- **아이콘 전용 버튼 44px 히트영역**: `shared/ui/IconButton.tsx` 사용 (`<button>` 전용, `aria-label` 필수 prop). `<Link>` 아이콘 버튼은 `ICON_LINK_GHOST_CLASS` 사용 — 상세는 `docs/agents/shared.md` ui 절

## 주요 슬라이스 quirk

- **`accounts-grid`**: `/accounts` 페이지는 Server Component에서 계좌/계좌별 전략을 prefetch+hydrate하고, `AccountsPageContent`가 `useAccountsQuery()` 캐시 기준으로 EmptyState/`AccountsGrid`를 전환한다. `AccountsGrid`는 `accounts`만 받고 각 `AccountCard`가 canonical 계좌별 전략 query를 소비한다. 증권사가 2곳 이상이면 `?broker=` 필터(SegmentedToggle)를 보이고, "더 보기" 개수는 필터 값으로 key를 바꿔 초기화한다
- **`dashboard`**: `/dashboard`는 비회원도 접근 가능한 유일한 `(main)` 경로다(`proxy.ts`의 `PROTECTED_PREFIXES`에 없음). `app/(main)/dashboard/page.tsx`가 `isAuthenticated`(`!!token && !isJwtExpired(token)`)를 계산해 `DashboardContent`·`WeeklyMarketCalendar`에 prop으로 내려주고, 휴장일(`monthlyHolidaysQueryOptions`, public 엔드포인트)은 항상, 계좌 목록은 인증 시에만 prefetch+hydrate한다. `DashboardContent`·`WeeklyMarketCalendar`는 `isAuthenticated` prop으로 계좌 쿼리를 게이팅한다(근거·루프 위험은 `docs/agents/architecture.md` 레이아웃 그룹). `CryptoMarketSection`(`widgets/crypto-market-indicators`, 김프·Coinbase 프리미엄·장기 밸류에이션(현물 줄) / 펀딩비·롱/숏 비율·OI(선물 줄) 종목 탭 안 카드 6개 + 탭 위 시장 전체 지표 줄(BTC 도미넌스·알트코인 시즌·Hash Ribbons, 셋 다 실패 시 숨김 — 종목 지표만 전부 실패하면 탭 자리에 안내) + 탭 밖 섹션 제목 줄 오른쪽의 BTC 반감기 요약(실패 시 숨김), kista-trading `GET /api/crypto-market-indicators`)은 공포탐욕지수처럼 비인증 공개 엔드포인트라 게이팅 없이 게스트에게도 보인다 — 시장 차트 아래 셋째 줄에 둔다(`bottomPanels` slot). `WeeklyMarketCalendar`·`FearGreedSection`·`CryptoMarketSection`은 `widgets/dashboard`가 직접 import하지 않는다 — 페이지가 `marketPanels`·`bottomPanels`(ReactNode) slot으로 조립해 `DashboardContent → DashboardEmpty`/`DashboardOverview`로 그대로 흘려보낸다. 시장 패널·차트는 `DashboardMarkets`가 PC·모바일 공용 트리 하나(`grid-cols-1 lg:grid-cols-3`)로 렌더한다 — `hidden lg:block`/`lg:hidden`으로 두 벌 마운트하면 차트 인스턴스·토글 상태가 중복되므로, 브레이크포인트별 내용이 실제로 다른 안내 카드·헤더만 분기한다. 계좌 조회 실패 시 `throw`하지 않고 `DashboardOverview`의 `notice`로 안내만 얹는다(Empty로 떨어지면 기존 사용자에게 첫 계좌 등록을 권하게 된다). 스켈레톤은 `DashboardSkeleton` 하나를 라우트 `loading.tsx`와 계좌 조회 대기가 공유한다
- **`cycle-history`**: 계좌/전략 양쪽에서 공유. `strategyType`이 DCA인 행은 `CycleHistoryTable`이 예수금을 표시하지 않는다
- **`kpi-card`**: `<KpiCard />` 그리드 패턴 유지
- **`revealable-value`**: 마스킹 값 공개 토글
- **`all-strategies`**: Server Component가 전체 전략과 계좌 목록을 prefetch+hydrate하고 `AllStrategiesList`가 인자 없는 `useAllStrategiesQuery()`와 `useAccountsQuery()`를 canonical cache source로 소비한다. 전략이 있는 계좌가 2개 이상이면 `?account=` 계좌 필터(계좌 목록 증권사 필터와 같은 SegmentedToggle, "별칭 개수")로 한 계좌 구역만 보여준다. 두 필터 모두 `shared/lib/hooks/use-search-param`(`history.replaceState`)으로 URL을 바꾼다 — `router.replace`는 동적 페이지의 서버 프리페치를 다시 돌린다. 알 수 없는 값은 전체로 본다
- **`stats-overview`**: `/stats` 페이지(통계 메뉴의 "성과" 탭) 전용, 위젯 내부에는 별도 탭 없이 운용 통계만 표시한다. 전략 유형 비교와 사이클 성과는 `lg` 이상에서 열 헤더가 있는 실제 `table` 마크업, `lg` 미만에서 명시적인 라벨-값 요약 행으로 표시한다. 각 섹션의 데스크탑/모바일 표현은 같은 조회·페이지네이션 상태를 공유한다. 누적 자산 추이 상단의 전략 타입 탭은 누적 자산 추이와 사이클 성과에만 적용하고, 전략 유형 비교는 비교 목적상 항상 전체 타입 집계를 표시하며 `2xl` 미만은 사이클 성과 아래, `2xl` 이상은 사이클 성과 오른쪽에 배치한다(두 표가 6열이라 `xl` 반쪽 폭에서는 잘린다. 요약 조회 실패로 비교가 없으면 사이클 성과가 전체 폭). 사이클 성과는 계좌/전략/종목/기간/손익/수익률을 표시하고(데스크탑은 계좌·전략 컬럼 분리, 가운데 정렬), 미종료 상태는 기간 값의 `진행 중` 텍스트로만 노출한다
- **`benchmark-comparison`**: `/stats/benchmark` 페이지(통계 메뉴의 "벤치마크" 탭) 전용, 투자-벤치마크 "비교 축"만 담당한다(5분위 원본 축은 `housing-quintile-trend` 참고). 진입점은 `HousingBenchmarkComparison` — ETF/아파트(HOUSING) 두 자산 유형을 `benchmarkType` 판별 유니온으로 함께 처리하며, `Housing~` 접두사지만 ETF도 포괄한다. ETF 벤치마크 자산 선택지는 `runtime-config`의 `benchmarks.etf`를 우선 사용하고, 미등록 심볼은 사용자 설정 ETF로 표시한다
  - **규모 비교 축(investment vs. benchmark)**: `BenchmarkFilterBar.tsx` + `model/useBenchmarkFilters.ts`가 자산 탭(ETF/HOUSING)·전략 선택·기간·(HOUSING이면) `regionCode` 기반 지역 선택을 하나의 필터 상태로 통합 관리한다. 전략 선택은 3상태(전체/없음/개별 전략)이며 기본값은 "전체"(`useState('ALL')`)라 첫 진입 시에도 비교가 정상 수행된다 — 비교를 생략하는 조건은 "없음"(`NONE`)을 명시적으로 고른 경우뿐(`canQuery = !(selection === 'NONE')`). 이때는 `HousingPriceIndexChart.tsx`(아파트 주간 매매가격지수)/`EtfPriceChart.tsx`(ETF 일별 종가)가 CAGR 배지를 포함한 원본 시세만 보여준다. 그 외(전체/개별)에는 `HousingBenchmarkChart`/`HousingBenchmarkSummary`가 투자 대비 비교 결과를 표시한다
  - **5분위 섹션은 콜백으로 위임**: HOUSING 탭에서 `renderHousingExtras?: (range: { from?: string; to: string }) => ReactNode` prop을 호출한 결과를 렌더링한다 — 이 위젯은 `housing-quintile-trend`의 존재를 모른다. 실제 연결은 `app/(main)/stats/benchmark/BenchmarkPageContent.tsx`가 담당(아래 "화이트리스트 밖 조합" 참고)
- **`housing-quintile-trend`**: `benchmark-comparison`의 HOUSING 탭에서만 쓰이는 5분위(quintile) 원본 시계열 섹션 — 사용자 투자 데이터와 무관하게 항상 렌더링된다(투자-벤치마크 비교 축과 독립, 상단 "비교 기간" 필터의 from/to만 공유). `HousingQuintileTrend`가 진입점이며 지역 선택 상태(차트에서 고른 지역 → 아래 안내 패널에 반영)를 내부에 캡슐화한다. `benchmark-comparison`은 이 위젯의 존재를 모른다 — `app/(main)/stats/benchmark/BenchmarkPageContent.tsx`가 `renderHousingExtras` render-prop으로 둘을 연결한다
- **`admin-user-list`**: 이상감지 카드는 `AdminAnomalies { pausedAccounts, inactiveAccounts }`
- **`market-holiday-calendar/WeeklyMarketCalendar`**: 주간/월간 데이터를 여러 쿼리로 조합
- **`glass-card`**, **`pull-to-refresh`**: 동적 계산(픽셀 위치, `rotate()` 각도 등) 인라인 style 유지
- **`glass-card/GlassCard`**: `topBar` prop(ReactNode) — 로그인/pending/rejected 등 인증 흐름 페이지 좌상단 로고+우상단 액션(로그아웃 등)을 `justify-between` 오버레이 행으로 배치. 컴패니언 `BrandWordmark`(로고+워드마크)와 함께 사용 (`app/pending/page.tsx`, `app/rejected/page.tsx` 참고). 배경은 `brand-radial-bg` 클래스(`globals.css`) 고정 적용
