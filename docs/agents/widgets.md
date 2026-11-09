# widgets/ — 페이지 합성 단위

페이지를 구성하는 독립 UI 블록. `features/`, `entities/`, `shared/`를 import 가능하며 `app/` 라우트 페이지에서 직접 사용하는 최상위 UI 단위다.

- **가계부(finance) 작업 시 docs/agents/finance.md 필수 Read** — 화면은 docs/agents/finance-widgets.md — 관련: `/finance` 탭 구조, `asset-overview`, `asset-trend`, `asset-composition`, `asset-record-check`, `asset-record-list`, `asset-settings/AssetSettingsPanel`, `FinanceHeader`, `use-amount-hidden`
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

- 슬라이스 전용 quirk는 `widgets/<slice>/CLAUDE.md`에 둔다(해당 디렉토리 작업 시 자동 로드): dashboard, stats-overview, all-strategies, housing-quintile-trend, benchmark-comparison, accounts-grid, cycle-history
- **`kpi-card`**: `<KpiCard />` 그리드 패턴 유지
- **`revealable-value`**: 마스킹 값 공개 토글
- **`admin-user-list`**: 이상감지 카드는 `AdminAnomalies { pausedAccounts, inactiveAccounts }`
- **`market-holiday-calendar/WeeklyMarketCalendar`**: 주간/월간 데이터를 여러 쿼리로 조합. 일별 체결은 크립토 계좌를 포함해 통화별로 따로 집계하며(`summarizeDailyTrades`, 다른 통화 금액은 합치지 않음) 주말·휴장일 칸에도 배지를 그린다. "대기"만 주식 계좌 기준
- **`glass-card`**, **`pull-to-refresh`**: 동적 계산(픽셀 위치, `rotate()` 각도 등) 인라인 style 유지
- **`glass-card/GlassCard`**: `topBar` prop(ReactNode) — 로그인/pending/rejected 등 인증 흐름 페이지 좌상단 로고+우상단 액션(로그아웃 등)을 `justify-between` 오버레이 행으로 배치. 컴패니언 `BrandWordmark`(로고+워드마크)와 함께 사용 (`app/pending/page.tsx`, `app/rejected/page.tsx` 참고). 배경은 `brand-radial-bg` 클래스(`globals.css`) 고정 적용
