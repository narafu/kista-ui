# J. UI·API 책임 분담 원칙 위반 전수 조사 (kista-ui, 읽기 전용)

기준: `kista-api/docs/superpowers/fable-review/ui-api-principles.md`. 조사 방법: grep·sed로 `app entities features widgets shared`의 비테스트 코드를 직접 읽고 줄 수를 범위(끝-시작+1)로 셌다. 서버 파라미터는 `kista-api`의 `@RestController` 소스를 읽기 전용으로 대조했다(grep `@RequestParam`). b 문서 = `findings/b-type-duplication.md`. 빌드·테스트·dev 서버는 실행하지 않았다.

원칙 표 행 약칭: R1 목록(페이징·정렬·필터·검색), R2 집계·계산, R3 금액 반올림, R4 업무규칙 검증, R5 상태 판정, R6 enum 라벨, R7 오류 문구, R8 와이어 타입, R9 날짜·거래일, R10 권한, R11 리소스 합치기.

진행 기록: 1절 → 2절 → 3절 순으로 작성(중간 저장).

---

## 1. 목록 화면의 클라이언트 페이징·정렬·필터·검색

### 1-1. 서버 목록 엔드포인트의 페이징 파라미터 현황 (kista-api 컨트롤러 대조)

| 엔드포인트 | 서버 파라미터(소스) | 형태 |
|---|---|---|
| GET /api/finance/transactions | from,to,categoryId,userId (FinanceTransactionController:37-40) | page 없음, 전량 |
| GET /api/finance/asset-snapshots | from,to,userId (AssetSnapshotController:46-48) | page 없음, 전량 |
| GET /api/finance/budgets | categoryId,date (FinanceBudgetController:37-38) | page 없음 |
| GET /api/finance/accounts·categories·groups·monthly-closings | type 정도 | page 없음 |
| GET /api/trading-cycles/{id}/orders | from,to (TradingCycleController:261-262) | page 없음, 전량 |
| GET /api/trading-cycles/{id}/dca-executions | from,to,direction,ruleKey,page,size (:276-281) | **page/size(0-base)** |
| GET /api/stats/cycles | type,accountId,ticker,status,page,size (TradingStatsController:55-60) | **page/size(0-base)** |
| GET /api/accounts/{id}/cycle-history, /api/trading-cycles/{id}/history | from,to,cursor,size(기본 50, clamp 1-200) | **cursor/size** |
| GET /api/daily-trades | from,to | 기간 내 전량 |
| GET /api/admin/users | status,from,to (AdminUserController:34-36) | page 없음 |
| GET /api/admin/accounts | from,to (AdminAccountController:47-48) | page 없음 |
| GET /api/admin/logs/audit | from,to | page 없음 |
| GET /api/admin/logs/errors | limit(기본 100),from,to | limit만(상한 절단, page 없음) |
| GET /api/admin/trades | from,to (AdminTradeController:50-51) | page 없음 |
| GET /api/admin/privacy-trade-bases | `range`(Integer, AdminPrivacyTradeController:44) | page 없음. **UI는 `?days=`(privacy/api/index.ts:12-13)를 보내려 하지만 서버 파라미터명은 `range`** — UI는 현재 `days`를 아예 넘기지 않고 전체 기간을 받아(queryOptions.ts:10) 클라이언트에서 기간 필터한다. 이 이름 불일치는 확인된 사실이고, 서버가 `days`도 받는지는 컨트롤러 소스에서 확인 못 함 |
| GET /api/accounts, /api/trading-cycles | (includeArchived 정도) | 전량형(계좌·전략: 상한 구조적으로 작음) |

### 1-2. 화면별 표

범례: 서버P = 서버가 page/size/cursor 받음. 증가 = 시간이 지나면 늘어나는 데이터. 판정 위반 = "증가 + 전량 수신 후 클라이언트 처리". 줄 수는 해당 처리 코드 범위.

