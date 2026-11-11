# J. UI·API 책임 분담 원칙 위반 전수 조사 (kista-ui, 읽기 전용)

기준: `kista-api/docs/superpowers/fable-review/ui-api-principles.md`. 조사 방법: grep·sed로 `app entities features widgets shared`의 비테스트 코드를 직접 읽고 줄 수를 범위(끝-시작+1)로 셌다. 서버 파라미터는 `kista-api`의 `@RestController` 소스를 읽기 전용으로 대조했다(grep `@RequestParam`). b 문서 = `findings/b-type-duplication.md`. 빌드·테스트·dev 서버는 실행하지 않았다.

원칙 표 행 약칭: R1 목록(페이징·정렬·필터·검색), R2 집계·계산, R3 금액 반올림, R4 업무규칙 검증, R5 상태 판정, R6 enum 라벨, R7 오류 문구, R8 와이어 타입, R9 날짜·거래일, R10 권한, R11 리소스 합치기.

진행 기록: 1~3절 작성 후 중간 저장, 이어서 4~13절 작성. 1절은 `kista-api/.../findings/07-list-endpoints.md`(이하 07 문서)와 대조했다.

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
- `useTableSort`(`shared/lib/hooks/use-table-sort.ts`) 사용 화면 9곳(OrderRows, CryptoHoldingsCard, AssetRecordList, AdminUsersTable, FinanceRecordList, AdminPrivacyBaseTable, AccountTable, AdminTradesTable, StrategyTypeComparison; 훅 정의 별도). 그중 전량형이 아닌 목록 위에서 정렬하는 것은 AssetRecordList·FinanceRecordList·AdminUsersTable·AdminPrivacyBaseTable·AdminTradesTable(5곳) — 서버가 정렬 파라미터를 받지 않아 **정렬 전체가 클라이언트에 있다**.
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

### 1-4. 07 문서와 대조한 보정 (UI 화면 ↔ 엔드포인트)

07 문서(`kista-api/docs/superpowers/fable-review/findings/07-list-endpoints.md`)를 읽고 1-1·1-2의 서버 사실을 다음과 같이 바로잡거나 보태다.

