# components/ — 컴포넌트 패턴 · 스타일링 · React Query

> **FSD 리팩토링 완료**: `components/{common,accounts,strategies,settings,layout,admin}/` 내 상당수 파일은 **re-export shim**. 실제 구현은 `widgets/`, `features/`, `entities/` 계층에 있음. 새 컴포넌트는 FSD 계층에 작성할 것.

## shadcn / UI 컴포넌트

- **shadcn v4**: `Button`, `DialogTrigger` 등 모든 컴포넌트에 `asChild` 없음 → `cn(buttonVariants({ variant, size }))` 클래스 직접 적용
- **AlertDialog open 제어**: `open`/`onOpenChange` state 직접 관리 필수 (AlertDialogAction 클릭 시 자동 close 안됨). `AlertDialogTrigger`에 `disabled` 없음 → `className`으로 `opacity-40 pointer-events-none`
- **disabled 버튼 툴팁**: `title` 속성은 브라우저 딜레이(1~3초). wrapper `div`에 `group` + 툴팁에 `opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50`. disabled 버튼은 JS hover 차단되지만 부모 div의 CSS hover는 정상
- **vaul Drawer**: `direction="bottom"`, DrawerContent 내 폼 스크롤은 `overflow-y-auto` 래퍼 필요. 모바일 판별: `useEffect`에서 `window.matchMedia('(max-width: 1023px)')`

## CSS 토큰 · 스타일링

- **`--warn`/`--warn-bg`**: `globals.css` 정의 (`.text-warn`, `.bg-warn-bg` 유틸 클래스 존재)
- **`--status-error`**: 반려/거절 색상 (라이트 `#C8443A`, 다크 `#F87171`). `--status-error-bg`/`--status-error-border`도 정의. `.rejected-reason-card` 유틸 사용 가능. 하드코딩 `#C8443A` 금지
- **로즈골드 CSS 토큰**: Tailwind 내장(`bg-rose-50`, `text-green-600`) → `.dark` 미대응. 손익: `style={{ color: v >= 0 ? 'var(--pos)' : 'var(--neg)' }}`. 배지 active: `style={{ background: 'var(--rose-50)', color: 'var(--rose-600)' }}`
- **다크 모드 gradient**: `--rose-300~700` 팔레트는 `.dark` 재정의 없음. `globals.css`에 `.dark .class-name { background: gradient(lighter); -webkit-background-clip: text; }` 오버라이드 필요
- **거래내역 테이블 헤더**: `className="px-4 py-3 text-left text-[11px] uppercase tracking-widest text-rose-500"` — `font-medium text-muted-foreground` 아님

## 반응형 · 레이아웃

- **인라인 style vs Tailwind 반응형 충돌**: `style={{ display: 'flex' }}`는 `lg:hidden`/`lg:flex` 무효화. display는 반드시 className으로만. 버그 탐지: `grep -rn "style={{ display:" app components --include="*.tsx"`
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

## 공통 컴포넌트

- **KpiCard**: 포트폴리오/KPI는 shadcn Card row-list 대신 `<KpiCard label="..." value="..." />` + `grid grid-cols-2 gap-3`. `variant="accent"` + 손익은 `variant="default"` 사용
- **StrategyBadge**: `account.strategyType` 표시 시 항상 `<StrategyBadge strategy={account.strategyType} />`. 인라인 span + rose 스타일 직접 작성 금지
- **RevealableValue**: `components/common/RevealableValue.tsx` — `****0614` 마스킹 → 눈 아이콘으로 공개. `KpiCard`의 `value={<RevealableValue value={account.accountNoMasked} />}` 패턴
- **ProfitDisplay**: `currency='USD'`(기본) 또는 `currency='KRW'`. KIS portfolio summary(totalEvalProfit 등)는 KRW → `currency="KRW"` 필수
- **`skipReason` + position 배너**: `NextOrderPreviewCard`의 `INSUFFICIENT_BALANCE` — `position` 있으면 배너(`bg-warn-bg/text-warn`), 없으면 텍스트. 계산 변수는 JSX 외부 선언 (IIFE 금지)

## MetaProvider

- `useMeta()` → `findStrategyType(code)`, `findTicker(code)`, `labelOf(category, code)`. `'INFINITE'`/`'PRIVACY'` 리터럴 분기 금지 — `findStrategyType(strategy.type)?.code` 또는 `availableTickers.length > 1` 판별
- `MetaProvider`는 `(main)/layout.tsx`에서 제공 — `(main)` 밖에서는 `useMeta()` 호출 불가