| # | 화면(파일:줄) | 출처 엔드포인트 | 서버P | 클라 처리(종류) | 줄 | 데이터 성격 | 판정 |
|---|---|---|---|---|---|---|---|
| L1 | 가계부 거래 목록 `widgets/finance-record-list/FinanceRecordList.tsx:102-139` | GET /api/finance/transactions (`useFinanceTransactionsQuery(from,to)`; 월간 12개월 윈도우, 연간 YTD/전년, 추이는 `from` 생략=전체) | 없음 | 유형 필터(`filterByType`), 기간 재필터(:104-106, 서버 from/to와 중복), 카테고리 하위트리 필터(:108-113), **메모 검색**(:115-122, `type="search"` :179), 열 정렬 5키(:124-137), `useClientPagination`(:139), 미분류 집계(:142-146) | 약 38 | 증가(거래내역) | **위반** (R1) |
| L2 | 자산 기록 목록 `widgets/asset-record-list/AssetRecordList.tsx:68-119` | GET /api/finance/asset-snapshots (인자 없음 = **전 기간 전량**, `useAssetSnapshotsQuery()`) | 없음 | 월·카테고리·자산군·시장 필터(:76-82), 정렬 9키+체인 비교(:100-118), `useClientPagination`(:119), 선택 상태 | 약 44 | 증가(자산 기록) | **위반** (R1) |
| L3 | 예산 관리 `features/finance/manage-budgets/BudgetManager.tsx:98-130` | GET /api/finance/budgets (인자 없음 전량, queryOptions.ts:70-72 주석 "행 수가 적다") | 없음 | 카테고리 하위트리 필터+상태 필터 `budgetStatus(b,today)`(:120-123), 클라 슬라이스 페이징(:126-130, URL 파라미터 page/size) | 약 12 | 느리게 증가(예산 행; 구조적 상한은 문서화 안 됨) | 경계(전량형 선언 필요 후보). 상태 판정은 5절 |
| L4 | 가계부 계좌 관리 `features/finance/manage-accounts/AccountManager.tsx:70-84` | GET /api/finance/accounts | 없음 | 유형 필터·이름 정렬·유형별 그룹핑 | 15 | 구조적 소형(주석 :70 "계좌 수가 적어") | 적합(전량형 안 즉시 정렬·필터) |
| L5 | 전략 주문 내역 `widgets/strategy-detail/StrategyOrderHistory.tsx:46-59` | GET /api/trading-cycles/{id}/orders (from,to만) | 없음 | 방향·주문유형·**상태(기본 'FILLED')** 필터(:51-55), 클라 슬라이스 페이징(:57-58), 날짜 그룹핑 | 14 | 증가(주문 이력) | **위반** (R1). 상태 필터 기본값 'FILLED'가 서버에 파라미터로 존재하지 않음 |
| L6 | DCA 실행 이력 `widgets/strategy-detail/DcaExecutionHistory.tsx:56-63` | GET /api/trading-cycles/{id}/dca-executions | **서버P(page/size)** | 페이지 안에서 다시 정렬(:60-62, 날짜 내림차순→규칙 카드 순), 주석 `ponytail: 페이지 단위 정렬 — 경계를 못 맞춘다` | 7 | 증가 | **서버 페이징 안 재정렬 표시** (R1). 주석이 한계를 자인 |
| L7 | 사이클 성과 목록 `widgets/stats-overview/CyclePerformanceList.tsx:57-76` | GET /api/stats/cycles | 서버P | 서버 필터(type,accountId,ticker,status) 전달. 필터 옵션 목록만 전략 목록에서 클라 생성(:57,:64) | 약 6 | 증가 | 적합(옵션 생성은 전략 전량형에서) |
| L8 | 사이클 이력 `entities/trade/hooks/useCycleHistory.ts` + `widgets/cycle-history/CycleHistoryTable.tsx` | cycle-history, /history | 서버P(cursor) | `useInfiniteQuery` "더 보기" | - | 증가 | 적합(무한/더 보기, 서버 cursor) |
| L9 | 계좌 카드 격자 `widgets/accounts-grid/AccountsGrid.tsx:17-21,25-38` | GET /api/accounts | 해당 없음 | 12개씩 "더 보기"(`slice(0,visibleCount)`), 증권사 필터 | 약 10 | 구조적 소형 | 적합 |
| L10 | 전략 전체 목록 `widgets/all-strategies/AllStrategiesList.tsx:67-81` | GET /api/trading-cycles | 해당 없음 | 계좌별 그룹·필터·건수 | 약 15 | 구조적 소형 | 적합(그룹핑은 화면 상태) |
| L11 | 관리자 사용자 목록 `widgets/admin-user-list/AdminUsersTable.tsx:37-48` | GET /api/admin/users (status,from,to) | 없음 | 정렬 4키(:41-46, 라벨 맵으로 정렬), `useClientPagination` | 12 | 증가(가입자) | **위반** (R1, 초대제라 증가 속도 낮음) |
| L12 | 관리자 승인 대기 `widgets/admin-user-list/AdminPendingList.tsx:25-26` | GET /api/admin/users?status=PENDING | 없음 | `slice(0,max)`+`useClientPagination` | 2 | 소형(대기자) | 경계 |
| L13 | 관리자 계좌 현황 `app/(admin)/admin/accounts/page.tsx:36-50` | GET /api/admin/accounts (from,to) | 없음 | 소유자 목록 정렬(:36-39), owner·broker·strategyType 필터(:41-46), `slice` 페이징(:48-50) | 15 | 증가 | **위반** (R1). 서버 컴포넌트지만 서버 API가 아닌 UI 서버에서 자름 |
| L14 | 운영 로그 감사 `app/(admin)/admin/logs/page.tsx:68-72` | GET /api/admin/logs/audit (from,to) | 없음 | `slice` 페이징 | 5 | 증가(로그) | **위반** (R1) |
| L15 | 운영 로그 오류 `widgets/admin-log-list/ErrorLogsSectionContent.tsx:12,28-30` + page.tsx:55 | GET /api/admin/logs/errors?limit=500 | limit만 | 500건 받아 클라 `slice` 페이징. 500 초과분은 조회 불가(`최근 500건` 표기 :34) | 3 | 증가(로그) | **위반** (R1) |
| L16 | 관리자 거래 `widgets/admin-trade-list/AdminTradesWorkbench.tsx:71-87` + `AdminTradesTable.tsx:28-60` | GET /api/admin/trades (from,to) | 없음 | 사용자·계좌·전략 필터(:71-76), 정렬(`useTradeSort`), `useClientPagination`(:87). 주석(:84-85)이 "필터가 클라이언트 상태라 필터 후 목록을 자른다"고 사유 명시 | 약 25 | 증가(체결) | **위반** (R1) |
| L17 | 관리자 PRIVACY 매매표 `widgets/admin-privacy-trade-list/AdminPrivacyBaseTable.tsx:50-61,91-109` + `entities/privacy/model/filter.ts` | GET /api/admin/privacy-trade-bases (인자 없음 = 전체 기간) | 없음 | 기간 필터·연초재설정 필터(:91-98), 정렬(:52-62), slice 페이징(:105-109) | 약 30 | 증가(일 단위 매매표) | **위반** (R1). 1-1의 `days`/`range` 불일치 |
| L18 | 이상 징후 계좌 표 `widgets/admin-log-list/AccountTable.tsx:14-28` | GET /api/admin/logs/anomalies | 없음 | 정렬 3키 | 15 | 구조적 소형(이상 계좌) | 적합(전량형 안 정렬) |
| L19 | 크립토 보유 `widgets/account-detail/CryptoHoldingsCard.tsx:54-62`, 전략유형 비교 `widgets/stats-overview/StrategyTypeComparison.tsx:33-45`, 다음 주문 `widgets/strategy-detail/OrderRows.tsx:56-66` | 포트폴리오/통계/미리보기 | 해당 없음 | 열 정렬 | 각 약 9-11 | 구조적 소형 | 적합 |
| L20 | 주간 시장 캘린더 `widgets/market-holiday-calendar/WeeklyMarketCalendar.tsx:225` + `entities/trade/hooks/useDailyTradesRangeQuery.ts:32-56` | GET /api/daily-trades (from,to) | 없음 | 체결 전량을 받아 날짜·통화별 합계/건수로 클라 집계(25줄) | 25 | 증가(체결) | **위반** (R1+R2). 2절에도 기재 |

