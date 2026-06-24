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
| `admin-privacy-trade-list` | `AdminPrivacyBaseTable` | `app/(admin)/admin/privacy-trade/` |
| `all-strategies` | `AllStrategiesList` | `app/(main)/` 전략 전체 목록 페이지 |
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
| `layout` | `DesktopSidebar`, `MobileBottomNav`, `MobileHeader`, `AdminSidebar`, `AdminTopBar`, `SettingsNav` | 전역 레이아웃 내비게이션 |
| `account-card` | `AccountCard` | 계좌 카드. `useStrategiesQuery(account.id, initialStrategies)` 내장 — 뮤테이션 후 즉시 리프레시. 모바일 2행 레이아웃: 1행=브로커 배지+계좌번호, 2행=닉네임+전략 수+상태. PC: 브로커 배지 우측에 계좌번호 배치, 닉네임 `text-xl`. 배지 active: `style={{ background: 'var(--rose-50)', color: 'var(--rose-600)' }}` |
| `strategy-card` | `StrategyCard` | 전략 카드 (순수 뷰, 클릭 시 전략 상세로 이동). 모바일 2행 레이아웃: 1행=배지+계좌번호, 2행=상태+티커+시드종류+금액. PC: 배지 우측에 계좌번호, 시드 정보 별도 행(border-t), 시작금액 푸터 행(border-t bg-muted/30) |
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

## shadcn / UI 컴포넌트

- **shadcn v4**: `Button`, `DialogTrigger` 등 모든 컴포넌트에 `asChild` 없음 → `cn(buttonVariants({ variant, size }))` 클래스 직접 적용
- **AlertDialog open 제어**: `open`/`onOpenChange` state 직접 관리 필수 (AlertDialogAction 클릭 시 자동 close 안됨). `AlertDialogTrigger`에 `disabled` 없음 → `className`으로 `opacity-40 pointer-events-none`
- **disabled 버튼 툴팁**: `title` 속성은 브라우저 딜레이(1~3초). wrapper `div`에 `group` + 툴팁에 `opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50`. disabled 버튼은 JS hover 차단되지만 부모 div의 CSS hover는 정상
- **vaul Drawer**: `direction="bottom"`, DrawerContent 내 폼 스크롤은 `overflow-y-auto` 래퍼 필요. 모바일 판별: `useEffect`에서 `window.matchMedia('(max-width: 1023px)')`

## CSS 토큰 · 스타일링

- **`--warn`/`--warn-bg`**: `globals.css` 정의 (`.text-warn`, `.bg-warn-bg` 유틸 클래스 존재)
- **`--status-ok`/`--status-ok-bg`**: 운영중(ACTIVE) 색상 (라이트 `#2F8A57`, 다크 `#6FCD8E`). `.text-status-ok`, `.bg-status-ok-bg` 유틸 클래스 존재. 상태 액센트에는 `style={{ background: 'var(--status-ok)' }}` 인라인 style 사용
- **`--status-error`**: 반려/거절 색상 (라이트 `#C8443A`, 다크 `#F87171`). `--status-error-bg`/`--status-error-border`도 정의. `.rejected-reason-card` 유틸 사용 가능. 하드코딩 `#C8443A` 금지
- **로즈골드 CSS 토큰**: Tailwind 내장(`bg-rose-50`, `text-green-600`) → `.dark` 미대응. 손익: `style={{ color: v >= 0 ? 'var(--pos)' : 'var(--neg)' }}`. 배지 active: `style={{ background: 'var(--rose-50)', color: 'var(--rose-600)' }}`
- **다크 모드 gradient**: `--rose-300~700` 팔레트는 `.dark` 재정의 없음. `globals.css`에 `.dark .class-name { background: gradient(lighter); -webkit-background-clip: text; }` 오버라이드 필요
- **거래내역 테이블 헤더**: `className="px-4 py-3 text-left text-[11px] uppercase tracking-widest text-rose-500"` — `font-medium text-muted-foreground` 아님

## 반응형 · 레이아웃

- **인라인 style vs Tailwind 반응형 충돌**: `style={{ display: 'flex' }}`는 `lg:hidden`/`lg:flex` 무효화. display는 반드시 className으로만. 버그 탐지: `grep -rn "style={{ display:" app widgets features --include="*.tsx"`
- **커스텀 반응형 그리드**: `globals.css` 정의 목록: `sm\:kpi-grid`(sm=3컬럼`1fr 1fr 1.4fr`, lg=4컬럼), `sm\:portfolio-grid`, `md\:profit-grid`, `lg\:form-grid`, `lg\:settings-grid`, `.rejected-reason-card`, `.error-page-bg`
- **AuthLayout flex 자식 수축**: `flex items-center justify-center` 내 인라인 배경 있는 자식 → 콘텐츠 너비로 수축. 페이지가 자체 min-height를 가지면 AuthLayout은 `<>{children}</>` 프래그먼트로
- **이벤트 핸들러 컴포넌트 `'use client'` 필수**: `onMouseEnter` 등 DOM 이벤트 핸들러 사용 시 미선언이면 Server Component에서 임포트 시 에러

## 컴포넌트 설계 패턴

