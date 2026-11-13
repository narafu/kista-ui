# N. 기능 재심 — 화면·기능 전수 인벤토리 (측정 전용, 판정 없음)

기준 커밋: 1487ea9f (main). 측정일 2026-11-13. 줄 수는 테스트 제외 `*.ts`/`*.tsx` 합계(`wc -l`), 테스트는 `*.test.*` 별도. "미확인"은 확인 못 한 것.

---

## 1. 라우트 전수표

### 1-0. 접근 권한 판정 기준 (`proxy.ts`)

- 보호 prefix: `/accounts /strategies /stats /settings /finance` + `/admin` (proxy.ts:23-24). 토큰 없으면 `/login?next=` 리다이렉트 (proxy.ts:152 부근 `redirectToLogin`).
- 비보호: `/dashboard`, `/`, `/login`, `/pending`, `/rejected` (토큰 없이 통과). 단 `/pending`·`/rejected`는 비인증이어도 proxy가 막지 않는다(proxy.ts 토큰 없음 분기: isProtected 아니면 `next()`). 페이지 내부는 `getMe(token)` 실패 시 기본값으로 렌더(app/pending/page.tsx).
- 인증 후 `routeByStatusAndRole` (proxy.ts:186-): `/admin/**`는 role=ADMIN 아니면 `/dashboard`로. PENDING은 `/pending` 외 전부 `/pending`으로, REJECTED는 `/rejected` 외 전부 `/rejected`로. ACTIVE는 `/`·`/login`·`/pending`·`/rejected` 방문 시 `/dashboard`로. (ADMIN 경로는 status 검사보다 먼저 평가되어 PENDING/REJECTED ADMIN도 /admin 통과 — proxy.ts:186-189 순서 기준, 실데이터 미확인.)
- `(main)` layout은 `isAuthenticated`를 DesktopSidebar·MobileHeader에 전달해 비회원 시 로그인 링크 표시 (app/(main)/layout.tsx:54-67, DesktopSidebar.tsx:142). `(admin)` layout은 별도 권한 코드 없음 — proxy에만 의존 (app/(admin)/layout.tsx).
- 로딩 UI: `loading.tsx` 존재 라우트는 1-3 표 하단 참조. error 경계: `app/error.tsx`, `app/global-error.tsx`, `app/(main)/error.tsx`, `app/(admin)/admin/error.tsx`, `app/not-found.tsx`.

### 1-1. page.tsx 전수표 (35개, `find app -name page.tsx` 실측)