"더 보기"·무한 스크롤: L8(cursor `useInfiniteQuery`)이 유일한 서버 연동형. L9는 클라이언트 `slice` 더 보기(소형이라 적합).

### 1-3. 1절 집계

- 위반 표시 항목: L1, L2, L5, L11, L13, L14, L15, L16, L17, L20 = **10건**, 처리 코드 약 **218줄**(38+44+14+12+15+5+3+25+30+25 = 211, L1~ 반올림 오차 포함 약 210~220). L3·L12는 경계로 별도.
- 서버 페이징인데 페이지 안에서 재정렬: L6 1건(7줄).
- `useClientPagination` 사용처 6곳(AssetRecordList, AdminUsersTable, FinanceRecordList, AdminPendingList, AdminTradesWorkbench + 정의 `shared/lib/hooks/use-client-pagination.ts` 23줄) — 모두 서버에 page 파라미터가 없는 엔드포인트의 전량을 자른다. 같은 목적의 수기 `slice` 페이징: BudgetManager, StrategyOrderHistory, admin accounts page, admin logs page(audit), ErrorLogsSectionContent, AdminPrivacyBaseTable 6곳.
- `useTableSort`(`shared/lib/hooks/use-table-sort.ts`) 사용처 10곳(OrderRows, CryptoHoldingsCard, AssetRecordList, AdminUsersTable, FinanceRecordList, AdminPrivacyBaseTable, AccountTable, AdminTradesTable, StrategyTypeComparison + 훅 정의). 그중 전량형이 아닌 목록 위에서 정렬하는 것은 AssetRecordList·FinanceRecordList·AdminUsersTable·AdminPrivacyBaseTable·AdminTradesTable(5곳) — 서버가 정렬 파라미터를 받지 않아 **정렬 전체가 클라이언트에 있다**.
- 검색: 앱 전체에서 사용자 입력 검색은 FinanceRecordList 메모 검색(:179-183) 1곳뿐(grep `search|검색`).

---

## 2. UI 집계·계산

### 2-1. 가계부 `entities/finance/lib/*` 함수 단위 명세 (서버 집계 엔드포인트 명세의 재료)

공통 입력 타입(`entities/finance/model/types.ts`): `AssetSnapshot`(필드: id, entryDate 'YYYY-MM-DD', amount, categoryId, rootCategoryId, categoryName, assetClass, market, accountName/Institution/Owner, strategy, memo), `FinanceTransaction`(id, transactionDate, amount, categoryId, memo), `FinanceBudget`(id, categoryId, amount=월 할당액, applyStartDate, applyEndDate?), `MonthlyClosing`(month, completed, groupId?). 공통 파라미터: `month`('YYYY-MM'), `Period = {month, mode:'monthly'|'yearly'}`, `today`('YYYY-MM-DD', 호출부에서 `todayKst()`), 가계부 카테고리 유형 `INCOME|EXPENSE|SAVING`(+자산 ASSET), `TrendRange = number | 'all'`.