| UI 화면(1-2 번호) | 07 문서의 서버 사실 | 결과 |
|---|---|---|
| L5 전략 주문 내역 | `/trading-cycles/{id}/orders`는 `from`/`to` 미지정 시 최근 30일, 길이 상한 없음, 페이징 없음. 같은 이력인 `/history`는 커서형 | UI는 기간 필터를 서버에 넘기고 방향·유형·상태(기본 FILLED)·페이징을 클라이언트가 처리. 서버 페이지형(커서) 전환 + `direction`/`orderType`/`status` 필터 파라미터 필요(07 A-4 #3) |
| L6 DCA 실행 이력 | `dca-executions`는 page·size A형(`content,page,size,totalElements`) | UI는 서버 page를 쓰되 페이지 안에서 재정렬. 서버 고정 정렬(`DcaExecutionPersistenceAdapter:67`)에 규칙 순서 키가 없어 UI가 보정 |
| L7 사이클 성과 | `/stats/cycles`는 page·size B형이지만 서버가 전량 로드 후 메모리 slice (07 A-4 #9) | UI는 적합하게 서버 page를 소비. 서버 구현만 반쪽 |
| L14 감사 로그 | `/admin/logs/audit`는 서버 `LIMIT 100` 고정, 다음 페이지 불가 | UI의 `slice` 페이징은 최대 100건 위의 것이라 "전량 받아 자르기"가 아니라 "잘린 100건을 다시 자르기". 서버 잘림이 UI에 안 보임(`AuditLogsSection total={auditAll.length}`) |
| L15 오류 로그 | `/admin/logs/errors`는 `limit` 기본 100·최대 500, 다음 페이지 불가 | UI는 `limit=500`(`ErrorLogsSectionContent.tsx:12`, `logs/page.tsx:55`)으로 요청하고 클라이언트가 `slice` |
| L17 PRIVACY 매매표 | `range`(정수, 최소 30, 미전달 시 전체) | UI는 `days` 이름으로 보내려는 API 함수를 갖고 있으나 호출부가 넘기지 않아 전체 기간 수신 후 클라이언트 필터. 파라미터명 불일치는 07 문서에 없는 UI 쪽 발견 |
| L1/L2 가계부 | `transactions`·`asset-snapshots`는 from/to 선택, 미지정 전량, 배열 봉투 (07 A-4 #1·#2) | UI는 거래는 12개월 윈도우(추이 'all'은 `from` 생략=전량), 자산 스냅샷은 항상 전량 |
| L20 daily-trades | 기간 필수, 상한 없음 (07 A-4 #4) | UI는 3주(전주 시작~다음 주 끝)를 요청 |

추가 발견(07 문서에 없음): ① `widgets/fear-greed-card/FearGreedSection.tsx:7-16`은 서버 `days` 파라미터가 있는데도 365일을 한 번 받아 `sliceDays`로 1년·6개월·3개월·1개월을 클라이언트에서 자른다(주석: "kista-api와 같은 기준(KST 오늘 - days일 이후)으로 자른다 — 토글마다 재조회가 생기지 않게"). `widgets/crypto-market-indicators/CryptoIndicatorCards.tsx`는 `entities/market/api`가 `/api/crypto-market-indicators?days=365`로 고정 요청한 뒤 `.slice(-days)`를 7곳(156,187,208,275,335,372,400행)에서 한다. 둘 다 상한이 365일로 구조적으로 작은 시계열 위의 범위 선택이라 UI 소유 목록의 "전량형 안 즉시 필터"에 해당할 수 있다(판단은 적지 않음, 사실만). ② `app/(admin)/admin/accounts/page.tsx`·`logs/page.tsx`는 Server Component에서 자르므로 "클라이언트 처리"가 아니라 "UI 서버(Next) 처리"다.

---

## 4. 업무 규칙 검증의 UI 사본 (R4)

분류 기준: **형식(F)** = 필수·숫자·정수·부호·범위처럼 값 하나만 보고 판정하는 것 / **업무규칙(R)** = 서버 검증과 같다고 코드나 주석이 적은 규칙, 상한 상수, 교차 필드 규칙 / **런타임·메타 기반(M)** = 허용값·기본값을 `/api/runtime-config`·`/api/meta`에서 받아 대조하는 것 / **N** = 검증이 아닌 줄(import·타입·기본값 조립·상태·변환). 블록 단위로 센 근사치(±10%)이며 경계 블록의 판단은 비고에 적었다. 줄 수는 `wc -l`.

### 4-1. `features/strategy/**/model/*.ts` (비테스트 17개 파일, 총 1,477줄)

| 파일 | 줄 | F | R | M | N | 업무규칙 근거(file:line) / 비고 |
|---|---|---|---|---|---|---|
| create-strategy/model/strategyFormSchema.ts | 45 | 26 | 10 | 0 | 9 | R: `superRefine` :34-43 gMax≥initialGradient(교차 필드). `.max(1)`(:29,:33)은 비율 범위로 F로 셈. 램프 기본값표 `RAMP_DEFAULTS_BY_MODE` import(:2) |
| create-strategy/model/dcaFormSchema.ts | 187 | 31 | 96 | 0 | 60 | R: 상한 상수 `MAX_DCA_RULES`·`MAX_DCA_CONDITIONS`=10(:9-10, 주석 "kista-api 상한과 동일"), 조건 검증 :18-36(RSI·공포탐욕 0~100, AVG_PRICE>-100, 소수 둘째 자리 정규식), 규칙 교차 :56-105(주기·요일·말일, 크립토=시장가, 보유비율은 매도만, 소수 자릿수/최소 주문액), 폼 교차 :117-139(시작일 ≥ 오늘 KST, 수량·평단가 상호 필수, 크립토 소수 8자리). 소수 자릿수·최소 주문액은 `orderAmount`(메타 `brokers[]`에서 부모가 복사, 4-3 참조) |
| create-strategy/model/strategyFormGuards.ts | 200 | 23 | 64 | 26 | 87 | R: `isInvalidBootstrap` :11-26(주석 "서버 validateBootstrapPosition과 동일 규칙"), `isInvalidScheduledStart` :28-34("서버는 오늘 이전 날짜를 400으로 거부"), `isInvalidVr` :53-59(적립/인출·초기 자산·인출 필요 자산·램프 교차), `computeSubmitDisabled` 사유 문구 :152-189 중 업무규칙 21줄(형식 문구 17줄은 F). M: `isRuntimeValueInvalid` :63-88(runtime-config `allowedValues`/`customizable`/`defaultValue` 대조). N: 조합 `computeCannotSubmit` :90-112 외 |
| create-strategy/model/vrDerived.ts | 84 | 0 | 48 | 0 | 36 | R: `computeVrDerived` :37-84. 주석 :47 "서버 validateVrCommand와 동일 원칙", 서버 평가금 재계산을 평단가×수량으로 근사(:42-43 주석에 근사치임을 인정), `requiredWithdrawalAssets = |금액|×100×(4/주기)`(:68) |
| create-strategy/model/useSeedModel.ts | 66 | 0 | 5 | 0 | 61 | R: `isBelowMinSeed` :52, `isInvalidSeed` :56(최소 시드는 서버 `strategy-seed-preview`의 `minSeed`를 받아 비교만 하므로 M에 가깝다) |
| create-strategy/model/buildStrategyPayload.ts | 88 | 0 | 0 | 24 | 64 | M: `customizable === false`면 runtime `defaultValue`로 치환 :48-71 |
| create-strategy/model/strategyFormHelpers.ts | 125 | 0 | 0 | 12 | 113 | M: `deriveRuntimeFields` :64-90(`allowedValues`·`defaultValue`·`customizable`) |
| create-strategy/model/useTypeDefaults.ts | 70 | 0 | 0 | 10 | 60 | M: 타입 변경 시 runtime 기본값 적용 :21-26,:54,:65 |
| create-strategy/model/useStrategyFormEffects.ts | 101 | 0 | 0 | 1 | 100 | `Math.ceil(minSeed)` :91(3절) |
| create-strategy/model/useStrategyForm.ts | 278 | 0 | 0 | 0 | 278 | 위 가드를 호출하는 조립(:203-228) |
| create-strategy/model/useStrategyFormData.ts / loadStrategyFormContext.ts / buildDcaPayload.ts | 44/23/52 | 0 | 0 | 0 | 119 | 데이터 로딩·변환 |
| reconfigure-vr/model/reconfigureVrFormSchema.ts | 68 | 19 | 27 | 0 | 22 | F: :17-35. R: :37-63(램프 교차 3개 + `POOL_LIMIT_FLOOR_ZERO_MESSAGE` + 적립/인출 필수 + 편입 매수단가 필수). 주석 :4 "서버는 빈 필드를 현재 값으로 이어받으므로 …" |
| reconfigure-vr/model/reconfigureVrStrategy.ts | 9 | 0 | 0 | 0 | 9 | 타입 가드 |
| inject-capital/model/injectCapitalFormSchema.ts | 14 | 9 | 0 | 0 | 5 | 서버 계약 `depositAmount > 0`(:3 주석)은 부호 검사라 F |
| withdraw-capital/model/withdrawCapitalFormSchema.ts | 23 | 8 | 4 | 0 | 11 | R: 장부 예수금 상한 :8,:16-18(`floorToCents`로 서버 값 가공, 서버가 미체결 매수분을 추가 차감한다고 :6 주석) |
| 합계 | **1,477** | **116** | **254** | **73** | **1,034** | 형식 : 업무규칙 = 116 : 254 ≈ 1 : 2.2 |

관련하지만 위 디렉토리 밖: `entities/strategy/model/poolLimitRamp.ts`(61줄, R 15줄: `vrRampInvalidReason` :47-61, 주석 "서버 validateVrCommand와 같은 규칙", 전략 등록과 백테스트가 공유), `entities/strategy/model/vrRamp.ts`(43줄, `RAMP_DEFAULTS_BY_MODE` 11줄 = 서버 기본값표 사본, 서버 문서가 동기화 명시 — b 6-B), `features/backtest/run-backtest/model/useBacktestForm.ts:96`(주석 "서버 validateVrCommand와 같은 규칙"), `features/admin/settings/model/validateAdminSettings.ts`(51줄, 확인한 범위에서 서버 사본임을 적은 주석 없음, 내용 분류 못 함).

### 4-2. 같은 규칙이 여러 곳에 있는 경우 (사본 수)

- **VR 램프 교차 규칙(gMax≥초기 gradient, floor≤초기 poolLimitRate, floor=0이면 pStep=0)**: `strategyFormSchema.ts:34-43`(gMax만), `strategyFormGuards.ts:56-59`(`isInvalidVr`), `poolLimitRamp.ts:47-61`(`vrRampInvalidReason`, computeSubmitDisabled :185가 호출), `reconfigureVrFormSchema.ts:44-52`, `useBacktestForm.ts:96` = **5곳** + 서버 `validateVrCommand`.
- **중간부터 시작(수량>0이면 평단가>0 필수 등)**: `strategyFormGuards.ts:19-25`(`isInvalidBootstrap`), `:152-161`(사유 문구), `dcaFormSchema.ts:122-138`, `useStrategyForm`의 호출 = 3곳.
- **시작예정일 ≥ 오늘**: `strategyFormGuards.ts:33`, `dcaFormSchema.ts:119`, `strategyFormHelpers.ts:54`(기본값 `todayKst()`) + `ScheduledStartSection.tsx`(2곳).
- **적립/인출 금액 필수**: `strategyFormGuards.ts:53,173-175`, `reconfigureVrFormSchema.ts:53-59`.

### 4-3. 범위·기본값의 출처: 메타·런타임에서 받는 것 대 하드코딩

| 값 | 출처 | 위치 |
|---|---|---|
| 티커·분할 횟수·밴드 폭·리밸런싱 주기·정기입출금 모드의 허용값·기본값·수정 가능 여부 | **runtime-config**(`/api/runtime-config`, `strategies[type].fields[*]`) | `strategyFormGuards.ts:63-88`, `buildStrategyPayload.ts:48-71`, `strategyFormHelpers.ts:64-90`, `useTypeDefaults.ts:21-65` |
| 최소 주문 금액·금액 자릿수(크립토 DCA) | **메타**(`brokers[].minOrderAmount`·`amountScale`) + 폴백 `FALLBACK_MIN_ORDER`·`CURRENCY_SCALE` | `entities/meta/model/marketRules.ts:17` (폴백은 하드코딩 사본), `dcaFormSchema.ts:43,94-103` |
| DCA 이동평균 기간 목록 | **메타**(`dcaIndicators[].smaPeriods`) | `DcaConditionsSection.tsx:72` |
| 최소 시드 | **서버 계산**(`strategy-seed-preview.minSeed`) | `strategyFormHelpers.ts:91-99`, `useSeedModel.ts:52` |
| DCA 규칙 수 10, 조건 수 10 | **하드코딩** | `dcaFormSchema.ts:9-10` |
| VR 램프 4필드 기본값(모드별) | **하드코딩** `RAMP_DEFAULTS_BY_MODE`(메타·runtime 어디에도 없음) | `entities/strategy/model/vrRamp.ts:33-43` |
| RSI·공포탐욕 0~100, AVG_PRICE > -100, 소수 둘째 자리, percent 0 초과 100 이하, 실행 시각 0~23, 말일 'LAST' | **하드코딩** | `dcaFormSchema.ts:27-35,47,82-86` |
| 크립토 수량 소수 8자리 | **하드코딩** | `dcaFormSchema.ts:123,131` |
| `strategyFormSchema`의 비율 상한 1, 정수 여부, 양수 | **하드코딩**(형식) | `strategyFormSchema.ts:15-33` |
| 자산군 6값·L1 카테고리 UUID 4개(자산 기록 폼) | **하드코딩** | `aggregate.ts:6-16,33` |
| 신규 전략 추천 목록(기본 제안) | **사용자 설정 + 하드코딩 폴백** `DEFAULT_STRATEGY_SUGGESTIONS` | `entities/user/model/types.ts:16-17`(주석 "서버와 동일한 값") |

---

## 5. 상태 재판정 (R5)

응답의 여러 필드(또는 현재 시각)로 UI가 상태를 다시 계산하는 곳.

| # | file:줄 | 줄 | 판정 내용 | 입력 필드 | 대응 엔드포인트 | 비고 |
|---|---|---|---|---|---|---|
| S1 | `entities/order/model/order-readiness.ts:22-70`(전체 64) | 49 | 매수/매도 "미접수", 예수금 부족, 보정 주문 일부 거절 가능, 보유 수량 부족 | `preview.orders[]`·`todayOrders[]`(`timing`·`direction`)·`ledgerCheck`·`accountCashCheck`·`accountHoldingsCheck` | GET /api/trading-cycles/{id}/preview, /api/accounts/{id}/trading-cycles/previews | 소비 `StrategyDetail.tsx:36`, `StrategyCard.tsx:178`(→ `getOrderSignal` :31-40 문구·색 결정 8줄), `NextOrderCard.tsx:82`(같은 `closePlaced` 기준을 한 번 더 씀). 서버가 점검 결과를 내려주는데 UI가 방향별 "미접수"를 직접 결정. 개장/마감 접수 시각(04:30 KST AT_CLOSE)을 코드 주석(:34-35)이 가정 |
| S2 | `entities/strategy/model/scheduled-start.ts:1-17` | 17 | 시작예정 여부 `startDate > todayKst()` + 배지 문구 | `Strategy.startDate` | GET /api/trading-cycles | 소비 `StrategyMetaSection.tsx:27`, `StrategyCard.tsx:171`, `DcaStrategyCard.tsx:46` (3 파일) |
| S3 | `entities/strategy/model/capitalAdjustment.ts:3-14` | 13 | 투자금 추가·인출 가능: 타입이 PRIVACY·INFINITE·DCA + `cycleInProgress` + 장부 예수금(센트 절사) > 0 | `type`·`cycleInProgress`·`ledgerDeposit` | GET /api/trading-cycles/{id} | 소비 `StrategyDetailContent.tsx:51,59`, `inject-capital/InjectCapitalFormBody.tsx:22`, `withdraw-capital/WithdrawCapitalFormBody.tsx:22`. `ledgerDeposit`이 이 판정용으로만 내려옴(b 6-B) |
| S4 | `entities/account/model/apiKeyExpiry.ts:1-26` | 26 | API 키 만료·만료 임박(30일) | `apiKeyExpiresAt` + 현재 시각 | GET /api/accounts | 소비 `AccountCard.tsx:30`, `AccountSummaryCard.tsx:33`. 주석 "api 만료 알림(D-30)과 같은 기준" |
| S5 | `features/finance/manage-budgets/BudgetManager.tsx:57-62` | 6 | 예산 상태 UPCOMING/ACTIVE/ENDED | `applyStartDate`·`applyEndDate` + 오늘 | GET /api/finance/budgets | 목록 필터(:124)와 행 배지(:199)에 사용. `flowAggregate.ts:106-112` `budgetValidInMonth`가 같은 기간 판정을 월 단위로 한 번 더 구현 |
| S6 | `entities/finance/lib/aggregate.ts:52-58` `isMonthClosed` | 7 | 마감 여부(스코프에 맞는 마감 행 선택) | `closings[].month/completed/groupId` + 그룹 id | GET /api/finance/monthly-closings, GET /api/finance/groups | 소비 6곳: `assetFormHelpers.ts:73-75`, `transactionFormHelpers.ts:28-29`, `AssetRecordCheck.tsx:61`, `AssetRecordList.tsx:50`, `BulkRegisterForm.tsx:79`, `FinanceRecordList.tsx:82`. 서버 `MonthlyClosingGuard`와 "동일 스코프" 판정(:48-50 주석). 스코프를 알려고 `useMonthlyClosingScopeGroupId()`(`useFinanceQueries.ts:56-58`)가 그룹 목록 조회에 의존 |
| S7 | `entities/finance/hooks/useFinanceQueries.ts:49-52` `useCanShareToGroup` | 4 | 공유 버튼 노출 = `groups.length > 0` | `/finance/groups` | GET /api/finance/groups | 6개 화면의 `shareToGroup` 요청 필드를 `canShare && 체크박스`로 게이팅 |
| S8 | `widgets/strategy-detail/StrategyDetail.tsx:39,51-58,106`, `DcaStrategyDetail.tsx:103,163-164`, `admin-trade-list/AdminTradeFilterPanel.tsx:61`, `AdminTradesWorkbench.tsx:126` | 약 12 | 전략 상태 `ACTIVE`면 일시중지·즉시 실행 노출, 아니면 재개 | `Strategy.status` | PATCH /trading-cycles/{id}/pause·resume | 서버가 `allowedActions`를 주지 않아 단일 필드 비교가 7곳 |
| S9 | `widgets/strategy-detail/useTodayMarketStatus.ts:1-36` | 36 | 오늘 휴장 확정 여부 | `/api/market/session`의 `tradingDay`·`tradeDateKst`, 월간 휴장일 목록, 주말 | GET /api/market/session, /api/market/holidays | 서버 거래일이 SSOT인데 `tradeDateKst`가 null이면(주석 "구버전 배포 중") KST 요일·휴장일로 폴백 계산 |
| S10 | `entities/finance/lib/aggregate.ts:38-40` `isLiability` | 3 | 대출 판정 `rootCategoryId === SYSTEM_LOAN_CATEGORY_ID` | `rootCategoryId` | asset-snapshots | 서버가 `rootCategoryId`를 채워 주지만 부채 여부 플래그는 없음. 합계 계산 전체(2-1-A)의 분기점 |
| S11 | `features/finance/manage-group/GroupManager.tsx:33` | 1 | 내가 OWNER인가 `members.some(userId===me && role==='OWNER')` | 멤버 목록 | GET /api/finance/groups/{id}/members | 초대 버튼 노출 |
| S12 | `features/auth/reapply/ReapplyButton.tsx:9-18,30`, `RejectedReapplyButton.tsx:10-29` | 각 약 12 | 재신청 쿨다운(1시간/24시간) — `localStorage` 타임스탬프로 UI가 판정 | 로컬 저장 시각 | POST /api/auth/reapply (서버 쿨다운 존재 여부는 이 조사에서 확인 못 함) | 서버 상태 없이 UI가 규칙을 가진 유일한 사례 후보 |
| S13 | `widgets/strategy-detail/orderBannerCopy.ts`·`entities/strategy/model/dcaFormat.ts:73-93` | 약 40 | 배너 분기 문구, DCA 다음 실행 최소/최대 | preview·rules | preview, trading-cycles | b 6-B 인용 |

집계: 판정 로직 **13건**, 코드 약 **210줄**(49+17+13+26+6+7+4+12+36+3+1+12+약 24; 소비처 호출부 제외). 이 중 서버 플래그 한 개로 사라지는 것: S1(→ `warnings`), S2(→ `scheduled`), S3(→ `allowedActions`), S4(→ `apiKeyExpiry`), S8(→ `allowedActions`), S9(→ 서버 `tradingDay` 필수화), S10(→ 필드 추가) — 지침서 10 2-4절이 S1~S4를 이미 계획하고 있다.

---

## 6. 코드값 → 라벨·색·옵션 맵 (R6)

b 문서 4절 표(코드값 집합 19종, 복제 선언 약 110곳, 라벨 맵은 메타 `labelOf`로 대체 진행, union·`z.enum`·옵션 배열·색 맵이 남음)를 그대로 인용한다. 다시 세지 않는다. 아래는 b 4절에 **없는** 항목.

### 6-1. b 4절에 빠진 코드값·라벨 맵 (표시 외 의미를 가진 것)

| 값 집합 | file:줄 | 줄 | 서버 메타 키 |
|---|---|---|---|
| 자산(ASSET) L1 카테고리 UUID 4개 + 이름 라벨 `ASSET_L1_CATEGORY_LABEL` | `entities/finance/lib/aggregate.ts:6-30` | 25 | 없음(서버 시드 V13). `ASSET_CLASS_ORDER` :33과 함께 사본 |
| 자산군 고정 순서 `ASSET_CLASS_ORDER` | `aggregate.ts:33` | 1 | 메타 `assetClasses` 순서가 있음(b 4절은 `assetClasses`를 행으로 올리지 않았다 — 본문 서술에만 등장). AssetRecordList는 `meta.assetClasses` 순서, 집계는 하드코딩 순서로 이원화 |
| 예산 상태 UPCOMING/ACTIVE/ENDED + 필터 옵션 | `features/finance/manage-budgets/BudgetManager.tsx:45-46,58-62` | 약 15 | 없음 |
| 통화 표시 순서 `CURRENCY_ORDER`(KRW,USD,USDT) | `entities/trade/hooks/useDailyTradesRangeQuery.ts:23` | 1 | 없음 |
| 추이 범위 옵션(12/24/36/전체, 5/10/전체) | `entities/finance/lib/period.ts:121-135` | 15 | UI 소유(화면 상태 옵션) |
| 일 수 옵션 365/180/90/30 | `widgets/fear-greed-card/FearGreedSection.tsx:8-10`, `CryptoMarketSection.tsx` | 약 4 | UI 소유 |
| API 키 만료 라벨 | `entities/account/model/apiKeyExpiry.ts:5-8` | 4 | 없음(S4와 함께) |
| 브로커별 키 입력 안내(라벨·링크·힌트·최소 길이) `BROKER_CONFIG` | `features/account/create-account/steps/ApiStep.tsx:19-80` | 약 62 | 없음(13절 참고) |
| 브로커별 계좌번호 형식 `ACCOUNT_CONFIG` | `features/account/create-account/steps/AccountInfoStep.tsx:17-48` | 약 32 | 없음 |

### 6-2. UI 소유(표시 형식)로 분리: 색·아이콘·톤

`ORDER_STATUS_BADGE_CLS`(status-badge.ts:3), `CYCLE_SEED_BADGE_CLS`(badges.ts:1), `strategyStatusAccent`(badges.ts:17), `USER_STATUS_TONE`·`USER_STATUS_COLOR_VAR`(status.ts:26,32), `BROKER_UI` 아이콘(BrokerStep.tsx:16-24), `directionBadgeClass`, `pnlTextClass`, `OrderSignal` 색(StrategyCard.tsx:31-40), `colors.ts`(finance). 코드값을 키로 하되 값이 색·아이콘이라 UI 소유로 본다.

---

## 7. 오류 코드·상태 코드 → 문구 맵 (R7)

| 항목 | 수 | 위치 |
|---|---|---|
| `apiMsg(err, '폴백 문구')` 호출(비테스트, 정의 제외) | **약 31곳, 13개 파일** — entities/user/hooks/useUserQueries.ts 7, entities/privacy/hooks/usePrivacyMutations.ts 5, entities/finance/hooks/useFinanceMutations.ts 5, entities/admin/hooks/useAdminQueries.ts 4, entities/strategy/hooks/useStrategyQueries.ts 3, entities/account/hooks/useAccountMarginQuery.ts 2, 그 외 6개 파일 1씩 | `grep -rn "apiMsg("` (정의는 `shared/lib/api-client/index.ts:27-34`, 서버 `detail`→`message`→폴백 순). 폴백 문구는 서버가 `detail`을 안 줄 때만 노출되는 UI 사본 |
| `toast.error('고정 문구')` 직접 호출 | 11곳 | `grep -rn "toast.error('"` — 예: `ReapplyButton.tsx:31` `err instanceof ApiError ? '재신청에 실패했습니다' : '오류가 발생했습니다'`처럼 서버 `detail`을 쓰지 않고 UI 문구로 덮어쓰는 곳 |
| `apiErrorCode` 분기 | 1곳 | `entities/account/model/brokerCredentials.ts:25-30` `brokerErrorMessage`: `BROKER_CREDENTIAL_INVALID`면 UI의 브로커별 `invalidMessage`(:8-14, 5개 브로커 문구), 그 외 `BROKER_ERROR_MESSAGE`(:17-22, 4개 코드 문구)로 서버 `detail`을 **덮어쓴다**. 소비 `ConfirmStep.tsx`, `ApiStepParts.tsx:127` |
| `err.status === 4xx` 분기로 문구 선택 | 1곳 | `widgets/strategy-detail/orderBannerCopy.ts:61` 404 → '전략 사이클 정보를 찾을 수 없습니다.', 그 외 `apiMsg` |
| 상태 코드 기반 분기(문구 아님) | 4곳 | `shared/lib/api-client/index.ts:95-102`(401 갱신·로그아웃, `TOKEN_BLACKLISTED`), `app/api/trades/stream/route.ts:33`, `shared/lib/proxy/routeHelpers.ts:14-17` |
| 서버 `detail`을 UI 프록시가 지우는 곳 | 1곳 | `shared/lib/proxy/routeHelpers.ts:13-21`: 5xx는 본문을 `{error:'Failed'}`로 뭉개 `detail`을 버리고(내부 오류 노출 방지) 503 `BROKER_UNAVAILABLE`만 title/detail/status/code를 relay. 그 결과 UI는 5xx에서 항상 `apiMsg` 폴백 문구를 보게 된다(`orderBannerCopy.ts:58-59` 주석이 이를 설명) |
| Bean Validation·zod 문구(UI 자체 문구) | 4절 참고 | 형식 검증 메시지는 UI가 소유 |
| 서버 ErrorCode 14값(gen 타입) 중 UI 문구 보유 | 4값 + CREDENTIAL_INVALID | b 4절 마지막 행·6-C 인용 |

---

## 8. 날짜·거래일 계산 (R9)

포맷·상대 표시는 UI 소유로 제외. 업무 규칙 계산만.

| # | file:줄 | 줄 | 계산 | 서버 대응 |
|---|---|---|---|---|
| D1 | `entities/finance/lib/period.ts:12-28,42-62,84-117,137-146` | 약 70 | 월/연 조회 윈도우, 올해=YTD·과거=연 전체, 전년 동일 일자(29일 clamp), 경과 개월 수, 추이 윈도우 | 가계부 집계 서버 이관 시 서버(2-1-D) |
| D2 | `entities/finance/lib/flowAggregate.ts:106-123` | 18 | 예산 유효 개월 수(월 단위 반복 `shiftMonth`) | 서버 |
| D3 | `entities/strategy/model/vr-rollover.ts:1-10` | 10 | VR 다음 리밸런싱일 = 시작일 + 주기×7일(UTC 직접 계산). 주석 "kista-api VrCycleRolloverService의 dueDate와 동일 규칙" | 응답에 `nextRolloverDate` 추가(b 6-B) |
| D4 | `entities/strategy/model/scheduled-start.ts:5-7` | 3 | 시작예정 = `startDate > todayKst()` | S2 |
| D5 | `entities/account/model/apiKeyExpiry.ts:11-18` | 8 | 만료 남은 일수·D-30 | S4 |
| D6 | `widgets/strategy-detail/useTodayMarketStatus.ts:19-35` | 17 | KST 요일로 주말 휴장, 월간 휴장일 목록으로 평일 휴장 | S9. 서버 `/api/market/session`·`/holidays` |
| D7 | `widgets/market-holiday-calendar/WeeklyMarketCalendar.tsx:30-46,225-237` | 약 25 | 주 시작·월 내 주 번호(`weekLabel`), 다음 휴장일 D-day(`Math.round(일수 차)`), 3주 조회 범위 | `/api/market/holidays`(월 단위) 4회 호출 후 합침(9절) |
| D8 | `widgets/benchmark-comparison/model/benchmarkPeriods.ts:20-45` | 26 | `toMonthEnd`·`subtractMonths`(윤년 일수 직접 계산) — 벤치마크 비교 기간 프리셋 | `/api/stats/housing-benchmark` 의 `from`/`to` |
| D9 | `widgets/fear-greed-card/FearGreedSection.tsx:12-30` | 약 10 | KST 오늘 − days일 이후로 자르기 — 주석 "kista-api와 같은 기준" | `/api/market/fear-greed?days=` 가 이미 이 기준 |
| D10 | `entities/trade/hooks/useDailyTradesRangeQuery.ts:25-30` | 6 | `toDateStr`가 브라우저 로컬 `getFullYear/getMonth/getDate`로 요청 날짜를 만든다(KST 아님 — 사실만 기록: `todayKst`를 쓰는 다른 호출과 달리 로컬 시간대 사용) | `/api/daily-trades` |
| D11 | `features/auth/reapply/*` | 약 8 | 쿨다운 분 단위 | S12 |
| D12 | `shared/lib/format/index.ts:130-134`(`toKstDateString`, `todayKst`) | 5 | KST 날짜 문자열 변환 — 표시·기준 날짜 공용 유틸. 사용처 약 40곳(`todayKst()` grep) | 서버 거래일 내려주면 대체 가능한 사용처와 UI 소유(입력 min 등)가 섞여 있음 |
| D13 | `features/strategy/create-strategy/model/dcaFormSchema.ts:119` | 1 | 시작일 ≥ 오늘 KST 검증 | 4절 |

"거래일·영업일 계산"을 UI가 하는 곳: D6, D7(휴장일 목록과 주말로 다음 휴장일), D8 일부. 미국 시장 거래일 판정은 `useTodayMarketStatus`가 서버 값을 우선하고 폴백만 UI가 가진다.

---

## 9. 여러 리소스 합치기 (R11)

"같은 컴포넌트·page에서 3개 이상 엔드포인트를 함께 조회해 조합"하는 곳(`use*Query(` 호출 수 grep + page prefetch 확인).

| # | 화면(file) | 함께 부르는 엔드포인트 | 조합 코드 줄 |
|---|---|---|---|
| M1 | 가계부 수입·소비·저축 탭 `app/(main)/finance/(dashboard)/(flow)/useFinanceFlowData.ts`(134줄, 전체가 조합 훅) | 거래 ×3 윈도우(표시 윈도우·전년 연간·추이) + 카테고리 INCOME/EXPENSE/SAVING 3 + 예산 + 마감·그룹(소비 위젯 쪽) = 7개 쿼리 | 약 134 (+ `FinanceSummary`·`FinanceBudgetProgress`·`FinanceRecordList` 조합) |
| M2 | 가계부 일괄 등록 `widgets/finance-bulk-register/BulkRegisterForm.tsx:77-86`(358줄) | 마감·거래(소스월)·자산 스냅샷 전량·카테고리 ASSET/INCOME/EXPENSE/SAVING 4 = 7개 | 조합·미리보기 `entities/finance/lib/bulkRegisterPreview.ts` 162줄 + 폼 상태 |
| M3 | 주간 시장 캘린더 `widgets/market-holiday-calendar/WeeklyMarketCalendar.tsx:200-237` | 휴장일(월 단위) ×4(전주·이번 주·다음 주 월이 걸치는 달) + daily-trades(3주) + session(상위 `useTodayMarketStatus`) | 약 40 |
| M4 | 계좌 상세 `app/(main)/accounts/[id]/page.tsx:26-44` | 계좌 + 전략 목록 + 포트폴리오(주식) 또는 크립토 포트폴리오 + 전략별 주문 미리보기(previews) = 4~5 | 약 30(`Promise.all` + 브로커별 분기 :37-42) |
| M5 | 전략 상세 `app/(main)/accounts/[id]/strategies/[sid]/page.tsx:24-40` | 계좌 + 전략 상세 + 주문 미리보기 | 약 20 |
| M6 | 자산 폼 `features/asset/save-asset/AssetForm.tsx:48-70` | 카테고리 ASSET + 가계부 계좌 + 내 설정(`me`) + 마감 = 4 | 약 25 |
| M7 | 자산 기록 목록/점검 `AssetRecordList.tsx`, `AssetRecordCheck.tsx` | 스냅샷 + 카테고리 + 마감 + (그룹) = 3~4 | 위 목록·집계 코드에 포함 |
| M8 | 관리자 거래 `widgets/admin-trade-list/AdminTradesWorkbench.tsx:40-80` | trades + 전체 계좌 + 사용자별 계좌 + 계좌별 전략 4개를 선택 상태에 맞춰 연쇄 | 약 40(`userOptions` 합치기 :63-70 포함) |
| M9 | 통계 `app/(main)/stats/page.tsx:26-29` | summary + equity-curve(+ 클라이언트에서 cycles·전략 목록) | 약 10 |

서로 독립적으로 갱신되는 리소스는 UI가 각각 부르는 것이 원칙표 허용이다. "항상 같이 쓰는 묶음"으로 보이는 것: M1(수입·소비·저축 카테고리 3개를 항상 함께 — 서버가 `{INCOME, EXPENSE, SAVING}` 트리를 한 번에 주면 3호출이 1호출), M2(같은 3개 + ASSET), M4(계좌 상세의 전략 + previews + 포트폴리오), M3(월 단위 휴장일을 4번 호출). 3개 이상을 같은 컴포넌트에서 조합하는 곳은 **9곳**, 조합 코드 합계 약 **400줄**(M1 134 + M3 40 + M4 30 + M5 20 + M6 25 + M8 40 + M9 10 + M2 중 조합 약 100 중 일부; bulkRegisterPreview 162는 2절에서 별도 집계했으므로 제외).

---

## 10. 권한 (R10)

| # | file:줄 | 줄 | 내용 | 화면 편의 초과 여부(사실) |
|---|---|---|---|---|
| P1 | `proxy.ts:184-214`(`routeByStatusAndRole`) + `:34-60`(상태·역할 확정) + `:12-13,26` | 약 55 | 쿠키 캐시(1시간)된 `status`/`role`로 `/admin/**` 접근을 ADMIN만 허용, PENDING/REJECTED/ACTIVE 라우팅 강제, 캐시 미스면 kista-api `/api/auth/me` 호출 | UI 서버(Next proxy)가 라우트 접근을 막는다. 서버도 `/api/admin/**`를 `SecurityConfig` 전역 매처로 ADMIN 강제(`AdminFinanceCategoryController:27` 주석, `AdminPingController`의 `hasRole("ADMIN")` 확인)하므로 이중. 서버가 막는다는 점은 코드 주석·소스로 확인, 실제 호출 테스트는 안 함 |
| P2 | `app/(main)/layout.tsx:29-36,53` | 약 10 | `role` 쿠키(없으면 `/me` 폴백)로 `isAdmin` 계산 → 사이드바 관리자 메뉴 노출 | 메뉴 숨김(화면 편의) |
| P3 | `entities/user/model/role.ts`, `features/admin/change-role/ChangeRoleButton.tsx:34` | 약 10 | 현재 역할의 반대 역할 선택 | 서버가 검증 |
| P4 | `features/finance/manage-group/GroupManager.tsx:33` | 1 | OWNER 여부로 초대 버튼 노출 | 화면 편의(서버 OWNER 전용 강제는 `docs/agents/finance.md`가 명시, 코드 확인 안 함) |
| P5 | `entities/finance/hooks/useFinanceQueries.ts:49-52`, `:56-58` | 8 | 그룹 소속 여부로 공유 UI 노출, 마감 스코프 그룹 id 선택 | 5절 S6·S7. 스코프 판정이 UI에도 있다 |
| P6 | `entities/account/*`, 쿼리 `enabled: isAuthenticated` | - | 비회원 게이팅 | `docs/agents/architecture.md`가 명시한 401 루프 방지(화면 편의) |

보안 수단으로 쓰이는 UI 판정: P1이 유일한 후보(서버가 이중 강제). 나머지는 메뉴·버튼 노출.

---

## 11. 종합

### 11-1. 원칙 표 행별 위반 건수·줄 수

| 행 | 위반 건수 | 줄 수 | API가 바뀌면 사라질 UI 줄(추정) | 근거 |
|---|---|---|---|---|
| R1 목록(페이징·정렬·필터·검색) | 위반 10 + 서버 페이지 안 재정렬 1 + 경계 2(L3, L12) | 처리 코드 약 218 + `use-client-pagination.ts` 23 + 수기 `slice` 보조 | 약 200 | L1·L2·L5·L11·L13·L14·L15·L16·L17·L20. 서버가 페이지형·필터·정렬 키를 주면 필터·`slice`·정렬 비교 함수가 사라진다. 단 "전량형 안의 즉시 정렬"(L4·L18·L19)은 남는다 |
| R2 집계·계산 | 가계부 5파일 + 기타 12건 | 가계부 925 + 기타 약 425 | 가계부 650~700 + 기타 약 250 | 2-1·2-2. 차트 좌표 변환 2-3은 제외 |
| R3 금액 반올림 | 9건 | 약 25 | 약 20 | 3-1 |
| R4 업무규칙 검증 | R 254줄 + 사본 5곳(램프) | 254(R) / 116(F) / 73(M) | 약 200(R 중 서버 위임 가능분; 입력 중 즉시 피드백은 12절 후보) | 4 |
| R5 상태 판정 | 13건 | 약 210 | 약 170 | 5 |
| R6 enum 라벨·색·옵션 | b 4절 19집합·약 110선언 + 이 문서 추가 9건 | b 인용 + 추가 약 160 | 라벨 맵·union 대부분(메타 키 추가 시) | b 6-C 약 100줄 + 추가 |
| R7 오류 문구 | apiMsg 폴백 약 31, 고정 toast 11, 코드 분기 1, 상태 분기 1 | 약 90 | 폴백은 유지 필요(서버 미응답) — `brokerCredentials.ts` 맵 약 20줄만 사라질 수 있음 | 7 |
| R8 와이어 타입 | b 인용 | 약 600(변환) + 수기 재선언 74쌍 | 약 700 | b 5·6-A |
| R9 날짜·거래일 | 13건 | 약 230(D1 70+D2 18+D3 10+D6 17+D7 25+D8 26+D9 10 외) | 약 150 | 8 |
| R10 권한 | 1(P1 이중 강제) | 약 55 | 0(서버가 이미 강제, UI는 편의) | 10 |
| R11 리소스 합치기 | 9곳 | 약 400 | 약 150 | 9 |

중복: R2·R5·R9는 같은 줄(예: `isMonthClosed`, `scheduled-start`)을 공유하므로 열 합산은 부정확하다. 서로 겹치지 않게 센 대표값은 b 6-E의 "약 700줄 이상"에 이 문서의 R1(약 220)·R2 가계부(약 650~700)·R4 사본(약 250)·R11(약 150)을 더한 **약 1,900~2,000줄**이다(R2·R5·R9 중복 제거 후 보수적으로 1,800줄 이상).

### 11-2. 늘어나는 데이터를 클라이언트에서 자르는 목록

가계부 거래 목록(L1), 자산 기록 목록(L2), 전략 주문 내역(L5), 관리자 사용자(L11), 관리자 계좌(L13), 감사 로그(L14), 오류 로그(L15), 관리자 거래(L16), PRIVACY 매매표(L17), 일별 체결 집계(L20).

### 11-3. 필요한 API 변경 목록 (엔드포인트별)

| # | 엔드포인트 | 변경 종류 | 내용 |
|---|---|---|---|
| A1 | GET /api/finance/transactions | 페이지형 전환 + 필터 추가 | 커서 페이지, `type`(INCOME/EXPENSE/SAVING), `memo`(검색), `categoryId`(하위 트리 포함), 정렬 파라미터(날짜·카테고리·메모·금액). 현재는 UI가 12개월 윈도우를 전부 받아 5가지를 처리 |
| A2 | 새 집계 엔드포인트 `/api/finance/transactions/summary`·`trend`·`budget-progress`(가칭) | 신규 | 2-1-B의 출력 모양을 그대로: (type, period(month/year), today·기준일) → `{total,count,previousTotal,previousYearTotal,yearlyAverage,remaining,incomeRatio}`; (type, period, bucketCount\|all) → `{period,amount,byCategory}[]`; (type, period) → `BudgetTreeNode` 트리 + `unbudgeted[]` |
| A3 | 새 집계 엔드포인트 `/api/finance/asset-snapshots/summary`·`trend`·`composition`·`check`(가칭) | 신규 | 2-1-A의 7가지 결과: 월별 요약, 월별 L1·자산군 합, N개월 시계열, N개월 구성비, 점검(누락 L1·누락 계좌·날짜별 건수), 기록 월 목록. 부채 판정(`isLiability`)과 월 마감 여부는 서버가 |
| A4 | GET /api/finance/asset-snapshots | 페이지형 전환 | 월·카테고리·자산군·시장 필터 + 정렬 9키 + 커서. 현재 인자 없이 전 기간 전량 |
| A5 | GET /api/finance/bulk-register 미리보기(가칭 `/bulk-register/preview?sourceMonth=`) | 신규 | 2-1-C 출력(`{asset,income,expense,saving: CategoryGroupNode[]}`) |
| A6 | GET /api/trading-cycles/{id}/orders | 페이지형(커서) 전환 + 필터 | `direction`, `orderType`, `status` 필터(기본 FILLED는 UI 상태) |
| A7 | GET /api/trading-cycles/{id}/dca-executions | 정렬 키 보정 | 같은 거래일 안에서 규칙 순서(rule 정렬 순번) 반환 — UI 재정렬(L6) 제거 |
| A8 | GET /api/admin/users, /api/admin/accounts, /api/admin/trades, /api/admin/privacy-trade-bases | 페이지형 전환 + 필터·정렬 | users: status/기간/정렬(상태·역할·닉네임·가입일); accounts: owner/broker/strategyType; trades: userId/accountId/strategyId + 정렬; privacy: 기간·종목·연초재설정 기준 + 정렬. 파라미터명 `range` vs UI `days` 정리 |
| A9 | GET /api/admin/logs/audit, /errors | 페이지형 전환 | audit 고정 100과 errors limit 500을 커서 페이지로. 총건수 대신 `hasMore` |
| A10 | GET /api/daily-trades | 집계 필드 추가 | `byDate[]{date, tradeCount, byCurrency[{currency, buyAmount, sellAmount, buyCount, sellCount}]}`(캘린더 요구) |
| A11 | GET /api/trading-cycles/{id}(및 목록) | 기존 응답에 필드 추가 | `allowedActions`/`blockedActions`, `scheduled: boolean`(S2), `nextRolloverDate`(D3), `canInject`/`canWithdraw`(S3), `nextExecution`·`lastExecution` 집계(dca) |
| A12 | GET /api/trading-cycles/{id}/preview(+previews) | 기존 응답에 필드 추가 | `warnings[{code, detail}]`, 방향별 `unplaced`(S1). 정수 센트 계산 결과(`correctionExcludedBuyUsd`)도 서버가 |
| A13 | GET /api/accounts | 기존 응답에 필드 추가 | `apiKeyExpiry{status,expiresOn,daysLeft}`(S4) |
| A14 | GET /api/finance/budgets | 응답 필드 추가 | 예산 `status`(UPCOMING/ACTIVE/ENDED)(S5) |
| A15 | GET /api/finance/monthly-closings | 응답 변경 | 호출자 스코프에 맞는 마감만 반환하거나 `closed(month)` 판정 필드 제공(S6) — 개인·그룹 행 섞임 해소 |
| A16 | /api/meta | 메타 키 추가 | `userStatuses`·`userRoles`·`skipReasons`·`vrRecurringModes`·`weekdays`·`financeGroupRoles`, 전략 타입 `shortLabel`, 예산 상태, 램프 기본값표, DCA 규칙 수 상한(10, 10) — b 6-B·6-C와 합집합 |
| A17 | GET /api/stats/summary | 응답 필드 추가 | 총 활성 사이클 수 합계(`StatsKpiRow.tsx:13`) |
| A18 | GET /api/stats/housing-benchmark/series·index-series·etf-series | 응답 필드 추가 | 구간 CAGR(C7) |
| A19 | PRIVACY 시계열 `/api/admin/privacy-trade-bases` | 응답 필드 추가 | 누적 실현손익·추정 현금·현금비율·재설정 플래그(C8, 관리자 화면) |
| A20 | 전략 등록·재설정 | 검증을 서버 응답으로 일원화 | 4-2의 사본 5곳(램프 규칙) 대신 서버 `fieldErrors` 확장 속성(지침서 10 2-5절)이 UI 필드로 표시되게 — 즉시 피드백 항목은 12절 |

상위 5개(제거되는 UI 줄 수 기준): ① A2+A3 가계부 집계 엔드포인트(약 650~700줄), ② A1·A4 가계부 거래·자산 목록의 페이지형 전환(약 80줄 + 윈도우 설계 `period.ts` 약 70줄 연동), ③ A11·A12·A13·A14·A15 상태 플래그(약 170줄), ④ A8·A9 관리자 목록 페이지형(약 90줄), ⑤ A16 메타 키 확장(b 6-C 약 100줄 + 이 문서 6-1 추가분).

---

## 12. UI에 남겨야 할 것 같은 후보 (예외 대장 후보, 사실 근거만)

판단은 적지 않고, 각 항목이 어떤 사실 때문에 후보인지만 적는다.

| # | 후보 | file:줄 | 사실 근거 |
|---|---|---|---|
| E1 | 입력 중 즉시 피드백이 필요한 형식·소수 자릿수 검증 | `dcaFormSchema.ts:33-35,84-86,96-103,129-133`, `UnitInput`·`SeedAmountInput`의 `maxDecimals`(`CURRENCY_SCALE`) | 입력칸마다 타이핑 중 거부·마스킹이 동작한다. 서버 검증은 제출 후 400 한 번 |
| E2 | 폼 제출 가능 여부 계산(`computeSubmitDisabled`·`computeCannotSubmit`)과 사유 문구 | `strategyFormGuards.ts:90-200` | 제출 버튼 비활성 사유를 입력 중 필드별로 표시한다. VR 필수 입력은 여러 필드 조합(`vrDerived`)이라 서버 왕복 시 지연이 생긴다(왕복 지연은 이 조사에서 측정하지 않음) |
| E3 | 시드 채우기 비율 버튼 `fillAmount` | `SeedInputSection.tsx:27-31` | 클릭 즉시 입력칸에 값이 들어간다. 서버 값은 `availableCash`(`strategy-seed-preview`) 조회 결과 |
| E4 | 폼 단계별 즉시 계산(VR 파생 `computeVrDerived`의 램프 기본값 placeholder 표시) | `vrDerived.ts:36-84`, `VrFieldControls.tsx:211,227` | "자동" 4필드 placeholder에 서버가 쓸 실제값을 보여준다. 서버 기본값표 응답이 없는 현재는 UI 사본 |
| E5 | 클라이언트 즉시 정렬·필터(전량형) | `AccountManager.tsx:70-84`, `AccountTable.tsx:14-28`, `CryptoHoldingsCard.tsx:54-62`, `StrategyTypeComparison.tsx:33-45`, `OrderRows.tsx:56-66`, `AccountsGrid.tsx` | 데이터가 구조적으로 작다(계좌·전략·보유 종목·전략 유형 4개 등). 원칙 표가 허용하는 전량형 안 즉시 정렬 |
| E6 | 차트 기간 토글(365일 한 번 수신 후 자르기) | `FearGreedSection.tsx:12-30`, `CryptoIndicatorCards.tsx` `.slice(-days)` | 서버 요청 상한이 365일, 토글 시 재조회·로딩 없이 즉시 반응하도록 한 번만 받는다(주석 명시) |
| E7 | 차트 좌표·색·게이지 변환, 이동평균·RSI 덧그림 | `niceTicks.ts`, `FearGreedGauge.tsx:25`, `shared/lib/indicators.ts`, `MarketChartCardInner.tsx:54,125` | 2-3 분류. 이동평균·RSI는 서버가 내려준 시계열 위의 파생 |
| E8 | 낙관적 갱신·캐시 동기화(`upsertById`, `synchronizeListQueries`) | `entities/*/hooks/*Mutations.ts` | UI 소유 목록의 상호작용. 서버 응답으로 목록을 즉시 갱신 |
| E9 | 재신청 쿨다운 안내 | `ReapplyButton.tsx`, `RejectedReapplyButton.tsx` | 서버 쿨다운 존재는 확인 못 함. 클라이언트 `localStorage` 값만 근거 |
| E10 | 비회원 접근 게이팅(`enabled: isAuthenticated`)과 서버 컴포넌트 `isAuthenticated` prop | `docs/agents/architecture.md`, `app/(main)/layout.tsx:36` | 게이팅 없이 401을 맞으면 `clientFetch`의 전역 401 처리가 로그아웃·리로드 루프를 만든다(문서 명시) |
| E11 | 오프라인 판정이 필요한 곳 | 해당 없음 | 코드에서 확인된 오프라인 전용 계산은 없다(`grep -rn "navigator.onLine"` 등은 실행하지 않음 — 확인 못 함) |

---

## 13. KIS·업비트 브로커 삭제 시 영향받는 UI 코드 (추가 항목)

범위: 소스(app·entities·features·widgets·shared)의 비테스트 `.ts/.tsx`, 문서, 테스트. 대소문자 구분 없이 `KIS`, `UPBIT`, `업비트`, `한국투자`, 함수명 `*Kis*`를 grep해 file:줄로 정리했다. `CRYPTO_KRW`/`KRW`는 업비트에 묶인 시장·통화라 별도 열에 둔다(업비트 외에 KRW 크립토 거래소가 연동돼 있는지는 코드에서 확인 못 함 — `BROKER_MARKET`에서 `CRYPTO_KRW`를 쓰는 브로커는 `UPBIT` 하나뿐: `api-schema.ts:62`).

### 13-1. KIS 전용

| file:줄 | 줄 | 내용 | 종류 |
|---|---|---|---|
| `features/account/create-account/steps/ApiStep.tsx:20-30` | 11 | `BROKER_CONFIG.KIS`(제목·설명·키 라벨 `App Key/App Secret`·발급 링크 `securities.koreainvestment.com`·힌트) | 분기·문구 |
| `features/account/create-account/steps/ApiStep.tsx:103-104,116` | 3 | 주석 "KIS/TOSS 모두 훅을 호출", 훅 이름 `useTestKisConnectionMutation`, 주석 "KIS: 연결 테스트 통과 후 다음 활성화 / TOSS: 입력값만" | 이름·주석 |
| `entities/account/hooks/useAccountMarginQuery.ts:95-98`, `entities/account/api/index.ts:47-49`, `entities/account/index.ts:20` | 약 8 | `useTestKisConnectionMutation`·`testKisConnection`(모든 브로커의 연결 테스트가 `POST /api/accounts/connection-tests`를 `broker` 인자와 함께 호출 — 이름만 KIS) | 이름(기능은 공용) |
| `features/account/create-account/steps/AccountInfoStep.tsx:16-31,57` | 약 17 | `ACCOUNT_CONFIG.KIS`(계좌번호 `XXXXXXXX-XX` 정규식·하이픈 자동 포맷), `data.broker \|\| 'KIS'` 기본값 | 분기 |
| `features/account/create-account/steps/ConfirmStep.tsx:24` | 1 | `data.broker \|\| 'KIS'` 기본값 | 분기 |
| `features/account/create-account/steps/BrokerStep.tsx:18` | 1 | `BROKER_UI.KIS`(설명 문구·`Building2` 아이콘) | 문구 |
| `entities/account/model/brokerCredentials.ts:9` | 1 | `BROKER_CREDENTIAL.KIS.invalidMessage` | 문구 |
| `features/account/create-account/steps/ApiStepParts.tsx:126` | 1 | 주석 "KIS 문구는 이 단계에 없는 계좌번호를 짚어 증권사는 공통 문구로 둔다" | 주석 |
| `shared/lib/api-schema.ts:59` | 1 | `BROKER_MARKET.KIS: 'US_STOCK'`(`Record<BrokerCode,…>`라 gen 타입에서 KIS가 빠지면 typecheck가 깨짐) | 분기 |
| `app/pending/page.tsx:16` | 1 | 가입 대기 화면 단계 문구 "KIS API 자격증명 입력" | 문구 |
| `app/(main)/accounts/[id]/page.tsx:37` | 1 | 주석 "MOCK은 KIS-live 포트폴리오 대상이 아니고…" | 주석 |
| `entities/trade/api/index.ts:12` | 1 | 주석 "KIS live 응답은 숫자 필드를 BigDecimal string으로…" — 이 주석이 `normalizePortfolio` 등 정규화(b 5-1, 31줄)의 근거 | 주석(근거) |
| `docs/agents/entities.md`(KIS live API quirk 절 4줄), `docs/agents/strategy.md`, `features.md`, `shared.md`, `copy.md`, 루트 `CLAUDE.md` | KIS·업비트 언급 총 10곳(`grep -c`: entities 2, copy 1, features 2, strategy 3, shared 1, CLAUDE.md 1) | 문서 |
| 생성 타입 `shared/lib/api-types.ts`의 `BrokerCode` 등 | (생성물) | `gen:types`로 따라감 |

KIS 전용 코드 합계: 소스 비주석 약 **40줄**(ApiStep 11 + AccountInfoStep 17 + 기타 문구·기본값 약 12), 이름 변경 대상(`useTestKisConnectionMutation`, `testKisConnection`) 약 8줄. KIS는 **계좌번호 형식을 가진 유일한 브로커 설정**(`ACCOUNT_CONFIG`에는 KIS·TOSS 둘뿐 — `AccountInfoStep.tsx:17-48`)이라, KIS가 삭제되면 `ACCOUNT_CONFIG`는 TOSS 하나가 된다.

### 13-2. 업비트 전용

| file:줄 | 줄 | 내용 | 종류 |
|---|---|---|---|
| `features/account/create-account/steps/ApiStep.tsx:42-52` | 11 | `BROKER_CONFIG.UPBIT`(제목·설명·`Access Key/Secret Key`·발급 링크 `upbit.com/mypage/open_api_management`·힌트) | 분기·문구 |
| `features/account/create-account/steps/ApiStep.tsx:11,168` | 2 | `UpbitKeyGuide` import와 `broker === 'UPBIT'` 렌더 (`runtimeConfig?.brokers.UPBIT?.allowedIp`) | 분기 |
| `features/account/create-account/steps/ApiStepParts.tsx:134,145-147` | 4 | `UPBIT_REQUIRED_PERMISSIONS`(`자산 조회`·`주문 조회`·`주문하기`)와 `UpbitKeyGuide` | 컴포넌트·문구 |
| `features/account/create-account/steps/BrokerStep.tsx:19` | 1 | `BROKER_UI.UPBIT`(문구·`Bitcoin` 아이콘) | 문구 |
| `entities/account/model/brokerCredentials.ts:11,16` | 2 | `BROKER_CREDENTIAL.UPBIT.invalidMessage`("만료된 키는 업비트에서 새로 발급받으세요"), 주석에 `UpbitKeyGuide` 언급 | 문구 |
| `shared/lib/api-schema.ts:62,69,87` | 3 | `BROKER_MARKET.UPBIT: 'CRYPTO_KRW'`, `MARKET_CURRENCY.CRYPTO_KRW: 'KRW'`, 주석 `isKeyOnlyBroker`(업비트·메리츠) | 분기 |
| `shared/lib/api-schema.ts:53,109` | 2 | `TradingMarket`의 `'CRYPTO_KRW'`와 `CRYPTO_MARKETS` 집합 | 타입·분기 |
| `shared/lib/api-schema.ts:88-90` | 3 | `isKeyOnlyBroker` = `isCryptoBroker(broker) \|\| broker === 'MERITZ'` — 업비트(키만 받는 크립토)를 가정한 조건이며, 바이낸스(`CRYPTO_USDT`)도 `isCryptoBroker`라 같은 분기에 탄다 | 분기(공유) |
| `features/strategy/create-strategy/model/dcaFormSchema.ts:38` | 1 | `MARKETS = ['US_STOCK','CRYPTO_KRW','CRYPTO_USDT']` | 분기 |
| `entities/strategy/model/types.ts:28` | 1 | 주석 "MARKET: 코인 시장가(업비트)" | 주석 |
| `entities/strategy/model/dcaFormat.ts:60` | 1 | 주석 "금액은 계좌 시장의 견적 통화(업비트 KRW…)" | 주석 |
| `entities/meta/model/types.ts:34` | 1 | 주석 "BTC·ETH는 CRYPTO_KRW·CRYPTO_USDT를 함께 갖는다" | 주석 |
| `entities/account/model/types.ts:7`, `entities/admin/model/types.ts:20,43`, `CreateAccountStepper.tsx:86`, `AccountInfoStep.tsx:59` | 5 | "업비트·메리츠는 계좌번호가 없어 null"(accountNoMasked null 가능성의 근거), 계좌번호 없는 broker 목록 주석 | 주석·널 처리 근거 |
| `app/(main)/accounts/[id]/strategies/[sid]/inject-capital/InjectCapitalFormBody.tsx:19`, `withdraw-capital/WithdrawCapitalFormBody.tsx:19`, `widgets/strategy-detail/DcaStrategyDetail.tsx:30,90`, `widgets/strategy-card/DcaStrategyCard.tsx:25`, `widgets/stats-overview/CycleRows.tsx:29` | 6 | 주석: 통화가 계좌 통화를 따른다(주식 USD, 업비트 KRW, 바이낸스 USDT), BTC는 업비트·바이낸스 모두에 있어 티커로 정할 수 없다 | 주석 |
| `features/strategy/create-strategy/model/useStrategyForm.ts:50` | 1 | 주석 "isCrypto: 업비트 등 코인 계좌" | 주석 |
| `features/finance/manage-accounts/CLAUDE.md:3` | 1 | "`entities/account`(한국투자증권 브로커 계좌)와는 다른 도메인" | 문서 |

업비트 전용 소스 코드 합계: 분기·문구·컴포넌트 약 **30줄**(ApiStep 13 + ApiStepParts 4 + BrokerStep 1 + brokerCredentials 1 + api-schema 약 6 + dcaFormSchema 1 + 기타), 주석·문서 언급 약 **18곳**.

### 13-3. 삭제 시 함께 따라올 구조(사실만)

- `CRYPTO_KRW`·`KRW` 통화(`CURRENCY_SCALE.KRW: 0`, `Currency` 3값, `MARKET_CURRENCY`, `fmtMoney`/`fmtKrw` 분기)는 업비트 외 KRW 크립토 브로커가 연동돼 있지 않으면 업비트가 유일한 사용처다. 단 KRW는 가계부(`fmtKrw`, 원화 금액)에서 별개로 쓰이므로 `Currency.KRW` 자체는 가계부 때문에 남는다(`shared/lib/format/index.ts:119` 등). 크립토 KRW 시장만 업비트에 묶임: `TradingMarket.CRYPTO_KRW`, `dcaFormSchema.ts:38`, `DcaStrategyDetail`의 통화 분기.
- `isKeyOnlyBroker`는 `isCryptoBroker(broker) || broker === 'MERITZ'`로, 업비트·바이낸스(크립토 전체)와 메리츠를 묶는다. 업비트가 빠져도 바이낸스·메리츠 때문에 남는다.
- `ApiStep`의 `needsTest: true`(모든 브로커가 true), `BROKER_CONFIG`는 `Exclude<BrokerCode,'MOCK'>` 키 맵이라 BrokerCode에서 KIS·UPBIT가 빠지면 두 항목 삭제 없이는 typecheck가 실패한다(`Record` 키 불일치).
- `BROKER_CREDENTIAL`(`CredentialBroker = Exclude<BrokerCode,'MOCK'>`)과 `BROKER_MARKET`(`Record<BrokerCode,TradingMarket>`)도 같은 이유로 KIS·UPBIT 항목이 컴파일 오류를 낸다 — 이 둘이 UI에서 `BrokerCode`가 줄 때 깨지는 지점이다.
- MOCK 브로커의 내부 구현(예: KIS 모의투자를 쓰는지)은 UI 코드에서 확인 못 함. UI에서 `MOCK`은 `isMockBroker`로 별도 취급(`api-schema.ts:49`).

### 13-4. 테스트·E2E에 남는 참조

- 단위 테스트: `'KIS'`/`UPBIT`/`업비트` 리터럴이 있는 `.test.ts(x)`·`__fixtures__` 파일 **38개**, 리터럴 줄 약 **129곳**(`grep -rnE "'KIS'|\"KIS\"|\bUPBIT\b"` 테스트 파일 한정). 대표: `ApiStep.test.tsx`(KIS 연결 테스트 :49-58, UPBIT :91-127), `EditAccountForm.test.tsx`(`upbitAccount` 픽스처, :75-153), `AccountInfoStep.test.tsx`, `BrokerStep.test.tsx`, `ConfirmStep.test.tsx`, `entities/meta/__fixtures__/testMeta.ts`, `dcaTestMeta.ts`, `api-schema.test.ts`, `marketRules.test.ts` 등.
- `tests/`·`e2e/` 디렉토리의 KIS·UPBIT 리터럴: 5곳(`tests/account-cache-fixture.test.ts` 등).
- 위 합계는 삭제 시 수정 대상 테스트 38개 파일로 보면 된다. 내용별 수정 범위는 열어 읽지 않았다.

### 13-5. 13절 집계

KIS 전용 소스 약 40줄 + 이름 8줄, 업비트 전용 소스 약 30줄, 주석·문서 언급 약 28곳(소스 주석 18 + docs 10), 테스트 38개 파일. 소스 변경은 계좌 등록 4개 스텝(`ApiStep`·`AccountInfoStep`·`BrokerStep`·`ConfirmStep`)과 `entities/account/model/brokerCredentials.ts`, `shared/lib/api-schema.ts`, `dcaFormSchema.ts`에 몰려 있다.

---

## 한계·확인 못 한 것

- 서버를 실행하지 않았다. 서버 파라미터·정렬·상한은 컨트롤러 소스(`@RequestParam`)와 07 문서를 읽어 확인했다. 실제 JSON 응답은 보지 않았다.
- 2절 가계부 외 계산 중 대시보드·계좌 상세의 위젯 내부 계산(`DcaStrategyDetail` 평가금 등)은 `reduce`/`+=`/`/ total`/`* 100` grep으로 잡힌 것만 셌다. `.map().reduce()` 이외의 형태로 숨은 합계가 더 있을 수 있다.
- 4절 줄 수 분류는 블록 단위 근사(±10%)다. `validateAdminSettings.ts`는 내용을 분류하지 않았다. `strategyFormGuards.ts`는 전체 200줄을 읽었다.
- 5절 S12(재신청 쿨다운)의 서버 쪽 존재, 10절 P4(OWNER 서버 강제)는 코드로 확인하지 않았다.
- 13절 KIS·업비트는 소스·문서·테스트 grep 기준이다. 런타임 설정 키(`runtimeConfig.brokers.UPBIT`)·`.env`·배포 파일은 조사하지 않았다.
- 줄 수의 합산은 파일별 범위(끝-시작+1)이며 겹치는 범위(2절 vs 5절 vs 8절)는 11-1에서 중복을 따로 표기했다.