| # | URL | 접근 권한 | 한 줄 기능 | 진입 경로 | 조립 위젯/피처 | 전용 코드 줄(테스트 제외) |
|---|---|---|---|---|---|---|
| 1 | `/` | 누구나 → 항상 `/dashboard` redirect | 루트 리다이렉트 (app/(auth)/page.tsx:5) | proxy ACTIVE 리다이렉트, 도메인 루트 | 없음 | 5 |
| 2 | `/login` | 비회원 전용(ACTIVE는 /dashboard로) | 카카오 OAuth 로그인 버튼 + `?next=` 보존 | DesktopSidebar.tsx:142(비회원), app/(main)/layout.tsx:67(모바일), proxy `redirectToLogin`, auth/callback 에러 redirect(route.ts:36,55,90) | widgets/glass-card | 약 160 (app/(auth) 167 중) |
| 3 | `/pending` | PENDING (비인증도 proxy 통과) | 승인 대기 타임라인·텔레그램 연동·재신청 | proxy 강제, auth/callback/route.ts:99, RejectedReapplyButton.tsx:40 | glass-card, timeline, features/settings/telegram-connect, features/auth/reapply·logout | 110 (+telegram-connect 207, reapply 125 공용) |
| 4 | `/rejected` | REJECTED | 반려 안내 + 재신청 | proxy 강제, auth/callback/route.ts:100, PendingStatusWatcher.tsx:16 | glass-card, features/auth/reapply·logout | 65 |
| 5 | `/dashboard` | **비회원 포함 전체**(비보호) | 계좌 요약·주간 휴장 캘린더·공포탐욕·크립토 지표·시장 차트 | 사이드바 DesktopSidebar.tsx:15, MobileBottomNav.tsx:10, 로고, ErrorDisplay.tsx:86, LogoutButton.tsx:20, api-client/index.ts:65 | widgets/dashboard, market-holiday-calendar, fear-greed-card, crypto-market-indicators | 1,924 |
| 6 | `/accounts` | ACTIVE | 계좌 목록 + 계좌별 전략 | 사이드바/하단탭 `/accounts` | accounts-grid, account-card, create-account(NewAccountButton) | 258 (accounts-grid+account-card) + page 44 |
| 7 | `/accounts/new` | ACTIVE | 계좌 연결 스텝퍼(증권사/거래소 선택→자격증명→확인) | NewAccountButton.tsx:16 (accounts/page.tsx:40, AccountsPageContent.tsx:35, DashboardEmpty.tsx:38·68, DashboardOverview.tsx:20, AllStrategiesList.tsx:42) | features/account/create-account | 929 |
| 8 | `/accounts/[id]` | ACTIVE(소유자) | 계좌 상세: 포트폴리오·전략 목록·사이클 이력·주문 미리보기 | AccountCard.tsx:42, ConfirmStep.tsx:42(생성 직후), StrategyDetail.tsx:43-44(전략 삭제/보관 후), EditAccountForm.tsx:63 | widgets/account-detail, strategy-list, cycle-history, strategy-card | 788 (account-detail+strategy-list+cycle-history+account-card) |
| 9 | `/accounts/[id]/edit` | ACTIVE | 계좌 수정·삭제 | AccountDetailContent.tsx:48 | features/account/edit-account | 236 |
| 10 | `/accounts/[id]/strategies/new` | ACTIVE | 전략 등록(종류별 폼) | NewStrategyButton.tsx:20(StrategyList.tsx:23), AddStrategyButton.tsx:22·35, AllStrategiesList.tsx:33 | features/strategy/create-strategy | 3,181 |
| 11 | `/accounts/[id]/strategies/[sid]` | ACTIVE | 전략 상세: 상태·주문 미리보기·투자금·수정/삭제·보관 | StrategyCard.tsx:187, DcaStrategyCard.tsx:64 | widgets/strategy-detail, adjust-capital, manage-strategy | 1,779 (+adjust 179, manage 156) |
| 12 | `/accounts/[id]/strategies/[sid]/edit` | ACTIVE | 전략 수정 | StrategyDetailContent.tsx:79 | create-strategy(StrategyFormPage 공용) | (10과 공용) |
| 13 | `/accounts/[id]/strategies/[sid]/reconfigure-vr` | ACTIVE, VR 전략만(`hasVr` 아니면 notFound, page.tsx) | VR 밴드·주기·램프 재설정 + 투자금 추가 | StrategyDetailContent.tsx:60 (진입점 1개, 조건부 노출 — 5절) | features/strategy/reconfigure-vr | 409 |
| 14 | `/strategies` | ACTIVE | 전 계좌 전략 통합 목록 + 주문 미리보기 | 사이드바/하단탭 | widgets/all-strategies, AddStrategyButton | 120 |
| 15 | `/stats` | ACTIVE | 성과: KPI·자산곡선·사이클 성과·전략유형 비교·보관 전략 | 사이드바(서브메뉴 DesktopSidebar.tsx:24), StatsHeader.tsx:9 | widgets/stats-overview | 819 |
| 16 | `/stats/benchmark` | ACTIVE | 주택가격지수 벤치마크 비교 + 분위 추이 | DesktopSidebar.tsx:25, StatsHeader.tsx:10 | app/(main)/stats/benchmark/BenchmarkPageContent.tsx(23), widgets/benchmark-comparison, housing-quintile-trend | 1,970 |
| 17 | `/stats/backtest` | ACTIVE | 백테스트 실행·결과 | DesktopSidebar.tsx:26, StatsHeader.tsx:11 | widgets/backtest, features/backtest/run-backtest | 594 |
| 18 | `/settings` | ACTIVE | 계정 설정(닉네임·테마·알림·텔레그램·FCM·탈퇴) | 사이드바/하단탭 | widgets/settings, features/settings/* | 691 |
| 19 | `/finance` | ACTIVE | 가계부 "자산" 탭: 순자산 개요·추이·구성·월 체크·자산 기록 목록 | 사이드바/하단탭 `/finance`, FinanceHeader.tsx:20, AssetFormPage.tsx:15(저장 후), BulkRegisterForm.tsx:191 | widgets/asset-overview·trend·composition·record-check·record-list | 1,428 |
| 20 | `/finance/income` | ACTIVE | 수입 탭(요약·예산대비·추이·거래내역) | FinanceHeader.tsx:22, DesktopSidebar.tsx:31 | finance-summary·budget-progress·trend·record-list, save-transaction | 1,477 (3개 flow 라우트 공유) + FlowPageView/useFinanceFlowData |
| 21 | `/finance/expense` | ACTIVE | 소비 탭 (20과 동일 컴포넌트 `FlowPageView type=EXPENSE`) | FinanceHeader.tsx:22 | 〃 | (공유) |
| 22 | `/finance/saving` | ACTIVE | 저축 탭 (동일, type=SAVING) | FinanceHeader.tsx:23 | 〃 | (공유) |
| 23 | `/finance/settings` | ACTIVE | 가계부 설정: 일괄등록 링크·금액 숨김·카테고리·재무계좌·전략 제안·그룹 | FinanceHeader.tsx:24, DesktopSidebar.tsx:34 | widgets/asset-settings + features/finance/manage-{categories,accounts,group,strategy-suggestions}, hide-amounts | 1,489 |
| 24 | `/finance/new` | ACTIVE | 자산 기록 등록 / `?duplicateFrom=`으로 복제 | NewAssetButton.tsx:19(FinanceHeader.tsx:65), AssetRecordRows.tsx:57(복제) | features/asset/save-asset | 480 |
| 25 | `/finance/[id]/edit` | ACTIVE | 자산 기록 수정 | AssetRecordRows.tsx:58 | features/asset/save-asset | (24와 공용) |
| 26 | `/finance/budgets/[type]` | ACTIVE, type∈income/expense/saving 아니면 notFound | 카테고리별 월 예산 CRUD | FinanceHeader.tsx:70 (`budgetListHref`, entities/finance/lib/budgetRoutes.ts:19) — 수입/소비/저축 탭에서만 | features/finance/manage-budgets | 454 |
| 27 | `/finance/bulk-register` | ACTIVE | 지난달 기록 → 이번 달 일괄 복사 | AssetSettingsPanel.tsx:28 (설정 탭 1개) | widgets/finance-bulk-register | 359 |
| 28 | `/admin` | ADMIN | 개요(사용자 통계·대기 목록) | AdminSidebar.tsx:11, AdminTopBar.tsx:9, DesktopSidebar.tsx:114, (main)/layout.tsx:54 | widgets/admin-user-list(Overview) | (users 296 공용) |
| 29 | `/admin/pending` | ADMIN | 가입 승인 대기 목록·승인/반려 | **사이드바·탑바에 없음**. AdminOverviewContent.tsx:35 "전체 보기 →" 1개만 | widgets/admin-user-list, features/admin/approve-reject | (공용) |
| 30 | `/admin/users` | ADMIN | 사용자 목록·역할 변경·탈퇴 처리 | AdminSidebar.tsx:12, AdminTopBar.tsx:10 | admin-user-list, features/admin/change-role·withdraw-user | 296+84+71 |
| 31 | `/admin/accounts` | ADMIN | 전체 계좌 현황(필터·페이지) | AdminSidebar.tsx:13 | widgets/admin-account-list | 63 (+page 서버 필터 로직 ~60) |
| 32 | `/admin/trades` | ADMIN | 전체 거래 내역 | AdminSidebar.tsx:14 | widgets/admin-trade-list | 469 |
| 33 | `/admin/privacy-trades` | ADMIN | PRIVACY 기준표(매매표) 차트·테이블·등록 | AdminSidebar.tsx:15 | widgets/admin-privacy-trade-list | 1,593 |
| 34 | `/admin/logs` | ADMIN | 운영 로그(감사·에러·이상징후) | AdminSidebar.tsx:16 | widgets/admin-log-list, features/admin/logs·error-logs | 522 |
| 35 | `/admin/settings` | ADMIN | 운영 설정(가입·계좌·전략 정책) + 가계부 공통 카테고리 | AdminSidebar.tsx:17 | features/admin/settings, features/finance/manage-categories(SystemCategoryManager) | 1,290 (admin/settings 733 + categories 557) |

(표 35행 = find 결과 35개 일치. 12·21·22·25는 다른 라우트와 컴포넌트 공유.)

**진입점 약한 라우트**: `/admin/pending`(개요 카드 링크 1개, 내비 항목 없음), `/accounts/[id]/strategies/[sid]/reconfigure-vr`(상세의 조건부 버튼 1개), `/finance/budgets/[type]`(수입/소비/저축 탭 상단 버튼만, 설정 탭엔 링크 없음 — AssetSettingsPanel.tsx:18 주석으로 이관 명시), `/finance/bulk-register`(설정 탭 카드 1개). **진입점 0인 page.tsx는 없음.**

### 1-2. 공통 레이아웃/내비 (참고)

- 데스크톱 사이드바 6항목 + 서브메뉴(통계 3, 가계부 5): DesktopSidebar.tsx:15-34. 모바일 하단 6탭 MobileBottomNav.tsx:10-15 (서브메뉴 없음 → 통계/가계부 하위 탭은 StatsHeader.tsx:9-11, FinanceHeader.tsx:20-24 상단 탭).
- 관리자: AdminSidebar.tsx:11-17(7항목), AdminTopBar.tsx:9-15(7항목, 모바일). 둘 다 `/admin/pending` 없음.
- 비회원이 보는 사이드바도 6항목 전부 렌더(보호 경로 클릭 시 `/login?next=`) — DesktopSidebar의 `isAuthenticated` 사용은 로그인/로그아웃 버튼 분기(:142)만 확인, 항목 숨김 여부는 미확인.

### 1-3. loading.tsx 보유 라우트

admin: accounts, 루트, logs, pending, privacy-trades, settings, trades, users / main: accounts, accounts/new, accounts/[id], accounts/[id]/edit, strategies/[sid], strategies/[sid]/edit, strategies/new, strategies/[sid]/reconfigure-vr, dashboard, finance(그룹 공통), finance/new, finance/[id]/edit, finance/budgets/[type], settings, stats, stats/benchmark, strategies / pending, rejected.
loading 없음: `/admin/users`는 있음, `/finance/bulk-register`(finance/loading.tsx가 상위에서 커버, 미확인), `/stats/backtest`(stats/loading.tsx 상위).

### 1-4. Route Handler 표 (24개)

| 경로 | 메서드 | 역할 | 비고 |
|---|---|---|---|
| `/api/accounts/[[...path]]` | GET POST PUT PATCH DELETE | 프록시 → trading(8081) | route.ts 6줄 |
| `/api/admin/[[...path]]` | GET POST PUT PATCH DELETE | 프록시 → api | 23줄(직접 구현 — 프록시 헬퍼 미사용, 이유 미확인) |
| `/api/auth/logout` | POST | 인증(쿠키 삭제+서버 로그아웃) | 35줄 |
| `/api/auth/me` | GET, DELETE | 인증(내 정보·탈퇴) | 44줄 |
| `/api/auth/reapply-done` | POST | 인증(재신청 완료 쿠키) | 31줄 |
| `/api/auth/refresh` | POST | 인증(AT 갱신) | 33줄 |
| `/api/auth/status-stream` | GET | SSE (PENDING 승인 감시) | 36줄 |
| `/api/backtest` | GET | 프록시 → trading | |
| `/api/client-errors` | POST | 프록시(비인증 허용, 클라이언트 오류 리포트) | |
| `/api/crypto-market-indicators` | GET | 프록시 → trading(비인증) | |
| `/api/daily-trades` | GET | 프록시 → trading | |
| `/api/fcm/tokens` | POST | FCM 토큰 등록 | 23줄 |
| `/api/fcm/tokens/[token]` | DELETE | FCM 토큰 삭제 | 22줄 |
| `/api/finance/[[...path]]` | GET POST PUT PATCH DELETE | 프록시 → api | |
| `/api/health` | GET | 헬스체크 | 5줄 |
| `/api/market/[[...path]]` | GET | 프록시(비인증) | |
| `/api/orders/[[...path]]` | GET DELETE | 프록시 → trading | |
| `/api/runtime-config` | GET | 프록시(비인증, no-store) | |
| `/api/settings/[[...path]]` | GET POST PUT PATCH DELETE | 프록시 → api | |
| `/api/stats/[[...path]]` | GET | 프록시 (housing-benchmark*만 api, 나머지 trading) | |
| `/api/trades/stream` | GET | SSE (체결 알림, undici agent) | 46줄 |
| `/api/trading-cycles/[[...path]]` | GET POST PUT PATCH DELETE | 프록시 → trading | |
| `/auth/callback` | GET | 카카오 OAuth 콜백 → 토큰 쿠키·상태별 redirect | 103줄 |
| `/firebase-messaging-sw.js` | GET | FCM 서비스 워커 서빙 | 27줄 |

(상세 라우트 핸들러 메서드는 코드 `export const { … } = createProxyRoute` 기준. 프록시 헬퍼가 PUT/PATCH 등을 허용하는 것과 실제 UI가 쓰는 메서드의 차이는 3절 참조.)

---

## 2. 기능(동작) 전수표

범례: 있음(file:line) / 없음. "없음"은 해당 리소스를 다루는 UI 파일에서 mutation 훅·라우트·버튼을 grep으로 찾지 못한 것(entities의 훅 전수 호출자 조사 결과: UI 미호출 훅 0개 — `userKeys`는 키 객체). 앱 전체에 **CSV·내보내기·파일 가져오기·실행 취소(되돌리기) 구현이 없다** (grep `csv|Blob(|download=|type="file"|undo` → 0건. `Undo2` 아이콘은 공유 해제 버튼용 ShareableRowActions.tsx:57로 되돌리기 기능 아님). 일괄 처리는 자산 기록 다중 삭제(AssetRecordList.tsx:53)와 전월 일괄 등록(BulkRegisterForm.tsx:140) 둘뿐. 사용자 UI에 "준비 중/TODO/곧 지원" 문구는 0건.

### 2-1. 사용자 리소스 대칭 행렬

| 리소스 | 목록 | 상세 | 등록 | 수정 | 삭제 | 복제 | 검색·필터 | 정렬 | 내보내기 | 가져오기 | 일괄 | 되돌리기 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 계좌 | 있음 AccountsPageContent(→AccountsGrid.tsx:50 broker 필터) | 있음 /accounts/[id] | 있음 CreateAccountStepper(ConfirmStep.tsx:20) | 있음 EditAccountForm.tsx:54, 자격증명 CredentialsCard.tsx:27(MOCK 제외 EditAccountForm.tsx:117) | 있음 EditAccountForm.tsx:55 | 없음 | 필터만(증권사) AccountsGrid.tsx:50, 검색 없음 | 없음(MOCK 후순위 고정 sortAccounts.ts:7) | 없음 | 없음 | 없음 | 없음 |
| 전략(전 종류) | 있음 /strategies(AllStrategiesList), 계좌 상세 StrategyList | 있음 /accounts/[id]/strategies/[sid] | 있음 StrategyFormPage(useStrategyFormEffects.ts:40, DcaStrategyForm.tsx:87) | 있음 :41 (/edit), VR 재설정 ReconfigureVrForm.tsx:115, DCA reconfigure DcaStrategyForm.tsx:88 | 있음 useManageStrategyMutations.ts:23(삭제)·:24(보관) | 없음 | 없음(필터/검색 없음) | 없음 | 없음 | 없음 | 없음 | 없음(보관 후 재개 UI는 resume :22 = 일시중지 재개만) |
| 전략 운영 동작 | — | — | 일시중지/재개 useManageStrategyMutations.ts:21-22, 즉시 실행 :54, 보관 :24 | 투자금 추가/인출 CapitalForm.tsx:84-85(PRIVACY·INFINITE·DCA, 사이클 진행 중만 — capitalAdjustment.ts:4) | — | — | — | — | — | — | — | — |
| 주문(미리보기·실주문) | 있음 NextOrderCard(미리보기), StrategyOrderHistory.tsx:48(이력, 기간 필터 OrderHistoryFilters) | 없음(주문 단건 상세 없음) | — | — | 취소 전체/단건 NextOrderCard.tsx:171-172 | — | 기간 필터 OrderHistoryFilters.tsx | 있음 OrderRows.tsx:56 (방향·유형·종목·주문가·수량) | 없음 | — | 전체 취소 NextOrderCard.tsx:171 | 없음 |
| 사이클/체결 이력 | 있음 CycleHistoryTable(계좌 TradesTab.tsx:12, 전략 StrategyTradesTab.tsx:15), DCA 회차 DcaExecutionHistory.tsx:48 | 없음 | — | — | — | — | 기간 필터(DcaExecutionFilters.tsx 포함) | 없음(OrderRows만) | 없음 | — | — | — |
| 통계(성과) | 있음 StatsOverview(CyclePerformanceList) | — | — | — | — | — | 전략유형 토글 StrategyTypeFilterToggle.tsx, 기간 | 미확인 | 없음 | — | — | — |
| 벤치마크 | 비교 결과 BenchmarkResult | — | — | — | — | — | 자산·기간·ETF/지역 필터 BenchmarkFilterFields | — | 없음 | — | — | — |
| 백테스트 | 실행 결과(저장 목록 없음) | — | 실행 features/backtest/run-backtest | — | — | — | 폼 입력 | — | 없음 | — | — | — |
| 시장 지표 | 공포탐욕 FearGreedSection, 크립토 지표 CryptoMarketSection, 주간 휴장 캘린더 WeeklyMarketCalendar.tsx, 시장 차트 MarketChartCard | — | — | — | — | — | 없음 | — | 없음 | — | — | — |
| 가계부 거래(수입/소비/저축) | 있음 FinanceRecordList.tsx | 없음(행 내 펼침/다이얼로그만, 상세 라우트 없음) | 있음 TransactionFormDialog.tsx:70 | 있음 :71 | 있음 FinanceRecordList.tsx:73 | 있음 FinanceRecordList.tsx:228(onDuplicate) | 검색 :179 `type=search` + 카테고리 필터 | 있음 :93 (날짜·카테고리·금액·메모) | 없음 | 없음(일괄 등록 폼 입력은 있음) | 행 일괄 삭제 없음 | 없음 |
| 자산 기록 | 있음 AssetRecordList | 없음(수정 라우트가 상세 역할) | 있음 /finance/new AssetForm.tsx:68 | 있음 /finance/[id]/edit AssetForm.tsx:69 | 있음 행 단건 AssetRecordRows.tsx:61 + 다중 AssetRecordList.tsx:53 | 있음 AssetRecordRows.tsx:57 | 필터(자산군·시장) AssetRecordList.tsx:66-67, 텍스트 검색 없음 | 있음 AssetRecordRows.tsx:20(SORT_OPTIONS 10키), 기본 체인 AssetRecordList.tsx:87 | 없음 | 없음 | 있음(다중 삭제·월 체크 ToggleMonthlyCheckButton.tsx:15·일괄 등록) | 없음 |
| 월 마감/체크 | 월별 체크 AssetRecordCheck | — | 설정 ToggleMonthlyCheckButton.tsx:15 | (토글) | (토글) | — | — | — | — | — | — | 토글 해제로 사실상 가능(마감 해제 UI 존재 여부 코드로 미확인) |
| 재무계좌 | AccountManager | 없음 | AccountFormDialog.tsx:45 | :46 | DeleteAccountDialog.tsx:24 | **없음**(ShareableRowActions에 onDuplicate 미전달, AccountManager.tsx:159-167) | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 |
| 카테고리 | CategoryManager(트리) | 없음 | CategoryFormDialog.tsx:59 | :60 | CategoryManager.tsx:41 | **없음**(CategoryRow.tsx:52-57: onShare·onEdit·onDelete만) | 없음 | 정렬 고정 sortCategoryTree | 없음 | 없음 | 없음 | 없음 |
| 예산 | BudgetManager(/finance/budgets/[type]) | 없음 | BudgetForm.tsx:63 | :64 | BudgetManager.tsx:137 | 있음 BudgetManager.tsx:224(onDuplicate) | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 |
| 그룹 공유 | GroupManager, GroupMemberList | 없음 | 초대 생성 InviteDialog.tsx:41, 초대 수락 AcceptInvitationForm.tsx:16 | 없음(그룹 생성/삭제/이름변경 API 자체 없음 — GroupManager.tsx:27 주석) | 멤버 제거 GroupMemberList.tsx:73, 탈퇴 LeaveGroupDialog | — | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 |
| 항목 공유/해제 | 거래 FinanceRecordList.tsx:74-75, 자산 AssetRecordList.tsx:54-55, 계좌 AccountManager.tsx:76-77, 예산 BudgetManager.tsx:138-139, 카테고리 CategoryManager.tsx:43-44 | — | 공유 | — | 공유 해제 | — | — | — | — | — | — | — |
| 전략 제안(가계부) | StrategySuggestionManager | — | — | 있음 StrategySuggestionManager.tsx:15 | — | — | — | — | — | — | — | — |
| 설정 | 닉네임 NicknameEditor.tsx:23, 테마 features/settings/theme-select + ThemeToggle(DesktopSidebar.tsx:134), 알림 채널 NotificationSettings.tsx:25, 매매 알림 토글 TradingAlertToggle.tsx:17, 텔레그램 연결/해제 useTelegramConnectForm.ts:16 · TelegramSection.tsx:24, FCM 토큰 등록/해제 NotificationSettings.tsx:6·73, 로그아웃 LogoutButton, 탈퇴 DeleteAccountButton.tsx:18, 금액 숨김 HideAmountsToggle | | | | | | | | | | | |
| 인증 | 로그인(카카오) login/page.tsx:33, 승인 대기 PendingStatusWatcher(SSE), 반려 /rejected, 재신청 RejectedReapplyButton.tsx:40 · ReapplyButton(/pending) | | | | | | | | | | | |

### 2-2. 관리자 리소스 행렬

| 리소스 | 목록 | 등록 | 수정 | 삭제 | 검색·필터 | 정렬 | 내보내기 | 비고 |
|---|---|---|---|---|---|---|---|---|
| 가입 승인 | /admin/pending, /admin(개요 5건) | — | 승인/반려 ApproveRejectButtons.tsx:28-29 | — | 없음 | 없음 | 없음 | 개요에 "전체 보기" 링크 1개 |
| 사용자 | /admin/users AdminUsersTable(페이지네이션) | — | 역할 변경 ChangeRoleButton.tsx:33 | 탈퇴 처리 WithdrawUserButton.tsx:26 | 기간 UrlRangeFilterBar(AdminUsersContent.tsx:27)만, 텍스트·상태 필터 없음 | 없음 | 없음 | |
| 계좌 현황 | /admin/accounts | 없음 | 없음 | 없음 | 소유자·증권사·전략유형 필터 AdminAccountsFilterBar.tsx:45-73 + 기간 | 없음 | 없음 | 읽기 전용 |
| 거래(전략 상태) | /admin/trades AdminTradesWorkbench | — | 전략 상태 변경 AdminTradesWorkbench.tsx:50 | — | 기간·증권사·계좌 선택 :75 | 없음 | 없음 | api-types의 `manual-fills`·`trade-dates` 엔드포인트는 UI 호출 없음(3-3) |
| PRIVACY 기준표 | /admin/privacy-trades 차트+표 | 기준 생성 PrivacyBaseFormDialog.tsx:51, 주문 추가 PrivacyOrderFormDialog.tsx:36 | 기준 수정 :52, 주문 수정 :37 | 주문 삭제 AdminPrivacyBaseTable.tsx:91, **기준 삭제 없음** | 기간 프리셋 | 없음 | 없음 | |
| 로그(감사/에러/이상징후) | /admin/logs 3섹션 | — | — | 에러 로그 삭제 ErrorLogsSectionClient.tsx:30(soft delete) | 유형·기간·사이즈 | 없음 | 없음 | 감사 로그·이상징후는 삭제 없음(정상) |
| 운영 설정 | /admin/settings | — | 수정 AdminSettingsForm.tsx:102 | — | — | — | — | 가입 승인 필수·broker·전략 enabled·필드 허용값·벤치마크 |
| 공통 카테고리 | SystemCategoryManager | CategoryFormDialog.tsx:61 | :62 | SystemCategoryManager.tsx:31 | 없음 | 고정 | 없음 | |

### 2-3. 같은 종류 리소스 간 비대칭 (실제 코드 확인한 것만)

1. **복제**: 거래(FinanceRecordList.tsx:228)·자산 기록(AssetRecordRows.tsx:57)·예산(BudgetManager.tsx:224)은 복제 있음. 재무계좌(AccountManager.tsx:159-167)·카테고리(CategoryRow.tsx:52-57)는 없음. 전략·계좌(증권사 계좌)도 복제 없음.
2. **상세 화면**: 거래·자산·예산·재무계좌·카테고리 모두 별도 상세 라우트 없음. 자산 기록만 "수정 전용 라우트" 보유(`/finance/[id]/edit`), 거래·예산·계좌·카테고리는 다이얼로그 수정. → 같은 가계부 안에서 수정 UX가 라우트(자산) vs 다이얼로그(나머지) 2종.
3. **검색**: 거래 목록만 텍스트 검색(FinanceRecordList.tsx:179). 자산 기록·예산·계좌·카테고리·관리자 모든 목록은 없음(자산은 칩 필터만).
4. **정렬 UI**: 거래(FinanceRecordList.tsx:93)·자산 기록(AssetRecordRows.tsx:20)·주문(OrderRows.tsx:56)·크립토 보유(CryptoHoldingsCard.tsx:54)만 사용자 정렬. 사이클 이력, 관리자 목록 전부는 없음.
5. **일괄 처리**: 자산 기록만 다중 선택 삭제(AssetRecordRows.tsx:73-140, AssetRecordList.tsx:53). 거래는 다중 선택 없음 — 같은 "기록 목록"인데 한쪽만 일괄 삭제 가능.
6. **삭제**: 관리자 PRIVACY 기준은 생성·수정만, 삭제 훅 없음(entities/privacy/api에 delete base 함수 없음; 주문만 deleteAdminPrivacyOrder). 감사 로그·이상징후는 삭제 없음, 에러 로그만 soft delete.
7. **투자금 조정**: PRIVACY·INFINITE·DCA에만 추가/인출 버튼(capitalAdjustment.ts:4). VR은 버튼 없이 VR 재설정 화면(reconfigure-vr)에서 추가·인출(page.tsx description "투자금을 추가합니다"). DCA는 reconfigureDca 별도(DcaStrategyForm.tsx:88).
8. **주문 미리보기·즉시 실행**: DCA는 미리보기 미지원(page.tsx:38, DcaStrategyDetail.tsx:84, 409). INFINITE/PRIVACY/VR은 NextOrderCard. 대신 DCA는 회차 이력(DcaExecutionHistory.tsx:48).
9. **공유**: 거래·자산·계좌·예산·카테고리 5종에 공유/해제 있음. 그룹 자체는 생성·삭제·이름변경 API가 없고 초대 발급으로만 생김(GroupManager.tsx:27).
10. **삭제 후 이동**: 전략 삭제/보관 → `/accounts/{id}`(StrategyDetail.tsx:43-44, DcaStrategyDetail.tsx:97-98). 계좌 삭제 → `/accounts`(EditAccountForm.tsx:77). 자산 기록은 폼 완료 → `/finance`(AssetFormPage.tsx:15).
11. **보관 해제**: archive(strategy api:192) 후 되돌리는 API 함수 없음(resume은 일시중지 해제용 :196). 보관 전략은 /stats ArchivedStrategies.tsx:52에서 목록·삭제만(ArchivedRow onRemove :25).

---

## 3. 끊긴 흐름 · 빠진 상태

### 3-1. UI 미사용 엔드포인트 (api-types.ts paths 119개 대조)

방법: `shared/lib/api-types.ts`의 path 키 119개를 정규화해 api-types·테스트 제외 전체 `*.ts(x)`의 `/api/...` 문자열 리터럴(템플릿 `${}`→와일드카드)과 대조, 쿼리스트링 붙는 호출은 수동 보정. 메서드 단위로도 142개 operation 중 다중 메서드 경로를 휴리스틱 대조(미사용 메서드 후보 2건은 findStrategy/getAdminSettings가 GET을 쓰는 오탐으로 확인 → 메서드 단위 미사용 0건, 단 휴리스틱이라 "미확인 잔여 있음").

| 경로 | api-types 줄 | 분류 | 비고 |
|---|---|---|---|
| `/api/admin/trades/manual-fills` | 560 | **UI 미사용(운영 기능)** | 수기 체결 보정 추정(이름 기준). UI 호출 없음 — 판단 필요 |
| `/api/admin/scheduler/open` | 580 | **UI 미사용(운영 기능)** | 스케줄러 수동 개장 실행 |
| `/api/admin/scheduler/close` | 597 | **UI 미사용(운영 기능)** | 스케줄러 수동 마감 실행 |
| `/api/admin/accounts/{accountId}/strategies/{strategyId}/trade-dates` | 1550 | **UI 미사용** | 관리자 전략 거래일 조회 |
| `/api/accounts/{accountId}/daily-trades` | 2231 | **UI 미사용(대체됨)** | UI는 유저 스코프 배치 `/api/daily-trades`(entities/trade/api/index.ts:74)만 사용 |
| `/api/admin/_ping` | 1567 | 내부용 | 헬스/연결 확인 |
| `/api/auth/dev-token` `dev-e2e-token` `dev-admin-token` `dev-approve/{userId}` | 463·483·523·503 | 내부용(개발/E2E) | UI 호출 없음(테스트·스크립트용) |
| `/telegram/webhook` | 198 | 내부용(외부 인바운드) | 텔레그램 → api |
| `/api/auth/kakao/callback` | 443 | route handler가 호출 | app/auth/callback/route.ts:42 (브라우저 UI 직접 호출 아님) |
| `/api/auth/approval-requests` | 540 | route handler가 호출 | app/api/auth/reapply-done/route.ts:14 |
| `/api/meta` | 1205 | 서버 컴포넌트 직접 fetch | entities/meta/api/index.ts:7 (`/api/` 프록시 우회) |
| `/api/internal/**` | — | 0개 | api-types에 `/api/internal` 경로 없음(grep 0건) |

합계: 119개 중 **UI(화면)에서 호출 안 하는 것 = 실제 사용자·운영 기능 5건**(manual-fills, scheduler open/close, trade-dates, 계좌별 daily-trades) + 내부용 7건(`_ping`, dev 4, telegram webhook, …) + route handler 전용 2건. 나머지 정규화상 NONE으로 보였던 share/unshare 10개, stats 6개, admin users/trades/logs/accounts 등은 `shareToggle` 헬퍼·쿼리스트링 템플릿 때문에 오탐이라 수동으로 사용 확인(entities/finance/api/index.ts:39, entities/stats/api/index.ts:19-98, entities/admin/api/index.ts:21-76).

### 3-2. UI에는 있으나 서버/계약이 없거나 제한되는 것 (반대 방향)

- 보관(archive) 해제: UI 목록에는 보관 전략이 보이나(widgets/stats-overview/ArchivedStrategies.tsx:52) 해제 API 없음(entities/strategy/api/index.ts:192-197 archive·resume만).
- 그룹: 생성/삭제/이름변경 API 없음(features/finance/manage-group/GroupManager.tsx:27 주석).
- `/pending` 타임라인 3번 항목 문구 "KIS API 자격증명 입력"(app/pending/page.tsx STEPS) — KIS는 삭제 예정이라 문구가 어긋나게 될 지점. 다른 증권사(TOSS 등) 계좌 연동을 안내하지 않음.
- 반려 사유: app/rejected/page.tsx는 고정 문구("관리자가 가입 신청을 반려했습니다…")만 표시, 서버에서 받은 사유를 쓰지 않음(해당 페이지는 getMe 호출 없음). 서버가 사유를 제공하는지는 미확인.

### 3-3. 화면별 상태 처리 (확인한 사실)

| 화면 | 빈 상태 | 조회 실패 | 비회원/권한 | 등록·삭제 후 이동 | 막다른 화면/비고 |
|---|---|---|---|---|---|
| /dashboard | DashboardEmpty(DashboardContent.tsx:19,39) | 계좌 쿼리 실패 분기 DashboardContent.tsx:29 | 비회원 전용 분기 :19(계좌 쿼리 `enabled: isAuthenticated` :16) | — | 정상 |
| /accounts | AccountsPageContent `action=` 빈 상태(:35) | 미확인 | proxy 보호 | 계좌 생성→`/accounts/{id}` ConfirmStep.tsx:42; 삭제→`/accounts` EditAccountForm.tsx:77; 수정→`/accounts/{id}` :63 | |
| /accounts/[id] | 전략 없음 StrategyList 빈 상태+NewStrategyButton(StrategyList.tsx:23) | 포트폴리오 prefetch 실패 `.catch(() => undefined)`(page.tsx) | notFound() | — | 뒤로: eyebrowHref=/accounts (AccountDetailContent.tsx:44) |
| /accounts/[id]/strategies/[sid] | — | **account/strategy 데이터 없으면 `return null`(StrategyDetailContent.tsx:43) → 빈 화면** | notFound() page.tsx | 삭제·보관→`/accounts/{id}` StrategyDetail.tsx:43-44 | 뒤로: eyebrowHref(:55 부근) |
| 전략 등록/수정 | 증권사에 활성 전략종류 없을 때 안내 StrategyTypeSection.tsx:31(`strategyTypes.length===0`) | runtime-config 실패 RuntimeConfigError(StrategyForm.tsx:78) | notFound() | 완료→backHref(StrategyFormPage.tsx:24-27) | |
| 투자금 추가/인출 | — | — | — | — | 버튼이 **비활성+사유가 아니라 숨겨짐**: 사이클 미진행·VR·잔액 0이면 StrategyDetailContent.tsx:66-76에서 렌더 안 됨. 사용자는 이유를 알 수 없음 |
| /stats, /stats/benchmark, /stats/backtest | StatsOverview 내부(미확인 상세) | benchmark `BenchmarkStates.tsx` 존재 | proxy 보호 | — | |
| /finance 자산 | AssetRecordList 빈 결과(미확인 상세) | 미확인 | notFound(token 없음, finance/new·[id]/edit page.tsx) | 저장→`/finance` AssetFormPage.tsx:15; 일괄 등록→`/finance` BulkRegisterForm.tsx:191 | 복제→`/finance/new?duplicateFrom=` |
| /finance/{income,expense,saving} | FinanceRecordList.tsx:190(`sorted.length===0`) | useFinanceFlowData `isFlowError`·`isBudgetsError` | proxy 보호 | 다이얼로그 닫힘(이동 없음) | 예산 관리 진입은 FinanceHeader.tsx:70 |
| /finance/budgets/[type] | 미확인 | 프리패치 `.catch` | 잘못된 slug→notFound() | 다이얼로그 | 뒤로 eyebrowHref=`/finance/{slug}` |
| /finance/settings | 각 매니저 내부 | AssetSettingsPanel 자체는 에러 처리 없음(하위 위임) | | | 예산 관리 링크 없음(AssetSettingsPanel.tsx:18 주석에 이관 명시) |
| /settings | — | `widgets/settings` err=1 | proxy 보호 | 탈퇴→(DeleteAccountButton, 이동 대상 미확인) | |
| /pending | — | `getMe` 실패 시 기본값(.catch(() => null), page.tsx) | 비인증도 proxy 통과, 렌더는 됨 | SSE로 ACTIVE→/dashboard, REJECTED→/rejected PendingStatusWatcher.tsx:14-16 | **사이드바 없음 — 로그아웃·텔레그램·재신청 외 이동 수단 없음(의도적 격리, app/pending/layout.tsx)** |
| /rejected | — | — | — | 재신청→/pending RejectedReapplyButton.tsx:40 | 로그아웃 외 없음 |
| /admin/** | 개별 위젯 | `app/(admin)/admin/error.tsx` | proxy: ADMIN 아니면 /dashboard | 승인·반려 후 이동 없음(목록 갱신) | **/admin/pending은 내비에 없음**, 상세 라우트 없음 |
| /admin/settings | — | — | page.tsx:17 `if (!token) redirect('/login')` — 다른 admin page는 이 분기 없이 `token ? … : []` 식 | | |