#### 2-1-A. `aggregate.ts` (271줄, 자산 스냅샷 집계. 입력은 전부 GET /api/finance/asset-snapshots **전 기간 전량**)

| 함수(줄) | 줄 수 | 입력 | 출력 타입 | 소비 화면 | 파라미터 |
|---|---|---|---|---|---|
| `calcMonthlySummary` (82-102) | 21 | snapshots[], month | `{netWorth, totalAssets, totalLiabilities, largestAssetClass:{assetClass,amount}\|null, recordCount}` (대출 `isLiability`=rootCategoryId===대출 L1 UUID 제외 합=총자산, 대출 합=부채, 순자산=총자산-부채, 자산군별 최대) | `widgets/asset-overview/AssetOverview.tsx:42` | month |
| `calcCategoryBreakdown` (109-115) | 7 | snapshots[], month | `{category:L1 id, amount}[]` 4개 고정 순서(투자·예적금·대출·부동산) | AssetOverview, AssetOverviewParts | month |
| `calcAssetClassBreakdown` (122-132) | 11 | snapshots[], month | `{assetClass, amount}[]` (대출 제외, 6개 자산군 고정 순서, 0원 제외) | AssetOverview, AssetOverviewParts | month |
| `calcMonthlyTrend` (142-164) | 23 | snapshots[], mode `'netWorth'\|'category'\|'assetClass'`, selector, monthsLimit=6, endMonth | `TrendPoint[] {month, amount, totalAssets?}` (최근 N개월 오름차순, netWorth 모드는 순자산+총자산) | `widgets/asset-trend/AssetTrendInner.tsx` | mode, selector(L1 id 또는 자산군), monthsLimit, endMonth |
| `calcComposition` (181-205) + 래퍼 `calcCategoryComposition`·`calcAssetClassComposition` (207-225) | 25+19 | snapshots[], items[], matcher, monthsLimit, endMonth | `CompositionColumn[] {month, entries:{item,amount,percent}[], total}` (percent=금액/합×100; 카테고리 구성비는 대출 포함, 자산군 구성비는 대출 제외) | `widgets/asset-composition/AssetCompositionInner.tsx` | 기준: 카테고리/자산군, monthsLimit, endMonth |
| `calcMissingCategories` (232-236) | 5 | snapshots[], month | `string[]` (기록 없는 L1 카테고리 id) | `widgets/asset-record-check/AssetRecordCheck.tsx` | month |
| `calcMissingAccounts` + `accountKey`/`accountLabel` (228-252) | 18 | snapshots[], month, previousMonth, assetClassLabel | `string[]` (전월에는 있고 이번 달 없는 "계좌명·카테고리명·자산군" 키) | AssetRecordCheck | month, previousMonth |
| `calcDateGroups` (259-267) | 9 | snapshots[], month | `{date, count}[]` | AssetRecordCheck | month |
| `listAvailableMonths` (68-71) / `previousMonthOf` (269-271) | 4/3 | snapshots[] / months[], month | `string[]` 내림차순 / `string\|null` | 가계부 page, AssetOverview, AssetRecordCheck | - |
| `sum`·`snapshotsInMonth` (60-66) | 7 | - | - | 위 전부 | - |
| `isMonthClosed` (52-58) | 7 | closings[], month, scopeGroupId | boolean (스코프에 맞는 마감 행만 골라 `completed`) — 5절 | 6개 파일 | month, scopeGroupId |
| 상수/라벨 (3-45): 시스템 L1 UUID 4개, `ASSET_L1_CATEGORY_LABEL`, `ASSET_CLASS_ORDER` | 약 40 | - | - | - | 서버 V13 시드·enum 사본(주석 :3,:18,:32) |

월별 스냅샷 집계가 필요로 하는 서버 결과의 모양(화면 기준): ① 월별 요약 KPI(순자산·총자산·부채·최대 자산군·기록 수), ② 월별 L1 카테고리 합, ③ 월별 자산군 합(대출 제외), ④ 최근 N개월 월별 시계열(순자산/총자산, 선택 L1, 선택 자산군), ⑤ 최근 N개월 구성비(L1 4종 / 자산군 6종, 금액·%·합계), ⑥ 월 점검(누락 L1, 전월 대비 누락 계좌, 기록일별 건수), ⑦ 기록이 존재하는 월 목록. 이 전부가 `month`/`endMonth`/`monthsLimit`/`scope(그룹)` 파라미터로 표현된다.

#### 2-1-B. `flowAggregate.ts` (296줄, 수입·소비·저축 거래·예산 집계. 입력 GET /api/finance/transactions(from,to), GET /api/finance/budgets 전량)

