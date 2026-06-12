# widgets/ — 페이지 합성 단위

페이지를 구성하는 독립적인 UI 블록. `features/`, `entities/`, `shared/` 모두 import 가능.  
`app/` 라우트 페이지에서 직접 사용하는 최상위 UI 단위.

## 의존성 규칙

```
widgets/{slice}  →  features/  →  entities/  →  shared/
```

widget 슬라이스끼리 cross-import 금지. 두 위젯을 조합해야 하면 `app/` 페이지에서 처리.

## 슬라이스 목록

### 페이지 단위 위젯

| 슬라이스 | 주요 컴포넌트 | 사용 위치 |
|---|---|---|
| `admin-user-list` | `AdminPendingList`, `AdminUsersTable` | `app/(admin)/admin/` 페이지들 |
| `dashboard` | `DashboardEmpty`, `DashboardOverview`, `aggregatePortfolios` | `app/(main)/dashboard/page.tsx` |
| `account-detail` | `AccountDetailTabs`, `AccountSummaryCard`, `TradesTab` | `app/(main)/accounts/[id]/page.tsx` |
| `strategy-detail` | `StrategyDetail` | `app/(main)/accounts/[id]/strategies/[sid]/page.tsx` |
| `cycle-history` | `CycleHistoryTable`, `StrategyTradesTab`, `buildParams`/`RangeType` | `account-detail`, `strategy-detail` |
| `portfolio-summary-card` | `PortfolioSummaryCard` | `app/(main)/statistics/page.tsx` |
| `trade-history-list` | `TradeHistoryList`, `TradeDirectionBadge`(내부 전용) | `app/(main)/statistics/page.tsx` |
| `percent-gauge` | `PercentGauge` (슬라이더 UI) | 전략 등록/수정 폼 |
| `error-display` | `ErrorDisplay` | `error.tsx` fallback |

### 공용 UI 위젯

| 슬라이스 | 컴포넌트 | 설명 |
|---|---|---|
| `account-card` | `AccountCard` | 계좌 카드 (순수 뷰) |
| `strategy-card` | `StrategyCard` | 전략 컴팩트 행 (순수 뷰, 클릭 시 전략 상세로 이동) |
| `strategy-list` | `StrategyList` | 전략 목록 (컴팩트 행 + 전략 추가) |
| `kpi-card` | `KpiCard` | KPI 지표 카드 |
| `profit-stats-card` | `ProfitStatsCard`, `PortfolioChart`, `PortfolioChartInner` | 수익 통계 + 차트 |
| `profit-display` | `ProfitDisplay` | 손익 표시 (USD/KRW) |
| `margin-card` | `MarginCard` | 증거금 카드 (`useAccountMarginQuery` 내장) |
| `market-holiday-calendar` | `MarketHolidayCalendar` | 시장 휴일 달력 |
| `revealable-value` | `RevealableValue` | 마스킹 토글 값 |
| `glass-card` | `GlassCard` | 유리 효과 카드 래퍼 |
| `page-header` | `PageHeader` | 페이지 헤더 |
| `status-dot` | `StatusDot` | 상태 표시 점 |
| `theme-toggle` | `ThemeToggle` | 다크/라이트 전환 버튼 |
| `stepper` | `Stepper` | 단계 진행 표시 |
| `timeline` | `Timeline` | 타임라인 |
| `pull-to-refresh` | `PullToRefresh` | 모바일 당겨서 새로고침 |


## 주요 슬라이스 quirk

- **`dashboard/aggregatePortfolios`**: 포트폴리오 집계 순수 함수. Server Component에서 호출.
- **`account-detail`**: `TradesTab`은 range 상태를 `useReducer`로 관리하고 `@widgets/cycle-history`의 `CycleHistoryTable`/`buildParams`를 사용.
- **`cycle-history`**: `StrategyTradesTab`은 range 상태를 `useReducer`로 관리하고 `CycleHistoryTable`에 위임. `account-detail`의 전략 탭과 `strategy-detail` 양쪽에서 사용.
- **`strategy-detail`**: `useStrategyOrderPreviewQuery(strategyId)`로 전략별 KPI/다음 주문을 조회. `position=null`이면 `skipReason` 안내 문구 표시.
- **`percent-gauge`**: 슬라이더 handle 위치(`left`, `width`, `height`)는 픽셀 계산이라 인라인 style 유지. 그 외는 Tailwind.
- **`profit-stats-card`**: `PortfolioChart`/`PortfolioChartInner`는 이 슬라이스 내부 파일 — 외부 export 없음.
- **`glass-card`**: `maxWidth` prop + CSS 토큰(`var(--background)`)은 인라인 style 유지.
- **`pull-to-refresh`**: `paddingTop` 동적 계산, `transform: rotate(${progress * 270}deg)` — 인라인 style 유지.
- **`layout/DesktopSidebar`**: `background: var(--sidebar-bg)` 인라인 style 유지 (CSS 토큰).