### 3-4. grep 신호 (개별 화면 확인 전, 참고용)

- 쿼리를 쓰는데 에러 처리 키워드(`isError|error|ErrorDisplay|QueryError`)가 없는 폴더: widgets/layout(2쿼리), widgets/pull-to-refresh, features/finance/save-transaction, features/settings/notification-prefs, features/strategy/manage-strategy.
- 빈 상태 키워드(`EmptyState|length === 0|isEmpty|없습니다|비어`)가 없는 쿼리 사용 폴더: account-card, market-holiday-calendar, settings, strategy-card, save-asset, manage-strategy-suggestions, layout 등 11곳(대부분 상세/설정이라 빈 상태 의미가 약함 — 판정은 조립자).
- `loading.tsx` 보유 라우트 27개, `error.tsx`는 app/(main)/(admin)/global 4곳 + not-found 1곳. `/finance/bulk-register`·`/stats/backtest`는 자체 loading.tsx 없음(상위 finance/loading.tsx, stats/loading.tsx 상속 — Next 규칙 기준 추정, 미확인).
- 사용자 UI "준비 중/TODO/FIXME/곧 지원" 텍스트: 0건. `placeholder=` 입력 속성만 존재.
- disabled 사유: `disabled={...}` 187개 중 상태 플래그(isPending 등) 외 조건 비활성 대표 예 — WithdrawUserButton.tsx:38 본인 행(aria-describedby로 사유 제공 `self-withdraw-…` :40), ShareableRowActions.tsx:28·33 `locked`+`lockTitle`(사유 title 제공), 계좌 스텝 "다음" 버튼 AccountInfoStep.tsx:108·ApiStep.tsx:193(`!valid`/`!canProceed` — 사유 표시는 인접 필드 에러 의존, 버튼 자체 사유 없음). 187개 전수 확인은 하지 않음.
- 내비: 비회원도 사이드바 6항목 전부 렌더(DesktopSidebar.tsx:62-100 NAV_ITEMS에 isAuthenticated 필터 없음), 보호 경로 클릭 시 `/login?next=`. 하단 탭도 동일(MobileBottomNav.tsx:10-15, isAuthenticated 미사용 — grep 0건).