| 함수(줄) | 줄 수 | 입력 | 출력 | 소비 화면 | 파라미터 |
|---|---|---|---|---|---|
| `filterByType` / `unclassifiedTransactions` (26-32) | 7 | transactions[], CategoryIndex(카테고리 트리 3종을 순회해 만든 id→{type,rootId,name}), type | `FinanceTransaction[]` (거래에는 type이 없어 카테고리 인덱스로 유형을 판정) | FinanceSummary, FinanceTrendInner, FinanceRecordList, FinanceBudgetProgress | type |
| `calcFlowSummary` (43-55) | 13 | typed transactions[], Period, today | `{total, count, previousTotal:number\|null}` (월간: 선택월 합·건수·전월 합; 연간: 합·건수, previousTotal=null) | `widgets/finance-summary/FinanceSummary.tsx:43` | Period, today |
| `calcFlowTrend` (92-104) + `trendBuckets` (63-79) + `bucketCountSinceEarliest` (81-90) | 13+17+10 | typed transactions[], CategoryIndex, Period, today, range | `FlowTrendPoint[] {period:'YYYY-MM'\|'YYYY', amount, byCategory:Record<rootId, 합계>}` (월간 N개월/연간 N개년 버킷, 'all'은 가장 오래된 거래부터) | `widgets/finance-trend/FinanceTrendInner.tsx` | Period, range(6/12/24/36/all, 5/10/all), today |
| `calcBudgetProgress` (141-185) + `budgetValidInMonth`/`validMonthCount` (106-123) | 45+18 | budgets[], typed transactions[], categoryTree, CategoryIndex, Period, today | `BudgetProgress[] {budgetId, categoryId, categoryName, allocated=월할당×유효개월수, actual=예산 카테고리 하위트리 거래 합, remaining, usageRatio}` (카테고리 고정 순서) | `widgets/finance-budget-progress/FinanceBudgetProgress.tsx` | Period, today, type |
| `buildBudgetProgressTree` (210-254) | 45 | BudgetProgress[], categoryTree | `BudgetTreeNode {categoryId, categoryName, depth, isGroup, budgetId?, allocated, actual, remaining, usageRatio, children[]}` 트리(자체 예산 없으면 하위 합 소계, 예산 없는 가지 제거) | FinanceBudgetProgress | - |
| `calcUnbudgetedCategories` (265-296) | 32 | budgets[], typed transactions[], categoryTree, CategoryIndex, Period, today | `{categoryId, categoryName, amount}[]` (예산으로 덮이지 않은 카테고리의 실적) | FinanceBudgetProgress | Period, today, type |
| `sumAmount`/`inRange`/`flattenTreeIds` (12-24) | 13 | - | - | - | - |

주변 계산 `widgets/finance-summary/financeSummaryCalc.ts` (50줄): `sumInRange`(:4-8, reduce), `calcPreviousYearTotal`(:10-20, 전년 동기간 합), `calcYearlyAverage`(:29-35, **`Math.round(연누계/경과개월)`**: 월평균), `calcRemainingAmount`(:39-50, 수입 탭의 남은 금액 = 수입-소비-저축). 소비 `FinanceSummaryParts.tsx:96` `ratioToPercent(incomeRatio)`(수입 대비 비율). 출력 모양: `{total, count, previousTotal, previousYearTotal, yearlyAverage, remaining, incomeRatio}`.

화면이 필요로 하는 집계 결과(서버 명세 재료): (유형, 기간(월/연), today) → 합계·건수·전월 합·전년 동기 합·연평균·남은 금액·수입 대비 비율; (유형, 기간, 버킷 수) → 버킷별 합계 + 루트 카테고리별 합계; (유형, 기간) → 예산별 {배정(월할당×유효개월), 실적(하위 트리), 잔액, 사용률} 트리 + 예산 없는 카테고리 실적. 기간 규칙(`period.ts`)이 서버가 알아야 할 규칙이다: periodRange(월간=그 달, 연간=올해면 1/1~오늘·과거 연도면 연 전체), windowRange(선택월 포함 12개월), previousYearRange(올해는 전년 같은 일자까지, 29일 clamp), elapsedMonthsInYear(올해=오늘의 월, 과거=12), trendWindow(버킷 수 또는 전체).

#### 2-1-C. `bulkRegisterPreview.ts` (162줄)

`buildBulkRegisterItems({transactions, assetSnapshots, index, enumOrder})`(98-162, 65줄) + `buildGroupTree`/`finalizeGroupTree`(51-96, 46줄): 입력 = 소스월의 거래(GET /transactions from/to=소스월)와 자산 스냅샷(전량 중 소스월), 카테고리 인덱스, 자산군·시장 정렬순서(메타). 출력 `{asset, income, expense, saving: CategoryGroupNode[]}` (노드 `{id,name,sortOrder,items:BulkRegisterItem[],children}`; 항목은 `{id,categoryId,categoryName,categoryPath,memo,amount,included,assetClass?,market?,strategy?,account*}`). 소비: `widgets/finance-bulk-register/BulkRegisterForm.tsx`. 하는 일: "지난달 기록을 이번 달로 복사"용 미리보기를 대·중·소분류 트리로 그룹핑·정렬. 서버 `POST /api/finance/bulk-register`는 선택 결과를 받아 저장만 한다(미리보기 GET 없음, FinanceBulkController 소스 :35-39 확인). 집계(합계)가 아니라 그룹핑·정렬이라 R1 성격이고, "복사 대상 미리보기" 엔드포인트가 있으면 사라진다.