- **Server Component + 인터랙션**: 버튼/다이얼로그 추가 시 `*Button.tsx`/`*Trigger.tsx` 별도 Client Component로 분리 후 Server Component에서 import. 페이지 전체 `'use client'` 전환 금지
- **Server Component 데이터 갱신**: API 호출 성공 후 `router.refresh()` — useState 로컬 업데이트만으론 서버 계산 값 반영 안됨. Mutation 훅에서 `queryClient.invalidateQueries` + `router.refresh()` 함께 호출
- **형제 컴포넌트 router.refresh() 후 setState 미동기화**: `useEffect(() => { setState(prop) }, [prop])` 패턴으로 동기화 필수
- **Toast vs 영구 `<p>`**: "방금 동작 결과"는 `toast.success()`. "현재 상태 경고"는 `<p>` 유지
- **독립 API 호출 try/catch 분리**: 두 개를 같은 블록에 묶으면 두 번째 실패 시 첫 번째 성공 toast가 에러 toast로 대체됨
- **JSX 내 IIFE 금지**: `{(() => { ... })()}` 패턴 금지 — 계산 변수는 컴포넌트 본문 상단으로 호이스팅

## 주요 슬라이스 quirk

- **`dashboard/aggregatePortfolios`**: 포트폴리오 집계 순수 함수. Server Component에서 호출. `AccountCard`에는 `strategies={strategiesByAccount[i]}`를 `initialData`로 전달 — `AccountCard` 내부 `useStrategiesQuery`가 SSR 값을 초기 데이터로 사용하고 뮤테이션 invalidate 시 즉시 리프레시. 미전달 시 "알 수 없음"/"전략 미등록" 표시.
- **`account-detail`**: `TradesTab`은 range 상태를 `useReducer`로 관리하고 `@widgets/cycle-history`의 `CycleHistoryTable`/`buildParams`를 사용. 계좌 요약: 종목=`portfolio.ticker`(전략 ticker 포지션 우선 → positions[0] 폴백), 평가손익=`평가금액-(평균단가×보유수량)` 직접 계산(KIS `evlu_pfls` 미사용).
- **`cycle-history`**: `StrategyTradesTab`은 range 상태를 `useReducer`로 관리하고 `CycleHistoryTable`에 위임. `account-detail`의 전략 탭과 `strategy-detail` 양쪽에서 사용.
- **`strategy-detail`**: `useStrategyOrderPreviewQuery(strategyId)`로 전략별 KPI/다음 주문을 조회. `position=null`이면 `skipReason` 안내 문구 표시. 헤더 배지: `{divisionCount}분할`(INFINITE 전략, `bg-muted text-foreground`) + `리버스모드`(isReverseMode=true, amber-50/amber-600). 예수금 부족 배너: PC(`lg:flex`)는 CardHeader 하단 인라인에, 모바일(`lg:hidden`)은 주문 목록 상단 border-b 행에 배치. `StatusDot`에 `labelClassName` prop으로 PC에서만 라벨 폰트 확대(`lg:text-sm`) 가능
- **`percent-gauge`**: 슬라이더 handle 위치(`left`, `width`, `height`)는 픽셀 계산이라 인라인 style 유지. 그 외는 Tailwind. pct 초기화: 타입/종목 변경 시 100% → `deposit < newMinSeed`이면 0%로.
- **`profit-stats-card`**: `PortfolioChart`/`PortfolioChartInner`는 이 슬라이스 내부 파일 — 외부 export 없음. `getPortfolioSnapshots()`는 DB 스냅샷 기반(실시간 KIS 아님) → 차트 공백 가능.
- **`profit-display`**: `currency='USD'`(기본) 또는 `'KRW'`. KIS portfolio summary(`totalEvalProfit` 등)는 KRW → `currency="KRW"` 필수.
- **`kpi-card`**: 포트폴리오/KPI는 Card row-list 대신 `<KpiCard label="..." value="..." />` + `grid grid-cols-2 gap-3`. `variant="accent"`, 손익은 `variant="default"`.
- **`revealable-value`**: `****0614` 마스킹 → 눈 아이콘으로 공개. `KpiCard`의 `value={<RevealableValue value={account.accountNoMasked} />}` 패턴.
- **`all-strategies`**: `AllStrategiesList`는 Server prop(`initialStrategies`)을 `useAllStrategiesQuery(initialStrategies)`에 초기 데이터로 전달해 뮤테이션 즉시 반영. `strategies.length === 0`이면 내부 `EmptyState` 컴포넌트 렌더링. 계좌 유무(`accounts.length > 0`)에 따라 분기 — 계좌 있음: 계좌 상세 링크 최대 3개 + 더보기, 계좌 없음: `/accounts` 등록 링크.
- **`admin-user-list`**: 이상감지 카드는 `AdminAnomalies { pausedAccounts, inactiveAccounts }` 사용 — `failedTrades` 필드 없음.
- **`glass-card`**: `maxWidth` prop + CSS 토큰(`var(--background)`)은 인라인 style 유지.
- **`pull-to-refresh`**: `paddingTop` 동적 계산, `transform: rotate(${progress * 270}deg)` — 인라인 style 유지.
- **`layout/DesktopSidebar`**: `background: var(--sidebar-bg)` 인라인 style 유지 (CSS 토큰).