---

## 4. 겹치는 기능

| # | 겹침 | 위치 A | 위치 B | 무엇이 겹치나 |
|---|---|---|---|---|
| 1 | 전략 카드 목록 | `/strategies` widgets/all-strategies/AllStrategiesList.tsx:106 | `/accounts/[id]` widgets/strategy-list/StrategyList.tsx:36 | 같은 `StrategyCard`를 계좌별 그룹(A) vs 한 계좌(B)로 렌더. 등록 버튼도 둘 다(AddStrategyButton / NewStrategyButton) |
| 2 | 주문 미리보기 프리패치 3경로 | app/(main)/strategies/page.tsx:35 `getStrategyOrderPreviewsById` | app/(main)/accounts/[id]/page.tsx `getAccountOrderPreviews`+`seedOrderPreviews`, strategies/[sid]/page.tsx:40 `orderPreviewQueryOptions` | 전략 목록·계좌 상세·전략 상세가 각각 다른 API 경로로 같은 "다음 주문 미리보기"를 채움 (DCA는 제외 — 409) |
| 3 | 사이클/체결 이력 표 | 계좌 상세 widgets/account-detail/TradesTab.tsx:21 | 전략 상세 widgets/cycle-history/StrategyTradesTab.tsx:12 | 같은 `CycleHistoryTable`, 범위만 계좌/전략. 추가로 /stats `CyclePerformanceList`(사이클 성과)도 사이클 목록 |
| 4 | 보관 전략 노출 | /stats widgets/stats-overview/ArchivedStrategies.tsx:52, CyclePerformanceList.tsx:64(`status==='ARCHIVED'`) | /strategies 목록(AllStrategiesList) | 보관 전략이 목록에서 어떻게 숨는지 코드로 미확인(listAllStrategies 서버 필터 여부 미확인). 삭제는 /stats에서 가능(ArchivedRow onRemove) |
| 5 | 휴장·시장 상태 | /dashboard WeeklyMarketCalendar.tsx(휴장 월 캘린더 + 일별 체결 `useDailyTradesRangeQuery`:225) | 전략 상세 widgets/strategy-detail/useTodayMarketStatus.ts:3 | 같은 `useMarketSessionQuery`·`useMonthlyHolidaysQuery`로 오늘 장 상태 계산 |
| 6 | 벤치마크 vs 백테스트 | widgets/benchmark-comparison/model/useEtfBenchmarkOptions.ts:2-8 | features/backtest/run-backtest/model/useBacktestForm.ts:8-17 | 둘 다 runtime-config(ETF 허용 목록·기본값)로 종목 선택지 구성, 둘 다 `/stats/*` 탭(StatsHeader.tsx:9-11), 기간 입력·비교 차트 구조 유사. 데이터 소스는 상이(내 전략 성과 vs 가상 시뮬레이션 `/api/backtest`) — 입력 필드 공유 모듈은 없음 |
| 7 | 주택 벤치마크 두 위젯 | widgets/benchmark-comparison/Housing*.tsx(1,503줄) | widgets/housing-quintile-trend(396줄) | 같은 /stats/benchmark 페이지(BenchmarkPageContent.tsx:15-19)에서 주택가격 비교 + 분위 추이를 별개 위젯·API로 이중 제공 |
| 8 | 텔레그램 연동 UI | /settings TelegramSection(SettingsPageContent.tsx:46) | /pending PendingTelegramConnect(app/pending/page.tsx:61) | 같은 features/settings/telegram-connect를 두 화면이 각자 다른 컴포넌트로 사용(연결·해제 훅 공통 useTelegramConnectForm.ts:16) |
| 9 | 투자금 추가·인출 | 전략 상세 다이얼로그 StrategyDetailContent.tsx:66-76(CapitalForm) | VR 재설정 라우트 reconfigure-vr(page.tsx description: "투자금을 추가합니다", ReconfigureVrForm InjectSection/WithdrawSection :144-146) | VR은 다이얼로그 경로 대신 재설정 화면 안에 추가·인출이 포함. 같은 동작이 2경로(VR만 별도 UI) |
| 10 | 가입 승인 대기 | /admin 개요(AdminOverviewContent.tsx:35) | /admin/pending | 같은 `adminUsersQueryOptions('PENDING')`(app/(admin)/admin/page.tsx:19, pending/page.tsx:15), 사이드바에는 /admin/users만 — /admin/users 목록에도 status 포함 여부는 미확인 |
| 11 | 전략 상태 변경 | 사용자 전략 상세 일시중지/재개/보관/삭제(useManageStrategyMutations.ts:21-24) | 관리자 /admin/trades 상태 변경(AdminTradesWorkbench.tsx:50) | 동일 리소스 상태 전이를 사용자·관리자 UI 2군데가 가짐(관리자는 전략 상태만) |
| 12 | 계좌 목록 쿼리 소비처 | DashboardContent.tsx:16, AccountsPageContent.tsx:12, AllStrategiesList.tsx:54, CyclePerformanceList.tsx:44, WeeklyMarketCalendar.tsx:184 | | 동일 `useAccountsQuery` 5개 위젯 — 중복이 아니라 캐시 공유 |
| 13 | 계좌 등록 진입점 | NewAccountButton 6곳: accounts/page.tsx:40, AccountsPageContent.tsx:35, DashboardEmpty.tsx:38·68, DashboardOverview.tsx:20, AllStrategiesList.tsx:42 | | 진입 중복(같은 라우트 `/accounts/new`) |
| 14 | 테마 설정 | 데스크톱 사이드바 ThemeToggle(DesktopSidebar.tsx:134) | /settings ThemeCards(SettingsPageContent.tsx:9) | 같은 기능 2곳. 모바일은 사이드바가 없어 /settings가 유일(MobileHeader에 ThemeToggle 없음 — grep 결과 DesktopSidebar만) |
| 15 | 대시보드 vs 통계 수익 요약 | /dashboard: 수익 KPI 없음 — 시장 패널(캘린더·공포탐욕·크립토)과 계좌 유무 분기만(DashboardOverview.tsx:10-45, DashboardContent.tsx:15-40) | /stats StatsKpiRow.tsx:18-32(실현손익·미실현 평가손익·운용 원금) | 지시서가 예시로 든 "대시보드와 통계의 수익 요약"은 현재 코드에서 겹치지 않음(대시보드에 요약 없음). 계좌 상세 AccountSummaryCard.tsx:75-77(예수금·평가금·미배정 예수금)과 통계 KPI는 지표가 다름 |
| 16 | 자산 요약 vs 거래 요약 | /finance AssetOverview/AssetTrend/AssetComposition(3위젯) | /finance/{income,expense,saving} FinanceSummary/FinanceTrend(2위젯) | 월 선택·추이 차트·카테고리 집계 구조가 두 갈래로 따로 구현(위젯 6개, 공통 추상화 여부는 미확인) |