#### 2-1-D. `period.ts` (146줄)

규칙 코드 약 70줄(`periodRange` 42-48, `windowRange` 50-53, `displayWindow` 60-62, `autoAdjustedMonth` 69-76, `registerWindowUpperBound` 78-80, `elapsedMonthsInYear` 84-89, `previousYearRange` 94-108, `yearsRange` 110-117, `trendWindow` 137-146) + 월 이동·말일 유틸 `shiftMonth`·`monthEndDate`·`monthStartDate`(12-28, 17줄) + 옵션 상수(121-135, 15줄). 하는 일: 화면이 어떤 from/to로 거래를 조회할지 결정(= 서버에 위임하면 사라질 "조회 윈도우 설계"). 소비: `useFinanceFlowData.ts`, `FinanceSummary`, `FinanceTrend`, `FinanceHeader`, `FinanceRecordList`, `financeSummaryCalc.ts`.

#### 2-1-E. 합계

| 파일 | 줄 | 서버 집계로 대체 시 |
|---|---|---|
| aggregate.ts | 271 | 약 190줄 사라짐(상수·`isMonthClosed`·`isLiability`·라벨 ~80줄은 5·6절) |
| flowAggregate.ts | 296 | 약 270줄 사라짐 |
| bulkRegisterPreview.ts | 162 | 미리보기 엔드포인트가 있으면 약 110줄 |
| period.ts | 146 | 규칙 약 70줄 + 유틸 사용처만 남음 |
| financeSummaryCalc.ts | 50 | 전부 |
| 합계 | 925 | 서버 집계 시 약 650~700줄 |

`aggregate.ts + flowAggregate.ts + bulkRegisterPreview.ts + period.ts` = 875줄(b 문서 6-D와 동일).

### 2-2. 가계부 외 집계·계산 (R2)

| # | file:줄 | 줄 | 하는 일 | 대응 API | 비고 |
|---|---|---|---|---|---|
| C1 | `widgets/asset-overview/AssetOverviewParts.tsx:102-149` | 약 15 | `percentOf`(금액/합×100), breakdown 합 reduce(:115,:149) | asset-snapshots(전량) | 2-1-A 결과 위에 비율 재계산 |
| C2 | `entities/trade/hooks/useDailyTradesRangeQuery.ts:32-56` | 25 | 체결 목록 → 날짜·통화별 매수/매도 합계·건수 | GET /api/daily-trades | 1절 L20 |
| C3 | `entities/order/model/order-readiness.ts:22-70` | 약 49 | 미접수 방향 판정 + 센트 정수화 `toCents` 뺄셈(:43) — 5절 | GET /api/trading-cycles/{id}/preview | 계산 값(`correctionExcludedBuyUsd`)을 화면에 씀 |
| C4 | `widgets/stats-overview/StatsKpiRow.tsx:13` | 1 | `byType[].activeCycleCount` 합 | GET /api/stats/summary | 서버 summary에 총계 없음 |
| C5 | `widgets/all-strategies/AllStrategiesList.tsx:80` | 1 | 계좌별 전략 수 합 | /api/trading-cycles | 화면 라벨용 |
| C6 | `widgets/stats-overview/lib/normalizeEquityCurve.ts:10-22` | 13 | 첫 양수 자산=100으로 정규화한 `asset`·`principal` 지수 | GET /api/stats/equity-curve | 차트용 변환(2-3으로도 분류 가능). 값이 서버에서 이미 집계된 totalAsset/principal 위의 비율 계산 |
| C7 | `entities/stats/lib/housingBenchmarkChartFormatters.ts:76-110` | 35 | `calculateQuintileCagr`·`calculateSeriesCagr`: 첫·끝 유효 시점으로 연평균 상승률(CAGR) 계산 | GET /api/stats/housing-benchmark/series·index-series·etf-series | 수익률 계산을 UI가 함. 소비 `widgets/housing-quintile-trend` 등 |
| C8 | `widgets/admin-privacy-trade-list/model/privacyChartSeries.ts:1-176` | 176 | PRIVACY 매매표 시계열을 누적 실현손익(`carry`·`baseline`)·추정 현금·현금비율·연초 재설정 판정으로 계산(`buildPrivacyChartSeries` 124-176 = 53줄, `sliceSeriesByRange`, `latestYearlyResetByTicker`, `estimateFinalSellPnl`) | /api/admin/privacy-trade-bases + /api/market/candles | 누적·손익 계산 = R2. 관리자 화면 |
| C9 | `features/strategy/create-strategy/model/vrDerived.ts:37-84` | 48 | VR 평가금 추정·초기 자산·필요 인출 자산(`requiredWithdrawalAssets=|금액|×100×(4/intervalWeeks)`) 계산 | (서버 검증 사본) | 4·6절. b 6-B와 중복이라 줄 수만 |
| C10 | `entities/strategy/model/dcaFormat.ts:73-93` | 21 | `earliestNextExecution`·`latestLastExecution`(규칙별 실행 시각 중 최소/최대) | /api/trading-cycles | b 6-B |
| C11 | `widgets/strategy-detail/DcaStrategyDetail.tsx:44-58` | 약 15 | 평가금 `holdings*price`(`roundMoney` 적용 :53) | portfolio, prices | 3절 |
| C12 | `entities/account/model/apiKeyExpiry.ts` (26줄) | 26 | 만료 D-30 판정 — 5절 | /api/accounts | b 6-B |