## AccountDetailTabs 구조

실제 구현 위치: **`widgets/account-detail/`** (`components/common/AccountDetailTabs.tsx`는 re-export shim)

- 데스크탑 3행: 1행=`AccountSummaryCard|TradesTab(accountId)`, 2행=`StrategyList|StrategyTradesTab(strategyId)`, 3행=`NextOrderPreviewCard(전폭)`
- 모바일: 요약/전략/다음 주문 탭 3개
- `TradesTab`·`StrategyTradesTab` → `widgets/account-detail/TradesTab.tsx`, `StrategyTradesTab.tsx` (각자 range 상태를 useReducer로 관리)
- `CycleHistoryTable` → `widgets/account-detail/CycleHistoryTable.tsx` (테이블+모바일 카드 공용 컴포넌트)
- `buildParams(rangeType, customFrom, customTo)` → `widgets/account-detail/lib/buildParams.ts`
- `ProfitStatsCard`는 통계 페이지 전용 (계좌 상세에 없음)

## NextOrderPreviewCard 구조

실제 구현 위치: **`widgets/next-order-preview/`** (`components/common/NextOrderPreviewCard.tsx`는 re-export shim)

- `NextOrderPreviewCard.tsx` — 얇은 컨테이너 (useNextOrderPreview 훅 호출, 파생 상태 계산, mode 분기)
- `PreviewMode.tsx` — 미리보기 모드 (로딩/에러/주문 목록)
- `ExecutedMode.tsx` — 실행 후 접수 목록 + 취소 버튼
- `ExecuteDialog.tsx` — AlertDialog 분리
- `OrderRow.tsx` — BUY/SELL 행 (PreviewMode/ExecutedMode 공용)
- `useNextOrderPreview` 훅: `hooks/useNextOrderPreview.ts` (preview, margin, marketSession, holidays, execute/cancelAll/cancelOne mutation 통합)

## Dashboard 구조

실제 구현 위치: **`widgets/dashboard/`** (`app/(main)/dashboard/page.tsx`는 53 LOC Server Component)

- `DashboardEmpty.tsx` — 계좌 미등록 상태 (데스크탑+모바일 통합 반응형)
- `DashboardOverview.tsx` — 계좌 있는 상태 (KPI 카드 + 계좌 목록, 데스크탑+모바일 통합)
- `aggregatePortfolios(raws)` → `widgets/dashboard/aggregatePortfolios.ts` (포트폴리오 집계 순수 함수)
- `fmtUsd`/`fmtKrw` → `shared/lib/format/` 사용

## Dashboard · 계좌

- **Dashboard AccountCard**: `strategies={strategiesByAccount[i]}` 전달 필수 — 미전달 시 "알 수 없음"/"전략 미등록" 표시
- **계좌 요약**: 종목=`portfolio.ticker`(전략 ticker 포지션 우선 → positions[0] 폴백). 평가손익=`평가금액-(평균단가×보유수량)` 직접 계산 (KIS evlu_pfls 미사용)
- **계좌번호 형식**: `74420614-01` (8자리 + `-` + 2자리) — 분할 Input UI
- **AccountRequest 필드명**: `kisAppKey`(≠apiKey), `kisSecretKey`(≠apiSecret), `accountNo`(8자리만), `kisAccountType`("01")
- **AdminAnomalies 현재 필드**: `pausedAccounts`, `inactiveAccounts` — `failedTrades` 제거됨

## PortfolioSnapshot · 통계

- **PortfolioSnapshot**: `snapshotDate` 필드 제거됨 — 날짜는 `createdAt` 사용. `currentPrice`는 `number | null` → null 가드 필수
- **ProfitStatsCard 차트 공백**: `getPortfolioSnapshots()` = DB 스냅샷 기반 (실시간 KIS 아님)

## 기타

- **재신청 쿨다운 localStorage 키**: pending → `reapply_last_requested_at`(1시간), rejected → `reapply_rejected_last_at`(24시간)
- **승인 재요청 Route Handler**: `ReapplyButton` → `/api/auth/reapply-done` 경유 (직접 kista-api 호출 금지)
- **텔레그램 설정**: `updateTelegram`/`deleteTelegram` → `/api/settings/telegram` Route Handler 경유
- **클로드 디자인 원본**: `/private/tmp/kista_design/design-system/project/screens.jsx` (데스크탑), `screens-mobile.jsx` (모바일)