---

## 5. 조건부 · 특수 분기로 살아 있는 기능

### 5-1. 증권사/거래소(broker) 분기

broker 코드 6종: KIS·TOSS·MOCK·UPBIT·MERITZ·BINANCE (shared/lib/api-schema.ts:56-65 `BROKER_MARKET`). 삭제 결정: **KIS, UPBIT = 삭제 예정**.

| 분기 | 위치 | 효과 |
|---|---|---|
| 계좌 생성 가능 broker | features/account/create-account/steps/BrokerStep.tsx:28-29, CreateAccountStepper.tsx:80 | runtime-config `brokers[code].enabled===true`만 노출. 서버 설정에 따라 UI가 달라짐 |
| 자격증명 입력 방식 | ApiStep.tsx:31·42·53 (TOSS/UPBIT/BINANCE별), :163 MERITZ 안내, :168-169 업비트/바이낸스 키 가이드(허용 IP는 runtime-config `brokers.X.allowedIp`) | KIS는 "연결 테스트 통과 후 다음"(ApiStep.tsx:116 주석), TOSS는 입력만으로 활성 — **KIS(삭제 예정) 전용 분기**, UPBIT 가이드 ApiStepParts.tsx:134-146(삭제 예정) |
| 계좌번호 입력 생략 | AccountInfoStep.tsx:59 (MOCK·UPBIT·MERITZ·BINANCE), api-schema.ts:88 `isKeyOnlyBroker` | |
| MOCK(모의계좌) | 자격증명 카드 숨김 EditAccountForm.tsx:117, 포트폴리오 조회 생략 accounts/[id]/page.tsx:38 · AccountDetailContent.tsx:30, 벤치마크 대상 제외 useBenchmarkStrategyOptions.ts:25, 목록 후순위 sortAccounts.ts:7·BrokerStep.tsx:30·AdminSettingsForm.tsx:197, 삭제/취소 문구 분기(DeleteStrategyDialog.tsx:48, CloseStrategyDialog.tsx:80, NextOrderCard.tsx:233, EditAccountForm.tsx:125), 전략 등록 폼 mock 배지 StrategyForm.tsx:63 | |
| 크립토(UPBIT·BINANCE) 전용 화면 | 계좌 상세 우측 패널 AccountDetailTabs.tsx:26, 요약 카드 AccountSummaryCard.tsx:81-95(총자산·예수금 단위), CryptoHoldingsCard(보유 정렬 :54), 크립토 포트폴리오/시세 쿼리(entities/trade/api: getCryptoPortfolio·getCryptoPrices), 전략 카드 DcaStrategyCard.tsx:26, 주간 캘린더 주식 계좌 있을 때만 오늘 상태 WeeklyMarketCalendar.tsx:150·187, DCA 시세 쿼리 `enabled: !isCrypto` DcaStrategyDetail.tsx:47 | UPBIT 삭제 예정이면 BINANCE만 남음 — 크립토 분기 코드 자체는 BINANCE가 쓰므로 유지(판정 필요) |
| 통화 | brokerCurrency → USD/KRW/USDT api-schema.ts:93-95 (CapitalForm·StrategyDetailContent.tsx:42) | KRW는 UPBIT 전용 |
| 대시보드 CryptoMarketSection | app/(main)/dashboard/page.tsx:49 `bottomPanels` — 계좌 보유와 무관하게 항상 렌더(비회원 포함), `/api/crypto-market-indicators` 비인증 | 크립토 계좌 없어도 노출 |