### 2-3. "이미 집계된 값 → 차트 좌표/표시 변환" (UI 소유로 분류)

| file:줄 | 하는 일 |
|---|---|
| `widgets/stats-overview/lib/normalizeEquityCurve.ts` (C6와 겹침: 정규화 지수는 서버가 줄 수도 있으나 차트 y축 기준 변환이라 UI 소유로 볼 여지) | 정규화 |
| `shared/lib/indicators.ts` (이동평균 `windowSum`, RSI `avgGain/avgLoss`) + `CryptoIndicatorCards.tsx` `withMovingAverage` | 시계열에 이동평균·RSI를 덧그림. 서버가 내려준 지표 이력 위의 파생(R2 경계: 지표값 자체의 계산이라 서버 후보로 볼 수도 있음) |
| `widgets/crypto-market-indicators/niceTicks.ts` | 축 눈금 |
| `widgets/fear-greed-card/FearGreedGauge.tsx:25`, `FearGreedTrend.tsx:30-31` | 게이지 각도·그라데이션 좌표 |
| `widgets/dashboard/MarketChartCardInner.tsx:54,125` | 색 rgba 변환, 캔들 정렬 |
| `widgets/admin-privacy-trade-list/PrivacyBaseChartInner.tsx:256` `avgGapBands` | 차트 밴드 좌표 |

(단순 좌표·색 변환이라 위반으로 세지 않는다.)

### 2-4. 2절 집계

- 가계부 집계 925줄(위 합계). 가계부 외 집계·계산 C1~C12 약 400줄(176+49+48+35+26+25+21+15+15+13+1+1 = 425).
- `.reduce(` 비테스트 호출: 가계부 lib 외 5곳(grep), 가계부 lib 내 다수. 합산 루프 `+=`: `useDailyTradesRangeQuery`, `privacyChartSeries`, `indicators.ts`(차트), `niceTicks.ts`(차트).

---

## 3. 금액 재반올림·통화 자릿수 (R3)

표시용 포맷과 계산·전송 값 구분. "계산 값" = 화면 로직·요청 값에 다시 쓰이거나 판정에 쓰이는 것.

### 3-1. 계산 값으로 다시 쓰는 것 (위반 후보)

