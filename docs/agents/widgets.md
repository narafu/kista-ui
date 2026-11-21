# widgets/ — 페이지 합성 단위

페이지를 구성하는 독립 UI 블록. `features/`, `entities/`, `shared/`를 import 가능하며 `app/` 라우트 페이지에서 직접 사용하는 최상위 UI 단위다.

- **가계부(finance) 작업 시 docs/agents/finance.md 필수 Read** — 화면은 docs/agents/finance-widgets.md — 관련: `/finance` 탭 구조, `asset-overview`, `asset-trend`, `asset-composition`, `asset-record-check`, `asset-record-list`, `asset-settings/AssetSettingsPanel`, `FinanceHeader`, `use-amount-hidden`
- **전략·DCA·브로커 분기 작업 시 docs/agents/strategy.md 필수 Read** — 관련: `strategy-card`, `strategy-detail`, `computeOrderReadiness`, `isScheduledStart`, DCA 분기, `dca-executions`

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
- **테이블 정렬·열 폭**: `DataList`(`@shared/ui/data-list/DataList`)를 쓰는 표는 `DataList`가 한다. 아직 전환되지 않은 표는 다음 규칙을 따른다. 열 헤더(`TableHeadCell`·`SortableHeadCell`)와 데이터 셀(`TableDataCell`)은 금액·수량을 포함해 전부 가운데 정렬이다 — `text-right`/`text-left`로 덮어쓰지 않는다(2026-11 사용자 결정: 열 간격을 고르게 하는 쪽을 택해, 길이가 다른 금액의 자릿수 어긋남은 감수한다). 숫자 셀은 `tabular-nums whitespace-nowrap`. 헤더는 전부 줄바꿈하지 않는다(`TableHeadCell` 기본값, `numeric` prop은 스타일 없는 표시용). 열 폭은 `<table>`에 `evenColumnsClass(n)`(`@shared/ui/TableHeadCell`)을 줘 균등 분배한다 — 안 주면 남는 폭이 내용이 긴 한 열(유형·티커 등)로 몰린다. 아이콘·체크박스·행 펼침처럼 내용 폭만 쓸 열은 헤더에 `w-px`를 주고 n에서 뺀다. 열 폭을 퍼센트로 직접 고정한 비교 표(`HousingBenchmarkSummary`)는 예외
- **수량 표기**: 주식 수량은 표·카드·문구 모두 `fmtShares`(`@shared/lib/format`, "12주")로 표기한다 — 숫자만 쓰거나 `${n}주`를 손으로 잇지 않는다
- **주문 유형 표기**: 화면의 주문 유형은 괄호 설명 없는 코드형 이름("LOC", "LIMIT VWAP")이다 — `useMeta().labelOf('orderTypes', …)`가 서버 라벨의 `(…)`를 떼므로 호출부에서 다시 가공하지 않는다
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

- 슬라이스 전용 quirk는 `widgets/<slice>/CLAUDE.md`에 둔다(해당 디렉토리 작업 시 자동 로드): dashboard, stats-overview, all-strategies, housing-quintile-trend, benchmark-comparison, accounts-grid, cycle-history
- **`kpi-card`**: `<KpiCard />` 그리드 패턴 유지
- **`revealable-value`**: 마스킹 값 공개 토글
- **`admin-log-list`**: 이상감지 카드(`AnomaliesSection`)는 `AdminAnomalies { pausedAccounts, inactiveAccounts }`
- **`market-holiday-calendar/WeeklyMarketCalendar`**: 주간/월간 데이터를 여러 쿼리로 조합. 일별 체결은 통화별로 따로 집계하며(`summarizeDailyTrades`, 다른 통화 금액은 합치지 않음) 주말·휴장일 칸에도 배지를 그린다. "대기"만 주식 계좌 기준
- **`glass-card`**, **`pull-to-refresh`**: 동적 계산(픽셀 위치, `rotate()` 각도 등) 인라인 style 유지
- **`glass-card/GlassCard`**: `topBar` prop(ReactNode) — 로그인/pending/rejected 등 인증 흐름 페이지 좌상단 로고+우상단 액션(로그아웃 등)을 `justify-between` 오버레이 행으로 배치. 컴패니언 `BrandWordmark`(로고+워드마크)와 함께 사용 (`app/pending/page.tsx`, `app/rejected/page.tsx` 참고). 배경은 `brand-radial-bg` 클래스(`globals.css`) 고정 적용