### 5-2. 전략 종류 분기 (INFINITE · PRIVACY · VR · DCA)

| 분기 | 위치 | 효과 |
|---|---|---|
| 등록 가능 전략 | features/strategy/create-strategy/model/useStrategyFormData.ts:19-20, StrategyForm.tsx:73-76 | runtime-config `strategies[code].enabled` + 종목 목록으로 필터, 수정 시엔 전체 노출 |
| DCA 전용 폼·상세·카드 | StrategyForm.tsx:86(`type==='DCA'`→DcaStrategyForm), strategies/[sid]/page.tsx(DCA 주문 미리보기 생략), StrategyDetailContent.tsx:(DcaStrategyDetail vs StrategyDetail), DcaStrategyCard.tsx, DcaExecutionHistory.tsx | DCA는 시드·분할·VR 무관, 미리보기·즉시 주문 미지원(409) |
| VR 전용 | VR 재설정 라우트(page.tsx `hasVr` 아니면 notFound), 상세 "VR 재설정" 버튼 StrategyDetailContent.tsx:57(`strategy.vr &&`), StrategyCard.tsx:170 `isVr = strategy.vr != null`, 등록 폼 VrSettingsSection | |
| PRIVACY 전용 | 관리자 /admin/privacy-trades(전용 메뉴·1,593줄 위젯), 투자금 조정 대상 capitalAdjustment.ts:4 | 관리자 사이드바에 "P 매매표" 별도 항목(AdminSidebar.tsx:15) |
| 투자금 조정 지원 | capitalAdjustment.ts:4 (PRIVACY·INFINITE·DCA + cycleInProgress), 인출은 장부 예수금>0 :11 | 조건 미충족 시 버튼 숨김 |

### 5-3. role · 인증 상태 · 로그인 여부

- ADMIN: `(main)` 헤더/사이드바에 관리자 링크(app/(main)/layout.tsx:34·52, DesktopSidebar.tsx:110) / `/admin/**` proxy 차단 routeByStatusAndRole(proxy.ts:186-189).
- 비회원(게스트): `/dashboard`만 접근, 나머지 보호(proxy.ts:23). 게스트는 `DashboardEmpty` + 시장 패널(DashboardContent.tsx:19), 로그인 링크(DesktopSidebar.tsx:142, layout.tsx:67). FCM·체결 알림 브리지는 인증 시만(layout.tsx:81·83).
- PENDING/REJECTED: 각자 격리 화면(proxy.ts 분기), 로그아웃·재신청·텔레그램 연결만.
- 로그인 화면 승인 안내: ApprovalNotice.tsx:8 — 서버 `auth.approvalRequired`일 때만(운영 설정으로 토글, AdminSettingsForm.tsx:184-187).

### 5-4. 환경변수 · 런타임 설정 게이트

- NEXT_PUBLIC_KAKAO_CLIENT_ID 없으면 로그인 버튼이 오류 메시지만(login/page.tsx:33-37).
- FCM: NEXT_PUBLIC_FIREBASE_* / VAPID(entities/fcm/api/index.ts:5, shared/lib/firebase.ts, app/firebase-messaging-sw.js/route.ts:3-8) — 미설정 시 빈 문자열 폴백, FcmAutoRegister.tsx:16-17은 브라우저 `Notification` 지원·권한 granted일 때만. 설정 UI(NotificationSettings.tsx)에서 수동 등록.
- API base: API_BASE_URL / NEXT_PUBLIC_API_BASE_URL / TRADING_API_BASE_URL (shared/lib/env.ts:1-16) — trading(8081) 분리 라우팅(`target:'trading'` 6개 route handler).
- 런타임 설정(`/api/runtime-config`, 비인증 허용)으로 가려지는 것: brokers.enabled, strategies.enabled+필드 허용값(기본/고정 여부), benchmarks.etf, auth.approvalRequired (entities/runtime-config/model/types.ts:28-31). 관리자 /admin/settings(AdminSettingsForm.tsx:102)에서 변경.
- feature flag 라이브러리·`NODE_ENV` 기반 UI 분기: 없음(grep 결과 NODE_ENV는 쿠키 secure 주석뿐 shared/lib/auth/refresh.ts:43).
- dev 전용: api-types의 `/api/auth/dev-*` 4개는 UI 미호출(3-1).

---

## 6. 기능별 유지 비용 신호