| file:줄 | 줄 | 하는 일 | 서버 대응 | 구분 |
|---|---|---|---|---|
| `entities/strategy/model/capitalAdjustment.ts:8` `floorToCents` (+ :13 판정, `index.ts:7` export) | 1(+13) | `Math.floor(Number((n*100).toFixed(6)))/100` — 장부 예수금(`ledgerDeposit`)을 센트 내림. 소비: `features/strategy/withdraw-capital/model/withdrawCapitalFormSchema.ts:4,8`(검증 한도), `WithdrawCapitalForm.tsx:85`(표시), `DcaStrategyDetail.tsx:93`(표시) | POST /api/trading-cycles/{id}/capital-withdrawal, GET /api/trading-cycles/{id}(ledgerDeposit) | 검증 한도값 계산(R3+R4+R5) |
| `features/strategy/create-strategy/sections/SeedInputSection.tsx:27-31` `fillAmount` | 5 | 가용 예수금×비율로 시드 채우기. 100%는 `Math.floor`, 그 외 `Math.ceil`(주석 :77 "100%는 내림(예수금 초과 방지), 그 외는 올림(시드 부족 방지)"). 통화 자릿수는 `CURRENCY_SCALE`(`USD`는 정수 달러로 따로 예외 :28). 결과가 입력값→요청 시드로 전송됨 | GET /api/accounts/{id}/strategy-seed-preview, POST /api/accounts/{id}/trading-cycles | 요청에 쓰이는 값 재반올림 |
| `features/strategy/create-strategy/model/useStrategyFormEffects.ts:91` | 1 | `resetSeed({ seedUsdInput: Math.ceil(minSeed) })` — 최소 시드 올림 | 서버 최소 시드 | 요청 값 |
| `entities/order/model/order-readiness.ts:43,61-62` | 약 4 | `toCents = Math.round(usd*100)`로 정수 센트 뺄셈 후 `/100`(`correctionExcludedBuyUsd`) — 화면에 표시하는 "제외 금액" 계산 | preview 응답 필드 | 계산 값 |
| `features/strategy/create-strategy/model/dcaFormSchema.ts:96,131` | 2 | `Math.round(v.amount*factor)/factor`로 자릿수 초과 판정, `Math.round(q*1e8)/1e8`로 수량 8자리 판정 (zod refine) | 서버 검증 | 4절 업무규칙 |
| `features/backtest/run-backtest/BacktestForm.tsx:114,169` | 2 | 수량·VR 적립액 입력을 `Math.round`로 정수화 후 요청 파라미터 | GET /api/backtest | 요청 값 |
| `widgets/finance-summary/financeSummaryCalc.ts:34` | 1 | `Math.round(yearTotal/elapsedMonths)` 월평균 (화면 KPI) | (집계 서버 이관 시 서버) | 2절 C 항목 |
| `entities/meta/model/marketRules.ts:1,17` | 2 | `CURRENCY_SCALE[currency]`를 `meta.brokers[].amountScale` 폴백으로 사용, 최소 주문 폴백 `FALLBACK_MIN_ORDER` | /api/meta (이미 amountScale 있음) | 메타 폴백(사본) |
| `shared/lib/format/index.ts:142-145` `roundMoney` | 4 | 통화 자릿수로 반올림해 반환. 소비: `DcaStrategyDetail.tsx:53`(**평가금 계산에 사용**, 크립토만), `StatsKpiRow.tsx:22,29`·`StrategyTypeComparison.tsx:87-123`·`CycleRows.tsx:26`(손익 부호색 판정용), `fmtSignedMoney`(포맷) | stats 응답 | 부호 판정·평가금 계산 |
| `features/finance/manage-categories/*` `Math.trunc(Number(sortOrder))` (SystemCategoryFormDialog.tsx:57, categoryFormHelpers.ts:30) | 2 | 정렬순서 정수화(금액 아님) | 제외 | 해당 없음 |

### 3-2. 표시 포맷(UI 소유, 위반 아님)

`shared/lib/format/index.ts`의 `fmtKrw`·`fmtMoney`(:119 `Math.round(n)` KRW 표시)·`fmtSignedMoney`·`fmtSignedPercent`(:37,44 `toFixed(digits)`)·억/만 단위(:89-101); `StrategyMetaSection.tsx:160`(`poolLimitRate*100` toFixed(0)), `:182`·`StrategyCard.tsx:98,150`(`currentRound.toFixed(1)` 회차 표기); `StrategyTypeComparison.tsx:86,115`(`avgDurationDays.toFixed(1)`); `CryptoIndicatorCards.tsx` 다수 `toFixed`; `AssetCompositionInner.tsx:115`; `housingBenchmarkChartFormatters.ts:126-137`; `shared/lib/format/index.ts:179` `ratioToPercent`(`Math.round(ratio*10000)/100`) — 서버 비율(0~1)을 % 숫자로 바꾸는 변환이며 `VrFieldControls.tsx:50-54,211,227`(입력값↔요청값 변환), `FinanceSummaryParts.tsx:96`(표시)에 쓰인다. **입력 폼에서 % → 비율로 변환해 서버에 보내는 `percentToRatio`/`ratioToPercent`(VrFieldControls.tsx)는 요청 값 변환이라 형식 변환(UI 소유)으로 분류하되, 이 변환 자체가 정밀도(NUMERIC(6,2)) 가정을 UI가 안다는 점은 사실로 기록한다(format/index.ts:177 주석).**

### 3-3. `CURRENCY_SCALE`·통화 자릿수 사본

- `shared/lib/api-schema.ts:96-98` `CURRENCY_SCALE = {KRW:0, USD:2, USDT:2}` — 서버 `amountScale`(메타 `brokers[].amountScale`)과 사본(b 4절 "통화" 행).
- 소비: `format/index.ts:1,143`, `SeedInputSection.tsx:8,28`, `SeedAmountInput.tsx:5,75`(`maxDecimals`), `WithdrawCapitalForm.tsx:22,92`, `InjectCapitalForm.tsx:22,89`(UnitInput `maxDecimals`), `marketRules.ts:1,17`. 입력 소수 자릿수 제한(입력 마스크)은 UI 소유로 분류 가능, 그러나 같은 상수가 `roundMoney` 계산에도 쓰이므로 사본 1개가 표시·계산 양쪽을 지배한다.

### 3-4. 3절 집계

- 계산 값 재반올림·재계산: 9건(floorToCents 1, fillAmount 1, minSeed ceil 1, order-readiness toCents 1, dcaFormSchema refine 2, BacktestForm 2, 월평균 round 1 — roundMoney의 평가금 사용은 별도 1건) = 약 **25줄**. 표시 포맷은 별도 약 40곳(위반 아님).