기준: 줄 수=테스트 제외 `*.ts(x)` 합(`wc -l`), 테스트=`*.test.*`. 커밋 수=`git log --since=6.months --oneline -- <경로>`(여러 경로 합집합), 마지막 변경=`git log -1 --format=%cs -- <경로>`. **주의: 이 저장소 첫 커밋이 2026-05-06이라 6개월 창이 사실상 전체 이력**(총 2,004 커밋)이고, 측정일(2026-11-13) 기준 모든 기능이 최근 3주 안에 변경됨 — "오래 손대지 않음" 신호는 약하다(리팩토링·카피·접근성 일괄 변경도 커밋 수에 포함).

| 기능 | 경로 | 제품 줄 | 테스트 줄 | 6개월 커밋 | 마지막 변경 | 진입점 |
|---|---|---|---|---|---|---|
| 계좌 목록·카드 | widgets/account-card<br>widgets/accounts-grid | 258 | 315 | 57 | 2026-11-10 | 1: /accounts 사이드바 |
| 계좌 등록(스텝퍼) | features/account/create-account | 929 | 532 | 75 | 2026-11-13 | 6곳 NewAccountButton |
| 계좌 수정·삭제·자격증명 | features/account/edit-account | 236 | 170 | 32 | 2026-11-13 | 1: 계좌상세 버튼 |
| 계좌 상세(포트폴리오·크립토) | widgets/account-detail<br>widgets/strategy-list<br>widgets/cycle-history | 641 | 732 | 119 | 2026-11-12 | 1: 계좌카드 |
| 엔티티 account/trade/order | entities/account<br>entities/trade<br>entities/order | 1,266 | 1,566 | 141 | 2026-11-13 | - |
| 전략 등록·수정 폼 | features/strategy/create-strategy | 3,181 | 4,328 | 199 | 2026-11-12 | 3곳 버튼 |
| 전략 상세·주문 | widgets/strategy-detail<br>widgets/strategy-card | 2,115 | 2,608 | 270 | 2026-11-13 | 2: 카드 |
| 전략 운영(중지·삭제·보관) | features/strategy/manage-strategy | 156 | 251 | 13 | 2026-11-10 | 상세 내부 |
| 투자금 추가·인출 | features/strategy/adjust-capital | 179 | 179 | 1 | 2026-11-13 | 상세 버튼(조건부) |
| VR 재설정 | features/strategy/reconfigure-vr | 409 | 407 | 29 | 2026-11-12 | 1: 상세 조건부 버튼(VR만) |
| 전략 목록(통합) | widgets/all-strategies | 120 | 222 | 45 | 2026-11-12 | 1: 사이드바 |
| 대시보드 | widgets/dashboard | 577 | 292 | 86 | 2026-11-12 | 1: 사이드바/로고 |
| 휴장 캘린더 | widgets/market-holiday-calendar | 314 | 163 | 51 | 2026-11-10 | 대시보드 내부 |
| 공포탐욕 | widgets/fear-greed-card | 360 | 242 | 36 | 2026-10-20 | 대시보드 내부 |
| 크립토 지표 | widgets/crypto-market-indicators | 673 | 466 | 28 | 2026-11-13 | 대시보드 내부 |
| 성과 통계 | widgets/stats-overview<br>entities/stats | 1,424 | 1,033 | 118 | 2026-11-10 | 2: 사이드바/탭 |
| 벤치마크(주택·ETF) | widgets/benchmark-comparison<br>widgets/housing-quintile-trend<br>app/(main)/stats/benchmark | 1,970 | 1,384 | 50 | 2026-11-10 | 1: 통계 탭(깊이2) |
| 백테스트 | widgets/backtest<br>features/backtest<br>entities/backtest | 676 | 461 | 27 | 2026-11-10 | 1: 통계 탭(깊이2) |
| 가계부 자산 | widgets/asset-overview<br>widgets/asset-trend<br>widgets/asset-composition<br>widgets/asset-record-check<br>widgets/asset-record-list<br>features/asset | 1,956 | 1,463 | 116 | 2026-11-13 | 사이드바 |
| 가계부 수입/소비/저축 | widgets/finance-summary<br>widgets/finance-trend<br>widgets/finance-record-list<br>widgets/finance-budget-progress<br>features/finance/save-transaction<br>app/(main)/finance/(dashboard)/(flow) | 1,477 | 741 | 102 | 2026-11-13 | 사이드바 서브 |
| 가계부 예산 | features/finance/manage-budgets | 454 | 477 | 45 | 2026-11-13 | 1: 탭 상단 버튼(깊이2) |
| 가계부 일괄 등록 | widgets/finance-bulk-register | 359 | 202 | 32 | 2026-11-01 | 1: 설정 탭 카드(깊이2) |
| 가계부 카테고리 | features/finance/manage-categories | 557 | 389 | 34 | 2026-11-13 | 설정 탭(깊이2) |
| 가계부 재무계좌 | features/finance/manage-accounts | 372 | 259 | 27 | 2026-11-13 | 설정 탭(깊이2) |
| 가계부 그룹·초대 | features/finance/manage-group | 442 | 136 | 18 | 2026-11-13 | 설정 탭(깊이2) |
| 가계부 전략 제안·금액숨김 | features/finance/manage-strategy-suggestions<br>features/finance/hide-amounts<br>widgets/asset-settings | 118 | 67 | 21 | 2026-11-01 | 설정 탭 |
| entities/finance | entities/finance | 2,433 | 1,510 | 72 | 2026-11-13 | - |
| 설정(계정) | widgets/settings<br>features/settings<br>entities/user<br>entities/fcm | 1,123 | 932 | 108 | 2026-11-13 | 1: 사이드바 |
| 인증·승인대기·재신청 | features/auth<br>app/pending<br>app/rejected<br>app/(auth)<br>entities/meta | 807 | 441 | 95 | 2026-11-12 | proxy |
| 관리자 사용자·승인 | widgets/admin-user-list<br>features/admin/approve-reject<br>features/admin/change-role<br>features/admin/withdraw-user | 556 | 285 | 50 | 2026-11-08 | 사이드바(pending은 개요 링크 1개) |
| 관리자 계좌 | widgets/admin-account-list<br>app/(admin)/admin/accounts | 233 | 0 | 38 | 2026-10-30 | 1: 사이드바 |
| 관리자 거래 | widgets/admin-trade-list | 469 | 380 | 75 | 2026-11-10 | 1: 사이드바 |
| 관리자 PRIVACY 기준표 | widgets/admin-privacy-trade-list<br>entities/privacy | 1,839 | 549 | 99 | 2026-11-13 | 1: 사이드바 |
| 관리자 로그 | widgets/admin-log-list<br>features/admin/logs<br>features/admin/error-logs<br>entities/error-log | 565 | 454 | 59 | 2026-11-08 | 1: 사이드바 |
| 관리자 운영 설정 | features/admin/settings<br>entities/admin-settings<br>entities/runtime-config | 892 | 734 | 41 | 2026-11-12 | 1: 사이드바 |
| 레이아웃·내비·알림 브리지 | widgets/layout | 404 | 105 | 74 | 2026-11-10 | - |

### 6-1. 줄 수 대비 진입점이 약한 기능 상위 10 (진입 약함 표시 14개 중 `제품 줄 ÷ (커밋+1)` 내림차순 = 커밋당 코드량이 커 손이 덜 간 큰 코드)

| 순위 | 기능 | 제품 줄 | 커밋 | 줄/커밋 | 마지막 변경 | 진입 약함 사유 |
|---|---|---|---|---|---|---|
| 1 | 투자금 추가·인출 | 179 | 1 | 89.5 | 2026-11-13 | 상세 버튼(조건부) |
| 2 | 벤치마크(주택·ETF) | 1,970 | 50 | 38.6 | 2026-11-10 | 1: 통계 탭(깊이2) |
| 3 | 백테스트 | 676 | 27 | 24.1 | 2026-11-10 | 1: 통계 탭(깊이2) |
| 4 | 가계부 그룹·초대 | 442 | 18 | 23.3 | 2026-11-13 | 설정 탭(깊이2) |
| 5 | 크립토 지표 | 673 | 28 | 23.2 | 2026-11-13 | 대시보드 내부 |
| 6 | 가계부 카테고리 | 557 | 34 | 15.9 | 2026-11-13 | 설정 탭(깊이2) |
| 7 | VR 재설정 | 409 | 29 | 13.6 | 2026-11-12 | 1: 상세 조건부 버튼(VR만) |
| 8 | 가계부 재무계좌 | 372 | 27 | 13.3 | 2026-11-13 | 설정 탭(깊이2) |
| 9 | 관리자 사용자·승인 | 556 | 50 | 10.9 | 2026-11-08 | 사이드바(pending은 개요 링크 1개) |
| 10 | 가계부 일괄 등록 | 359 | 32 | 10.9 | 2026-11-01 | 1: 설정 탭 카드(깊이2) |

참고: 마지막 변경이 가장 오래된 기능 = 공포탐욕 2026-10-20, 관리자 계좌 2026-10-30, 가계부 일괄 등록·전략 제안 2026-11-01, 관리자 사용자·승인/로그 2026-11-08. 커밋 수가 가장 적은 기능 = 투자금 추가·인출 1건(179줄, 상세 화면 조건부 버튼), 전략 운영 13, 그룹·초대 18.

측정 한계: 경로 묶음은 FSD 슬라이스 기준 수동 매핑이라 shared/ui 공용 컴포넌트·entities 일부(전략·통계·관리자 엔티티)는 별도 행으로 잡지 않았음("엔티티 account/trade/order"·"entities/finance" 두 행만 분리). 크립토 분기 코드·route handler(app/api 377줄)·shared 공용은 어느 기능에도 포함되지 않음.

---

## 7. memory「완료 작업 재작업 금지」재심 재료

원본: `/Users/phs/.claude/projects/-Users-phs-workspace-kista-kista-ui/memory/project_done_do_not_redo.md` (6항목). 커밋 해시는 모두 `git log -1`로 실존 확인(fd02a5b1 2026-10-24, 2b2e807b 2026-10-18, 2694d941 2026-10-18, cd5bf396 2026-10-23, 8f77d076 2026-08-20, 49cf2216 2026-10-13, 5dc6758a 2026-10-23).

### 7-1. 바이낸스(USDT) DCA UI — "활성화 완료, 재제안 금지"

- 현재 코드: 계좌 등록 BrokerStep.tsx:20, 자격증명 ApiStep.tsx:53-59(안내·링크), ApiStepParts.tsx:135·154(필요 권한 `BINANCE_REQUIRED_PERMISSIONS`, 허용 IP 안내), brokerCredentials.ts:12, AccountInfoStep.tsx:59(계좌번호 생략), 시장/통화 매핑 api-schema.ts:64(`CRYPTO_USDT`)·93-95(`USDT`). 활성 여부는 서버 runtime-config `brokers.BINANCE.enabled`(BrokerStep.tsx:28-29) — 운영 값은 UI 코드로 확인 불가(미확인, 메모는 활성화 완료로 기록).
- 메모와 코드 일치 여부: 일치(UI 존재). **불일치 1건**: 메모는 "deprecated 필드(krwCash 등) 제거 통보 완료"인데 UI에는 아직 폴백 코드가 있음 — entities/trade/api/index.ts:77-83(`krwCash`·`totalAssetKrw`·`evalAmountKrw` 폴백). 서버가 실제로 제거했는지는 미확인.
- 크립토 공통 코드는 UPBIT·BINANCE가 공유(isCryptoBroker api-schema.ts:78, 5-1절). UPBIT 삭제 시 BINANCE가 남기 때문에 크립토 분기는 유지 대상(판정 필요).
- 6절 수치: DCA 전용 파일(Dca*.tsx 폼·상세·카드·섹션·이력) 제품 1,239줄/테스트 1,113줄, 6개월 커밋 90(경로 합집합 근사), 크립토 지표 위젯 673줄/28커밋, 계좌 등록 929줄/75커밋.

### 7-2. 업비트 DCA 1차 — "빗썸 연동 안 함", 업비트 UI는 삭제 예정

- 현재 코드(삭제 예정 대상): BrokerStep.tsx:19, ApiStep.tsx:42·168(UpbitKeyGuide), ApiStepParts.tsx:134-146(`UPBIT_REQUIRED_PERMISSIONS`·UpbitKeyGuide), brokerCredentials.ts:11, api-schema.ts:62(`CRYPTO_KRW`), AccountInfoStep.tsx:59 주석. `UPBIT` 문자열 사용 파일 5곳, 로직 분기 대부분은 isCryptoBroker 공용(BINANCE와 공유). 통화 KRW 경로(MARKET_CURRENCY CRYPTO_KRW→KRW api-schema.ts:68)는 UPBIT 전용.
- 빗썸: `빗썸|BITHUMB` 전체 코드 grep 0건 — 메모와 일치(연동 흔적 없음).
- 6절 수치: 계좌 등록 929줄/75커밋(UPBIT 부분은 ApiStep·ApiStepParts 일부), 마지막 변경 2026-11-13. 메모의 "2026-11-11 KIS·업비트 삭제 결정"은 지침서 04(kista-api 쪽) 근거 — 이 레포에서 확인한 것은 UI 분기 위치뿐.

### 7-3. 대시보드 총자산·평가손익 KPI — "불필요 판정, 재제안 금지"

- 현재 코드: 대시보드에 KPI 없음 — DashboardOverview.tsx:10-45는 PageHeader+DashboardMarkets, DashboardContent.tsx:15-40은 비회원/빈/에러/데이터 분기. 총자산·평가손익 문자열 grep(widgets/dashboard, app/(main)/dashboard) 0건. 계좌 단위 KPI는 `/accounts/[id]` AccountSummaryCard.tsx:75-96, 통계 KPI는 /stats StatsKpiRow.tsx:18-32(실현손익·미실현 평가손익·운용 원금).
- 메모와 일치. 4절 #15 참고: "대시보드↔통계 수익 요약 겹침"은 현재 없음.
- 6절 수치: 대시보드 577줄/86커밋/마지막 2026-11-12, 성과 통계 1,424줄/118커밋.

### 7-4. DCA 전략 UI — "다중 규칙 재설계 완료, 모의계좌 DCA 반영 완료"

- 현재 코드: 폼 DcaStrategyForm.tsx(isMock 배지 :35·:176 — 메모의 "isMock 배지"와 일치), 규칙 편집 sections/DcaRuleEditor.tsx:29, 설정 DcaSettingsSection.tsx, 상세 DcaStrategyDetail.tsx(:84 미리보기 미지원 주석), 회차 이력 DcaExecutionHistory.tsx:48, 카드 DcaStrategyCard.tsx:21. 서버 `reconfigureDca`·`dca-executions`·`strategy-seed-preview(type=DCA)` 사용(DcaStrategyForm.tsx:88·94, useStrategyQueries.ts:166).
- 메모와 코드 일치. 남은 DCA 특이점: 주문 미리보기·즉시 실행 미지원(409)이라 DCA는 전용 상세 분기(StrategyDetailContent.tsx:80 `type==='DCA'`), 투자금 조정은 지원(capitalAdjustment.ts:4), 백테스트는 DCA 제외(커밋 49cf2216 메시지 "백테스트에서 DCA 제외").
- 6절 수치: 위 7-1과 동일(DCA 파일 1,239줄/1,113줄/90커밋), 전략 등록·수정 폼 3,181줄/4,328줄 테스트/199커밋, 전략 상세·주문 2,115줄/270커밋 — **전 기능 중 커밋이 가장 많은 영역**.

### 7-5. 가계부 수입·소비·저축 탭 — "8f77d076 완료, 재작업 금지"

- 현재 코드: 3개 라우트가 `FlowPageView` 하나 공유(app/(main)/finance/(dashboard)/(flow)/FlowPageView.tsx:12), 위젯 finance-summary·budget-progress·trend·record-list, 거래 CRUD·복제·공유(2-1절), 예산 관리는 별도 라우트 `/finance/budgets/[type]`로 이관(AssetSettingsPanel.tsx:18 주석: 2026-08 이관, 라우트 전환 2026-10). 메모의 "내용은 docs/agents/finance.md·finance-widgets.md"는 두 파일이 실존함(docs/agents 목록 확인).
- 메모와 코드: 일치하나 "완료"의 범위가 커졌음 — 8f77d076(2026-08-20) 이후 수입/소비/저축 슬라이스 6개월 커밋 102건, 예산 45, 카테고리 34, 재무계좌 27, 그룹 18, 일괄 등록 32. 즉 "재작업 금지" 대상이 계속 변경 중인 활성 영역.
- 6절 수치: 수입/소비/저축 1,477줄/741줄 테스트/102커밋, 자산 1,956줄/116커밋, entities/finance 2,433줄/72커밋. 비대칭·진입점 약함: 2-3절, 6-1절.

### 7-6. admin Phase 2A/2B(승인·역할 관리·proxy Route Handler) — "2026-05 완료"

- 현재 코드: 승인/반려 ApproveRejectButtons.tsx:28-29, 역할 변경 ChangeRoleButton.tsx:33, 탈퇴 WithdrawUserButton.tsx:26, ADMIN 접근 차단 proxy.ts:186-189, admin 프록시 route handler app/api/admin/[[...path]]/route.ts(23줄, 다른 프록시와 달리 createProxyRoute 미사용 여부는 코드 미정독 → 미확인), 관리자 페이지 8개(/admin·pending·users·accounts·trades·privacy-trades·logs·settings).
- 메모와 코드: 메모의 "현재 구조는 FSD·proxy.ts로 바뀜"과 일치. 이후 관리자 영역은 Phase 2 범위를 크게 넘어 확장됨 — PRIVACY 기준표 1,839줄/99커밋, 운영 설정 892줄, 로그 565줄. 가입 승인 전용 `/admin/pending`은 사이드바에 없고 개요 링크 1개로만 진입(1-1절 #29).
- 6절 수치: 관리자 사용자·승인 556줄/50커밋, 계좌 233줄/38커밋, 거래 469줄/75커밋, PRIVACY 1,839줄/99커밋, 로그 565줄/59커밋, 운영 설정 892줄/41커밋.

### 7-7. 요약 — 메모와 현재 코드의 어긋남 후보

1. deprecated 필드 폴백 잔존: entities/trade/api/index.ts:77-83 (메모: 제거 통보 완료).
2. 메모에 없는 broker `MERITZ`가 코드에 존재(api-schema.ts:61, ApiStep.tsx:163 안내) — 메모 6항목 어디에도 언급 없음.
3. 업비트·KIS 삭제 결정은 메모에 업비트만 "UI 삭제 예정"으로 적혀 있고 KIS 분기 위치는 5-1절(ApiStep.tsx:20-26·116, BrokerStep.tsx:18, AccountInfoStep.tsx:18, brokerCredentials.ts:9, app/pending/page.tsx:16 "KIS API 자격증명 입력", ConfirmStep.tsx:24·AccountInfoStep.tsx:57 의 기본값 `'KIS'`) — 기본 broker 폴백이 KIS인 점은 삭제 시 영향.
4. 메모 항목 중 완료 보증 문구가 가리키는 기능(가계부·DCA·admin)은 모두 6개월 내 높은 커밋 빈도 — "재작업 금지"와 별개로 계속 수정 중.

---
끝. (측정 전용: 판정·권고 없음. 줄 수는 2026-11-13 main 1487ea9f 기준.)
