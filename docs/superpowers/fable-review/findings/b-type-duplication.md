# B. 타입·스키마 복제 측정 (kista-ui, 읽기 전용)

측정 기준: 2026-11-11, main(98f0373b). 모든 수치는 TypeScript 컴파일러 API(AST) 스크립트·grep·wc로 센 값이다. 테스트(`*.test.*`)·`__fixtures__`·`e2e`·`tests`·`scripts`는 별도 표기가 없으면 제외했다. 스크립트는 scratchpad에만 두었고 레포는 이 파일 외에 수정하지 않았다.
"필드 겹침"은 두 선언의 최상위 프로퍼티명을 집합으로 대조한 값이다(중첩 객체·타입 자체의 일치는 비교하지 않음).

비교 기준 규모: 비테스트 TS/TSX 41,369줄(api-types.ts 제외) — entities 7,355 / features 10,725 / widgets 14,673 / shared 3,454 / app 3,759. 테스트 파일은 별도로 29,980줄.

---

## 1. 타입 원천 목록

| 원천 | 위치 | 파일 수 | 줄 수 | 비고 |
|---|---|---|---|---|
| OpenAPI 스펙 | `openapi.json` (`fetch:spec` → `scripts/fetch-spec.mjs`, 8080+8081 병합) | 1 (+스크립트 1) | 스크립트 42줄 / json 183,874 byte(개행 1줄) | paths 119, schemas 186 |
| 생성 타입 | `shared/lib/api-types.ts` (`gen:types` = `openapi-typescript openapi.json -o shared/lib/api-types.ts`) | 1 | 9,564 | 스키마 프로퍼티 832개 중 **692개(83%)가 optional(`?:`)**, 필수 140개. 인라인 enum 프로퍼티 62개 |
| 생성 타입 어댑터 | `shared/lib/api-schema.ts` | 1 | 114 | 생성 타입에서 enum 15개 파생(`components['schemas'][..]['x']`) + 수기 정의(OrderType, TradingMarket, Currency, BROKER_MARKET 등) |
| entities 수기 타입 | `entities/*/model/types.ts` | 15 | 967 | 아래 3절 매칭 대상. entities model+api의 선언 190개 중 객체형 110개(필드 합 598), 문자열 union 15개 |
| entities model 전체(비테스트·비queryKey/Options) | `entities/*/model/*.ts` | — | 1,477 | 타입 + 순수 로직 혼재 |
| entities API 계층(응답 정규화 포함) | `entities/*/api/index.ts` | 16 | 1,307 | 정규화 함수 상당수가 여기 있다(5절) |
| zod 스키마 | `features/strategy/{create-strategy,reconfigure-vr,inject-capital,withdraw-capital}/model/*Schema.ts` | 5 | 337 | zod를 import하는 파일은 이 5개뿐. 최상위 `z.object` 7개(필드 4·14·3·7·21·1·1) + reconfigure(17) |
| 폼 값 타입 | `z.infer` 3종(`StrategyFormValues`:strategyFormSchema.ts:45, `DcaFormValues`:dcaFormSchema.ts:142, `ReconfigureVrFormValues`:reconfigureVrFormSchema.ts:68) + 수기 `VrFields`(useStrategyForm.ts:32) 등 | — | — | react-hook-form + zodResolver |
| 표시용(view model) | widgets·features·app·shared의 Props 아닌 객체 타입 | — | — | 50개. Props 타입은 241개(별도). 이 중 entity 타입과 필드 60% 이상 겹치는 것 13개(예: `OrderRowData` OrderRows.tsx:16 — `NextOrderItem`과 6/8) |
| normalizer·mapper | 5절 | 아래 5절 | 아래 5절 | |
| enum·라벨 맵 | 4절 | — | — | |
| Route Handler 쪽 타입 | `app/api/**/route.ts` 등 23개 | 23 | 501 | **도메인 응답 타입 선언 0개**. `shared/lib/proxy/createProxyRoute.ts`(67줄)가 통과(proxy)만 하고, 선언된 타입은 `RouteContext`/`Params`뿐 |

핵심 구조: 생성 타입(9,564줄)이 존재하지만 **런타임 코드가 import하는 파일은 4개뿐**(`entities/admin/model/types.ts`, `entities/market/model/types.ts`, `entities/stats/model/types.ts`, `shared/lib/api-schema.ts`; 나머지 1개는 테스트). 도메인 객체 타입의 대부분은 수기로 다시 썼다.

---

## 2. 개념별 복제 표

범례: gen = `shared/lib/api-types.ts` 스키마(줄은 해당 파일). 겹침% = (공통 필드 수 / 수기 쪽 필드 수). 선언 횟수 = 같은 필드 집합을 따로 선언한 interface/type/zod object 수(Props·인자 묶음 제외, 문자열 union은 4절).

### 2-1. Account (계좌)

| 형태 | 선언 위치 | 필드 | gen 대비 겹침 |
|---|---|---|---|
| gen | AccountResponse :2836 (7), AccountRequest :2805 (6), CredentialsRequest :2873 (3), AccountLedgerTotalsResponse :3606, MultiPriceResponse | — | — |
| 수기 | `Account` entities/account/model/types.ts:4 | 6 | 6/6=100% (gen에만 `currency` 1개 더 있음) |
| 수기 | `AccountRequest` types.ts:19 | 6 | 6/6=100%(필드명 동일) |
| 수기 | `CredentialsRequest` types.ts:13 | 3 | 3/3=100% |
| 수기+Raw | `AccountLedgerTotals` entities/account/api/index.ts:9 (4) + `AccountLedgerTotalsRaw` :51 (4, `number\|string`) | 4+4 | 같은 필드 4개를 한 번 더 선언 |
| Raw | `MultiPriceResponseRaw` api/index.ts:37 | 1 | gen MultiPriceResponse를 수기 재선언 |
| 폼 | `StepData` features/account/create-account/CreateAccountStepper.tsx:13 | 6 | AccountRequest와 4/6=67% |

- 같은 필드 집합 선언 횟수: gen 5 + 수기 4 + 폼 1 + Raw 2 = **12**
- 변환 함수: `Account`·`AccountRequest`는 변환 없음(`fetchEither<Account>` 제네릭 신뢰). `getAccountLedgerTotals` api/index.ts:51-58 (8줄, 숫자 문자열→number·null 보존), `getPrices` :41-46 (5줄, 배열→맵 재구성).
- 하는 일: 단순 복사+`toNum` 변환 / 형태 변환(배열→Record).

### 2-2. Strategy (INFINITE·PRIVACY·VR 공통 + VR 요약)

| 형태 | 선언 위치 | 필드 | gen 대비 |
|---|---|---|---|
| gen | TradingCycleResponse :2549 (17), TradingCycleRequest :2379 (21), VrSummary :2631 (16), VrConfigRequest :2713 (16), StrategySeedPreviewResponse :3522, CapitalInjectionRequest :2922, CapitalWithdrawalRequest :2915 | | |
| 수기 | `Strategy` entities/strategy/model/types.ts:64 | 17 | 17/17=100% |
| 수기 | `StrategyRequest` types.ts:84 | 21 | 21/21=100% |
| 수기 | `StrategyVrSummary` types.ts:7 | 16 | 16/16=100% |
| 수기 | `ReconfigureVrRequest` types.ts:131 | 16 | 16/16=100% |
| 수기 | `StrategySeedPreview` :108 / `CapitalInjectionRequest` :119 / `CapitalWithdrawalRequest` :126 | 5/3/1 | 각 100% |
| zod/폼 | `strategyFormSchema` features/strategy/create-strategy/model/strategyFormSchema.ts:7 → `StrategyFormValues` :45 | 21 | StrategyRequest와 이름 일치 15/21=71%(이름만 바뀐 3개: avgPrice→initialAvgPrice, quantity→initialHoldings, initialValue→initialVrValue 포함하면 의미상 18/21) |
| zod/폼 | `createReconfigureVrFormSchema` reconfigureVrFormSchema.ts:14 → `ReconfigureVrFormValues` :68 | 17 | ReconfigureVrRequest 16개 전부 포함(16/17=94%), `recurringMode`만 폼 전용 |
| zod/폼 | `injectCapitalFormSchema`(1필드), `withdrawCapitalFormSchema`(1필드) | 1+1 | 요청 타입의 부분 |
| 수기 폼 상태 | `VrFields` useStrategyForm.ts:32 | 14 | StrategyRequest와 10/14=71%(램프 8+intervalWeeks+bandWidth) |
| 수기 | `VrRampValues` entities/strategy/model/vrRamp.ts:11 | 8 | 램프 8필드 100% |
| 수기 | `CurrentVrRamp` reconfigureVrFormSchema.ts:5 | 6 | StrategyVrSummary와 6/6 |
| 수기(백테스트) | `BacktestParams` entities/backtest/model/types.ts:5 | 21 | VR 램프 8필드를 `vr` 접두어로 재선언(`vrPGraceWeeks` :24) |

- 같은 필드 집합 선언 횟수: gen 7 + 수기 7 + zod/폼 7 + 백테스트 1 = **22**.
- 램프 필드 하나(`pGraceWeeks`)의 타입 수준 선언 위치: gen 3곳(api-types.ts:2470·2700·2765) + 수기 9곳 — `types.ts:21·101·140`, `VrFieldControls.tsx:155`, `vrRamp.ts:17`, `useStrategyForm.ts:44`, `strategyFormSchema.ts:30`, `reconfigureVrFormSchema.ts:27`, `entities/backtest/model/types.ts:24`(`vrPGraceWeeks`). 이 필드를 참조하는 비테스트 파일은 11개(실측). 램프 필드 하나를 추가·변경하면 약 12곳을 손대야 한다.
- 변환 함수:

| 함수 | 위치 | 줄 | 실제로 하는 일 |
|---|---|---|---|
| `normalizeStrategy` | entities/strategy/api/index.ts:104-125 | 22 | 17필드 전부 같은 이름 복사. `String()`/`Number()`/`optDec`/`optNum`/`optStr`(null→undefined) 강제 변환, `cycleSeedType ?? 'NONE'`, `Boolean()` 2개. **이름 변경 0** |
| `normalizeVrSummary` | :11-32 | 22 | 16필드 `toNum`/`Number` 강제 변환(`recurringAmount ?? 0`). 이름 변경 0 |
| `getStrategySeedPreview` 인라인 매핑 | :208-230 | 23 | 5필드 null 보존 `toNum`/`String` |
| `buildStrategyPayload` | features/strategy/create-strategy/model/buildStrategyPayload.ts:27-88 | 62 | 폼값→요청: 조건부 필드 생략, runtime 설정에 따라 기본값 치환, 3개 이름 변경(avgPrice→initialAvgPrice 등) |
| `buildStrategyFormDefaults`+`buildVrDefaults`+`toRecurringMode`+`toCycleSeedType` | strategyFormHelpers.ts:18-57,104-107 | 41 | 응답→폼 초기값 (`vr?.x ?? null` 복사 중심, recurringAmount 부호→모드 파생) |
| `computeVrDerived` | vrDerived.ts:36-84 | 약 49 | 서버 검증 사전 계산(5절·6절) |
| `toReconfigureVrRequest` | features/strategy/reconfigure-vr/ReconfigureVrForm.tsx:40-60 | 21 | 16필드 중 15개가 `x ?? undefined`(폼 null→요청 undefined) — **순수 null 처리** |

### 2-3. DCA 전략

| 형태 | 선언 위치 | 필드 | 겹침 |
|---|---|---|---|
| gen | DcaConfigRequest :2344, DcaRuleRequest :2348, DcaConditionRequest, DcaSizingRequest, DcaResponse :2505, DcaRuleResponse :2510, DcaConditionResponse :2496, Sizing :2543, NextExecution, LastExecution, DcaExecutionItem :3175, DcaExecutionPageResponse :3190 | 12개 | |
| 수기 | `DcaRuleRequest` entities/strategy/model/types.ts:38 | 10 | 10/10=100% |
| 수기 | `DcaConfigRequest` :50, `DcaSizing` :37, `DcaCondition` :33, `StrategyDcaSummary` :58, `DcaExecution` :59 (10), `DcaExecutionPage` :62 (4) | | 각 100% |
| 수기 | `DcaRule` :52 (`Omit<DcaRuleRequest,…>`로 상속 + 4필드) | 4+8 | 12/12=100% |
| 수기 | `DcaRuleExecution` :51, `DcaExecutionFilters` :61 | | |
| zod/폼 | `conditionSchema` features/strategy/create-strategy/model/dcaFormSchema.ts:13 (4), `dcaRuleSchema` :41 (14), `dcaFormSchema` :107 (7) | 25 | `dcaRuleSchema` vs `DcaRuleRequest`: 이름 일치 9/10=90%(`sizing` 객체를 `sizingType`·`amount`·`percent`로 펼침, `market`·`orderAmount`는 폼 전용) |
| 표시 | `DcaRuleSummaryInput` entities/strategy/model/dcaFormat.ts:58 | — | |

- 선언 횟수: gen 12 + 수기 10 + zod/폼 3 + 표시 1 = **26** (문자열 union 7개는 4절).
- 변환 함수:

| 함수 | 위치 | 줄 | 하는 일 |
|---|---|---|---|
| `normalizeDcaCondition` | entities/strategy/api/index.ts:34-42 | 9 | `String(x) as DcaIndicator` 등 **검증 없는 타입 단언** + `toNum` |
| `normalizeDcaSizing` | :48-51 | 4 | 복사+`optDec ?? null` |
| `normalizeDcaRule` | :53-73 | 21 | 복사+강제 변환. 실제 검증은 `isDcaWeekday`(:44, 3줄) 하나뿐 |
| `normalizeDca` | :75-83 | 9 | 복사 |
| `normalizeDcaExecution` | :85-102 | 18 | 복사+null→undefined |
| `listDcaExecutions` 페이지 매핑 | :173-182 | 10 | `Number()` 4개 |
| `buildDcaPayload.ts` (`toCondition` 5 + `toRule` 20 + `buildDcaConfig` 3 + `buildDcaCreatePayload` 14) | features/strategy/create-strategy/model/buildDcaPayload.ts:5-52 | 42 | 폼→요청: sizing 펼침 해제, dayOfMonth `'LAST'`→null/`Number`, 주기 전환 후 남은 값 제거 |
| `ruleToFormValue`+`buildDcaRuleDefaults`+`buildDcaFormDefaults` | dcaFormSchema.ts:145-187 | 41 | 요청 형태→폼 형태(sizing 펼침, dayOfMonth 문자열화) |

### 2-4. Order (주문)

| 형태 | 선언 위치 | 필드 | 겹침 |
|---|---|---|---|
| gen | NextOrdersResponse :3012, PositionSnapshot :3039, NextOrderItem :2980, LedgerCheckSummary :2970, AccountCashCheckSummary :2952, AccountHoldingsCheckSummary :2962, TodayOrderItem, StrategyOrderItem :3106, StrategyOrdersResponse, PlacedOrderItem :2889, ExecuteOrdersResponse, CancelOrdersResponse | 12개 | |
| 수기 | `NextOrderPreview` entities/order/model/types.ts:50 | 9 | 9/9=100% |
| 수기 | `NextOrderPositionSnapshot` :1 (10), `NextOrderItem` :14 (6), `LedgerCheck` :28 (4), `AccountCashCheck` :36 (4), `AccountHoldingsCheck` :44 (3), `StrategyOrder` :62 (9) | | 각 100% |
| 수기 | `PlacedOrder` shared/model/placed-order.ts:1 | 7 | gen 6개+`status` 1(=100%) |
| 수기 | `CancelOrdersResult` entities/order/api/index.ts:8 | 3 | gen CancelOrdersResponse와 동일 |
| 폼/표시 | `OrderRowData` widgets/strategy-detail/OrderRows.tsx:16 (8), `DraftOrder` widgets/admin-privacy-trade-list/CreatePrivacyBaseDialog.tsx:24 (5) | | NextOrderItem과 6/8=75%, AdminPrivacyOrderRequest와 4/5=80% |

- 선언 횟수: gen 12 + 수기 9 + 표시/폼 2 = **23**.
- 타입 불일치(생성 타입을 그대로 못 쓰는 증거): `NextOrderPositionSnapshot`의 `averagePrice`·`deposit`·`totalAssets`·`priceOffsetRate`·`unitAmount`·`referencePrice`·`targetPrice` 7개와 `NextOrderItem.price`는 **수기=`string`, gen=`number`**(api-types.ts:3039-3050, :2999). 정규화가 `String(...)`을 거는 이유가 여기 있다.
- 변환 함수:

| 함수 | 위치 | 줄 | 하는 일 |
|---|---|---|---|
| `normalizePreview` | entities/order/api/index.ts:37-75 | 39 | 필드 복사+`String`/`Number` 강제(위 7+1개는 number를 string으로 바꿔 저장). 이름 변경 0 |
| `normalizeLedgerCheck`/`normalizeAccountCashCheck`/`normalizeAccountHoldingsCheck` | :14-35 | 10/5/5 | null 처리+`toNum`+`Boolean` |
| `listStrategyOrders` 매핑 | :116-134 | 19 | 공통 base 재사용 후 `ticker` 제거, `filledQuantity`/`filledPrice` null 보존 |
| `normalizePlacedOrderBase` | shared/model/placed-order.ts:14-25 | 12 | 7필드 `String`/`Number` 복사 — `status`는 호출부 책임(주석) |
| `normalizePlacedOrder` | entities/strategy/api/index.ts:200-206 | 7 | base+`status ?? 'PLACED'` 기본값 |
| `executeStrategy` 응답 처리 | :232-242 | 11 | `orders` 평탄화, id가 `'null'`인 항목 제거 |
| `computeOrderReadiness` | entities/order/model/order-readiness.ts:23-64 | 42 | 순수 파생 로직(6절) |

### 2-5. 포트폴리오·체결·사이클 이력 (trade/account)

| 형태 | 선언 위치 | 필드 | 겹침 |
|---|---|---|---|
| gen | PortfolioSummaryResponse :3576, PortfolioSummaryDto, PositionDto, CryptoPortfolioResponse :3650, CryptoHoldingResponse :3635, ItemDto :3267, DailyTransactionResponse, CycleHistoryResponse :3153, CycleHistoryPageResponse :3145, CryptoPricesResponse, CryptoPrice | 11개 | |
| 수기 | `PortfolioSummary` entities/trade/model/types.ts:31 (최상위 2 + 중첩 8+8) | | 2/2=100% |
| 수기 | `DailyTransaction` :54 (8), `CryptoHolding` :69 (5), `CryptoPortfolio` :77 (4), `CycleHistoryItem` :16 (6), `CycleHistoryPage` :25 (3) | | 각 100%(`CycleHistoryItem`은 gen에 `closingPrice` 1개 더) |
| 수기(gen 없음) | `TradeEvent` :1 (9) — SSE 이벤트 | | 비교 대상 없음 |
| Raw | `CryptoPortfolioRaw` entities/trade/api/index.ts:78 (6) | | `CryptoPortfolio`와 같은 필드+deprecated 별칭 3개 |

- 선언 횟수: gen 11 + 수기 8 + Raw 1 = **20**.
- 변환 함수:

| 함수 | 위치 | 줄 | 하는 일 |
|---|---|---|---|
| `normalizePortfolio` | entities/trade/api/index.ts:13-43 | 31 | 16필드 `toNum`/null 보존 복사, 이름 변경 0. 주석 "KIS live 응답은 숫자 필드를 BigDecimal string으로 내려보내는 경우가 있어" |
| `getCryptoPortfolio` | :101-113 | 13 | 복사+`toNum`+**deprecated 별칭 3개 폴백**(`krwCash`→`cash`, `totalAssetKrw`→`totalAsset`, `evalAmountKrw`→`evalAmount`)+`currency` 검증(`toCurrency ?? 'KRW'`) |
| `getCryptoPrices` | :95-99 | 5 | 배열→Record |
| `getAccountCycleHistory`/`getDailyTransactionsBatch` | | | 변환 없음(제네릭 신뢰) |

### 2-6. 가계부 (Finance 거래·카테고리·자산·예산)

| 형태 | 선언 위치 | 필드 | 겹침 |
|---|---|---|---|
| gen | FinanceTransaction Req/Res :3689/:3710, FinanceCategory :3741/:3765, FinanceBudget :3803/:3828, AssetSnapshot :3863/:3906, FinanceAccount :3970/:3997, MonthlyClosing :4579, FinanceGroup :4606, GroupMember :4970, GroupInvitation :4211, AssetItem :4220, TransactionItem :4240, BulkFinanceRegisterRequest :4236, BulkFinanceRegisterResponse :4249 | 19개 | |
| 수기 | entities/finance/model/types.ts:4·23·34·45·57·64·71·80·86·92·97·107·114·124·133·144·151·156 | 18개 (필드 합 약 95) | 17개 100%, `FinanceGroup`만 1/1(gen에 `name` 1개 더 있음 → 1/2) |
| 폼/표시 | `AssetFormInitialValues` features/asset/save-asset/model/assetFormHelpers.ts:41 (7), `PayloadInput` :95 (8) | | `AssetSnapshot`과 6/7=86%, 7/8=88% |
| 수기 union | `FlowType` entities/finance/lib/budgetRoutes.ts:3, `FlowCategoryType` app/(main)/finance/(dashboard)/(flow)/useFinanceFlowData.ts:21 | | 둘 다 `'INCOME'\|'EXPENSE'\|'SAVING'` — `FinanceCategoryType`(gen 파생)의 부분집합을 두 번 수기 선언 |

- 선언 횟수: gen 19 + 수기 18 + 폼 2 = **39**.
- 변환 함수: **응답 정규화 0개**(finance api 33개 호출 전부 제네릭 신뢰). 예외 `withDefaultAmount` entities/finance/api/index.ts:25-27 (3줄, `amount ?? 0`; 주석 "서버가 실제로 누락시키진 않지만 방어적으로"). 폼→요청 `buildAssetPayload` assetFormHelpers.ts:106-119 (14줄), `buildCategoryPayload` categoryFormHelpers.ts:16-32 (17줄) — 필드 복사+조건부 생략.

### 2-7. User / AdminUser

| 형태 | 선언 위치 | 필드 | 겹침 |
|---|---|---|---|
| gen | UserResponse :4324 (10), AdminUserResponse | | |
| 수기 | `User` entities/user/model/types.ts:4 | 9 | 9/9=100%(gen에 `rejectReason` 1개 더) |
| gen 파생 | `AdminUser` entities/admin/model/types.ts:13 | | `Required<gen>` — 수기 재선언 아님 |

- 선언 횟수: gen 2 + 수기 1 = **3**. 변환 함수 0.
- 이 개념의 파생 UI 코드는 값 집합 쪽에 있다: `entities/user/model/status.ts`(44줄: `USER_STATUS_LABEL` :7, `ADMIN_USER_STATUS_LABEL` :17, `USER_STATUS_TONE` :26, `USER_STATUS_COLOR_VAR` :32), `role.ts`(6줄: `USER_ROLE_LABEL`) — 4절 참고.

### 2-8. 통계·백테스트·벤치마크

| 형태 | 선언 위치 | 필드 | 겹침 |
|---|---|---|---|
| gen | TypeStats :3213, StatsSummaryResponse :3206, EquityCurvePoint :3226, EquityCurveResponse :3232, CyclePerformanceItem :3235, CyclePerformancePageResponse :3254, BacktestPoint :3498, BacktestResponse :3504, BacktestSummary :3511 | 9 | |
| 수기 | entities/stats/model/types.ts:6·18·33·39·43·70, entities/backtest/model/types.ts:32·38·48 | 9개(필드 9·5·3·1·12·4 / 3·7·4) | 9개 모두 100% |
| gen 파생(복제 아님) | `HousingBenchmark*` 14개 entities/stats/model/types.ts:99-116, `MarketSession`·`CryptoMarketIndicators*` entities/market/model/types.ts:29-34 | | `components['schemas'][...]` 직접 별칭 |
| 표시 | `NormalizedRow` widgets/stats-overview/lib/normalizeEquityCurve.ts:3 (3), `EquityLineChartRow` shared/ui/EquityLineChart.tsx:9 (3) | | `EquityPoint`와 2/3 |

- 선언 횟수: gen 9 + 수기 9 + 표시 2 = **20**.
- 이 영역은 한 파일(`stats/model/types.ts`) 안에 "수기(위쪽 1-75줄)"와 "gen 파생(위 14개)"이 섞여 있다. `docs/agents/entities.md:60`은 "이 엔드포인트 타입은 `api-types.ts` 생성물이 아니라 `model/types.ts` 수기 정의다"라고 적는다.
- 변환 함수: 응답 정규화 0. `normalizeEquityCurve` widgets/stats-overview/lib/normalizeEquityCurve.ts:10-22 (13줄) — 차트용 100 기준 재계산(실제 계산, 복사 아님).

### 2-9. 메타·런타임 설정·관리자 설정

| 형태 | 선언 위치 | 필드 | 겹침 |
|---|---|---|---|
| gen | MetaBundle :4823 (20), StrategyTypeMeta :4865 (12), TickerMeta :4897 (4), BrokerMeta :4762 (8), EnumMeta :4812 (3), DcaIndicatorMeta :4799 (4), RuntimeSettingsResponse :4157, FieldResponses :4145, StrategyFieldSettingsObject :4177, AdminSettingsRequest :4028, FieldRequests :4104, FieldRequestBigDecimal/Integer/RecurringMode/StrategyTicker | 약 12 | |
| 수기 | entities/meta/model/types.ts:1·7·24·28·38·48 | 6개 | `MetaBundle` 20/20, `StrategyTypeMeta` 12/12, `EnumMeta` 3/3. `TickerMeta`는 수기 6 vs gen 4(수기에만 `exchangeCode`·`market`), `BrokerMeta`·`DcaIndicatorMeta`는 `EnumMeta` 확장이라 gen과 동일 |
| 수기 | entities/runtime-config/model/types.ts:7·15·19·27 | 4개 | 응답 구조를 4개 선언 |
| 수기 | entities/admin-settings/model/types.ts:7·13·18·22·30 | 5개 | 요청 구조를 5개 선언. `AdminFieldSettings`(:7)와 `RuntimeFieldSettings`(runtime-config:7)는 **필드 3개가 동일**(customizable·allowedValues·defaultValue) |

- 선언 횟수: gen 약 12 + 수기 15 = **약 27**(요청/응답 대칭 구조를 두 entity에 따로 둠). 변환 함수 0(제네릭 신뢰).

---

## 3. 생성 타입 직접 사용 대 수기 재선언

측정 방법: entities/shared의 수기 객체 타입 중 이름·필드로 gen 스키마와 1:1 대응되는 것을 필드명 대조(scratchpad 스크립트 `cmp.cjs`)로 74쌍 확인.

| 항목 | 값 |
|---|---|
| gen 스키마 총수 | 186 |
| 수기 재선언 쌍(위 2절 표) | **74쌍** (수기 필드 합 452, gen 필드 합 464) |
| 수기 필드 중 gen에 같은 이름이 있는 비율 | 449/452 = **99.3%** |
| gen 필드 중 수기에 있는 비율 | 449/464 = 96.8% |
| 필드 집합이 완전히 동일한 쌍 | 66/74 = 89% |
| 차이가 나는 8쌍 | `Account`(gen +`currency`), `User`(+`rejectReason`), `CycleHistoryItem`(+`closingPrice`), `FinanceGroup`(+`name`), `TickerMeta`(수기 +`exchangeCode`·`market`), `PlacedOrder`(수기 +`status`), 나머지 `BrokerMeta`·`DcaIndicatorMeta`는 `EnumMeta` 상속 구조 차이 |
| 생성 타입을 직접 별칭·파생하는 선언 | `entities/admin/model/types.ts` 약 10개, `entities/stats/model/types.ts` housing 14개, `entities/market/model/types.ts` 약 4개 = 약 28개, 여기에 `shared/lib/api-schema.ts` enum 파생 15개 |
| `components['schemas']` 인용을 가진 비테스트 파일 | **4개**(admin·market·stats model + api-schema). `shared/lib/api-schema.ts`는 82개 파일이 import(enum·헬퍼 용도) |
| 생성 타입 스키마 중 코드가 참조하는 고유 스키마 | 38개/186 = 20% |
| entities api 제네릭 | 116개 fetch 호출 중 void 31, 수기 타입 신뢰 68, `unknown`/`Raw`→정규화 17 |

비율: 객체 타입 기준 **수기 재선언 74 : 생성 파생 약 28 ≈ 73% : 27%**. 즉 도메인 객체 타입의 약 3/4가 수기 재선언이다.

수기 재선언의 이유가 적힌 곳(전부 확인한 위치):
- `entities/admin/model/types.ts:3-4` — "서버 record라 항상 전 필드를 보내지만 스펙엔 optional로 생성돼 Required로 고정한다. 스펙의 nullable 표기도 실제와 어긋나(@Schema nullable 누락) null이 오는 필드는 NullableFields로 따로 연다."
- `shared/lib/api-schema.ts:22-24` — 주문 유형은 enum이 스펙에서 사라져 "도메인 결합을 피해 여기서 수기로 정의한다".
- `shared/lib/api-schema.ts:26-29` — enum만 사라지는 회귀가 조용해서 `ExactUnion` 컴파일 타임 고정.
- `entities/strategy/model/types.ts:1` — "type/status/ticker는 string — 백엔드 메타 API가 SSOT (리터럴 직접 사용 금지)".
- `entities/trade/api/index.ts:12` — "KIS live 응답은 숫자 필드를 BigDecimal string으로 내려보내는 경우가 있어 entities 계층에서 정규화한다". `entities/strategy/api/index.ts:10` — "VR 요약 숫자 문자열 → number 변환".
- `docs/agents/entities.md:65` — "KIS live 응답은 UI 타입과 필드명이 다를 수 있다 … 불일치는 `entities/*/api`의 normalizer에서 변환한다".
- `docs/agents/shared.md:70` — "`normalize.ts` — API 응답(unknown) → 도메인 타입 정규화 경량 헬퍼 … zod 대체 아님".
- **일반 정책으로서 "왜 생성 타입을 안 쓰고 수기로 재선언하는가"를 적은 문서는 찾지 못했다.** `docs/agents/*.md`, `entities/CLAUDE.md`, `shared/CLAUDE.md` grep 결과 `entities.md:60`(stats만)과 `shared.md:71`(enum은 api-schema에서 가져와라)뿐이다. 이유는 위 주석들에서 추정할 수 있을 뿐이다(확인 못 함).

추정되는 구조적 이유(코드로 확인된 것만): ① 생성 스키마 프로퍼티의 83%가 optional이라 그대로 쓰면 모든 필드에 `?`·가드가 붙는다(692/832) ② 스펙은 소수·금액을 `number`로 적지만 UI는 일부 필드를 `string`으로 다룬다(2-4절 8개 필드) ③ 서버가 BigDecimal을 문자열로 내려보낸다는 주석(trade/api:12) — 단 이 실제 와이어 형태는 서버를 실행하지 않아 **확인 못 함**.

---

## 4. enum·코드값 복제

범례: 서버 메타 = `/api/meta`(`MetaBundle`, entities/meta) + `useMeta().labelOf(category, code)`. `labelOf` 호출은 비테스트 코드에서 110회(카테고리 17종, 상위: strategyTypes 28, orderDirections 19, orderTypes 14, assetClasses 9, strategyStatuses 8, brokers 8), `useMeta`/`findStrategyType`/`findTicker` 사용 파일 58개. 아래는 **메타로 대체되지 않은 선언**을 센다. 값 집합은 서버 메타가 제공하는 것과 아닌 것으로 구분했다.

| 값 집합 | 서버 메타 키 | UI 측 별도 선언(file:line) | 선언 수 |
|---|---|---|---|
| 주문 상태 (7값) | `orderStatuses`(optional) | gen 파생 `OrderStatus` api-schema.ts:19 + `ExactUnion` 고정 :33; `PlacedOrder.status` 3값 부분 union placed-order.ts:8; 색 `ORDER_STATUS_BADGE_CLS` status-badge.ts:3 (`Record<string,string>`) ; `StrategyOrder.status: string` order/types.ts:68; `AdminTrade.status` admin/types.ts:30 | 5 (라벨은 메타) |
| 주문 방향 BUY/SELL | `orderDirections` | gen 파생 `OrderDirection` api-schema.ts:16; 리터럴 union `'BUY'\|'SELL'` — order/types.ts:65, privacy/types.ts:3, `DcaDirection` strategy/types.ts:27, placed-order.ts:4·19, orderBannerCopy.ts:21, NextOrderCard.tsx:53·61; 옵션 배열 `PRIVACY_ORDER_DIRECTIONS` privacy/options.ts:4; `z.enum` dcaFormSchema.ts:45; `BADGE_LABEL` WeeklyMarketCalendar.tsx:54 | 약 10 |
| 주문 유형 LOC/MOC/LIMIT/MOO/MARKET | `orderTypes` | `OrderType` api-schema.ts:25(수기 3값); privacy/types.ts:4 (같은 3값 union); `PRIVACY_ORDER_TYPES` privacy/options.ts:5; `DcaOrderType` strategy/types.ts:28 (MOO·MOC·MARKET); `z.enum` dcaFormSchema.ts:46; CreatePrivacyBaseDialog.tsx:34 기본값 | 5 |
| 증권사/거래소(KIS TOSS UPBIT BINANCE MERITZ MOCK) | `brokers` | `BrokerCode` api-schema.ts:8 (gen 파생); `BROKER_MARKET` api-schema.ts:58-65; `BROKER_UI`(아이콘·설명) BrokerStep.tsx:16; `BROKER_CREDENTIAL` brokerCredentials.ts:8; 리터럴 분기 ApiStep.tsx:163·169, api-schema.ts:89; 런타임 설정 brokers 키 | 6 |
| 시장 US_STOCK/CRYPTO_KRW/CRYPTO_USDT | `markets` | `TradingMarket` api-schema.ts:53 (수기); `MARKET_CURRENCY` :67; `CRYPTO_MARKETS` :109; `z.enum(MARKETS)` dcaFormSchema.ts:38; marketRules.ts:23 `'US_STOCK'` 기본; useStrategyFormData.ts:26 | 6 |
| 통화 USD/KRW/USDT | `brokers[].currency`·`amountScale`(BrokerMeta) | `Currency` api-schema.ts:54 (수기); `toCurrency` :102; `CURRENCY_SCALE` :96; `z.enum(['USD','KRW','USDT'])` dcaFormSchema.ts:43; `CURRENCY_ORDER` useDailyTradesRangeQuery.ts:23; format/index.ts:31·120·125 분기 | 6 |
| 전략 타입 INFINITE/PRIVACY/VR/DCA | `strategyTypes`(+`enabled`) | `StrategyType` gen 파생 api-schema.ts:12; `BacktestType` backtest/types.ts:3 (3값 부분집합); `DEFAULT_STRATEGY_SUGGESTIONS` user/types.ts:17; `supportsCapitalAdjustment` capitalAdjustment.ts:5; `strategyTypeShort` badges.ts:21-25; `AdminSettingsForm.tsx:209-231`·`useBacktestForm.ts:20` 등 리터럴 분기(전체 비테스트 `'INFINITE'` 16줄/9파일, `'DCA'` 20줄/15파일) | 약 8곳 + 리터럴 분기 |
| 전략 상태 ACTIVE/PAUSED/ARCHIVED | `strategyStatuses` | strategy/types.ts:68 (`string`, 주석에만 값 나열); admin/types.ts:36 리터럴 union; 리터럴 분기 StrategyDetail.tsx:58, DcaStrategyDetail.tsx:103, CyclePerformanceList.tsx:64, AdminTradesWorkbench.tsx:126, useStrategyQueries.ts:182 | 약 7 |
| 연속 사이클 정책(NONE/MAX/MAINTAIN) | `cycleSeedTypes` | `CycleSeedType` api-schema.ts:11; `CYCLE_SEED_BADGE_CLS` badges.ts:1; 폼은 별개 집합 `z.enum(['KEEP','MAX'])` strategyFormSchema.ts:11; `toCycleSeedType` strategyFormHelpers.ts:104 | 4 |
| VR 정기입출금 모드 DEPOSIT/HOLD/WITHDRAW | **없음** | `RecurringMode` gen 파생 api-schema.ts:30; `VrRecurringMode` vrRamp.ts:1; `VR_RECURRING_MODE_LABEL` vrRamp.ts:4; `RAMP_DEFAULTS_BY_MODE` vrRamp.ts:34; `RECURRING_MODES` VrFieldControls.tsx:57; `RECURRING_MODES`·`RECURRING_MODE_OPTIONS` recurringModeOptions.ts:3·5; `z.enum` strategyFormSchema.ts:18, reconfigureVrFormSchema.ts:21; 인라인 union VrSettingsSection.tsx:14·15; `ALL_RECURRING_MODES` ReconfigureVrSections.tsx:26 | **11** |
| DCA 주기·지표·연산자·금액방식·부족정책 | `dcaFrequencies`·`dcaIndicators`·`dcaOperators`·`dcaSizingTypes`·`dcaShortfallPolicies` | 각각 union(strategy/types.ts:29·31·32·34·35) + `z.enum`(dcaFormSchema.ts:14·15·48·51·52) = 5집합 × 2 = 10 | 10 (라벨은 메타) |
| DCA 요일 | 없음 | `DcaWeekday` strategy/types.ts:30; `WEEKDAY_LABEL` dcaFormat.ts:6; `STOCK_WEEKDAYS` dcaFormat.ts:17; `z.enum` dcaFormSchema.ts:49 | 4 |
| 사용자 상태 PENDING/ACTIVE/REJECTED | **없음** | `UserStatus` gen 파생 api-schema.ts:9; `USER_STATUS_LABEL` status.ts:7; `ADMIN_USER_STATUS_LABEL` :17; `USER_STATUS_TONE` :26; `USER_STATUS_COLOR_VAR` :32; 리터럴 분기 auth/callback/route.ts:100, PendingStatusWatcher.tsx:16, useAdminQueries.ts:181, admin/api/index.ts:29 | 9 |
| 사용자 역할 | **없음** | `UserRole` api-schema.ts:10; `USER_ROLE_LABEL` role.ts:3; 리터럴 분기 layout.tsx:35, ChangeRoleButton.tsx:34, AdminUsersTable.tsx:92 | 5 |
| 주문 skip 사유(비DCA) | `dcaSkipReasons`는 DCA만 | `SkipReason` gen 파생 api-schema.ts:34; `SKIP_REASON_LABELS` orderBannerCopy.ts:5 | 2 (메타 키 부재) |
| 가계부 수입/소비/저축 | `financeCategoryTypes` | `FlowType` budgetRoutes.ts:3; `FlowCategoryType` useFinanceFlowData.ts:21; `FLOW_TYPE_LABEL` budgetRoutes.ts:8; `SLUG_BY_TYPE` budgetRoutes.ts:5; FinanceHeader.tsx:36 | 5 |
| 가계부 그룹 역할 OWNER/MEMBER | 없음 | `GROUP_ROLE_LABEL` GroupMemberList.tsx:28 | 1 |
| 에러 코드 | gen `ErrorCode` 14값(api-types.ts:5266) | `ErrorCode` api-schema.ts:6 (gen 파생); `BROKER_ERROR_MESSAGE` brokerCredentials.ts:17 (4값만 문구 보유) | 2 |

요약: 코드값 집합 **19종**을 확인했다(위 표 행). 복제 선언 총합은 위 "선언 수" 열 기준 약 **110곳**(리터럴 분기 제외, 행별 근사치의 합). 메타(`/api/meta`)가 이미 라벨을 제공하는 집합은 주문 방향·유형·상태, 전략 타입·상태, 증권사, 시장, 자산군, DCA 5종, 사이클 시드, 가계부 카테고리 유형으로, 라벨 맵은 줄어들었지만 **타입 union·`z.enum`·옵션 배열·색 맵은 메타로 대체되지 않고 남았다**. 메타 키가 없는 집합(사용자 상태·역할, VR 정기입출금 모드, 요일, 비DCA skip 사유, 그룹 역할)은 UI가 라벨·색을 전부 들고 있다.

메타 대체 효과가 확인된 예: `orderBannerCopy.ts`·`dcaFormat.ts` 등 라벨은 `labelOf`로 전환됨(`docs/agents/strategy.md:14` "라벨(주기·지표·연산자·skip 사유·방향)은 메타 `labelOf`가 SSOT"). 반면 `api-schema.ts:57-58` 주석은 "meta.brokers[].market과 같은 값이다. Server Component … 에서도 판정해야 해서 정적 맵으로 둔다"고 중복을 인정한다.

---

## 5. normalizer·mapper 전수

### 5-1. 응답 정규화(API raw → 도메인 타입)

| 파일 | 함수 (줄) | 합계 |
|---|---|---|
| entities/strategy/api/index.ts | normalizeVrSummary 22, normalizeDcaCondition 9, isDcaWeekday 3, normalizeDcaSizing 4, normalizeDcaRule 21, normalizeDca 9, normalizeDcaExecution 18, normalizeStrategy 22, normalizePlacedOrder 7 | 115 |
| entities/order/api/index.ts | normalizeLedgerCheck 10, normalizeAccountCashCheck 5, normalizeAccountHoldingsCheck 5, normalizePreview 39 | 59 |
| entities/trade/api/index.ts | normalizePortfolio 31 | 31 |
| shared/model/placed-order.ts | normalizePlacedOrderBase 12 | 12 |
| 소계(이름이 normalize*인 함수 + isDcaWeekday) | **16개 함수** | **217줄** |
| shared/lib/normalize.ts + utils.ts `toNum` | optStr·optNum·optDec 각 3 + 파일 헤더, toNum 4 | 15+4 = 19 |
| API 함수 안의 인라인 변환 | listDcaExecutions 10, getStrategySeedPreview 23, executeStrategy 11, listStrategyOrders 19, getCryptoPortfolio 13, getCryptoPrices 5, getPrices 5, getAccountLedgerTotals 8 (함수 전체 줄) | 94 |
| Raw 타입 선언 | CryptoPortfolioRaw (trade/api:77-90), AccountLedgerTotalsRaw (account/api:50-55), MultiPriceResponseRaw (:36-38) | 약 22 |
| 합계 | | **약 352줄 / 파일 6개**(strategy·order·trade·account api, placed-order, normalize.ts·utils.ts) |

- 정규화가 있는 API 호출은 17/116 = 15%(strategy 11, order 2, trade 2, account 2). 나머지 68개 non-void 호출은 변환 없이 수기 타입을 신뢰한다(finance 33개·admin 13개·stats 8개 등 정규화 0).
- 분류(이 16개 + 별칭): 이름 변경 **0건**, 필드 추가·삭제 없는 `String()/Number()/toNum()/Boolean()` 강제 변환 + null→undefined 처리가 **14개 함수 214줄 = 98.6%**. 형태가 바뀌는 것은 `isDcaWeekday`(실제 검증 3줄)뿐.
- 인라인 변환 중 형태 변환: `getPrices`·`getCryptoPrices`(배열→Record), `getCryptoPortfolio`(deprecated 별칭 3개 폴백=이름 변경), `executeStrategy`(`id==='null'` 제거), `listStrategyOrders`(`ticker` 제거).
- `docs/agents` 에서 zod를 응답 검증에 쓰지 않는다고 명시: shared.md:70 "zod 대체 아님". 따라서 `String(x) as DcaIndicator` 같은 **단언은 런타임 검증이 아니다**(normalizeDcaCondition :35-36 등 enum 단언 9곳을 `as Dca*`로 확인).

### 5-2. 폼 ↔ 요청 변환(mapper)

| 함수 | 위치 | 줄 | 하는 일 |
|---|---|---|---|
| buildStrategyPayload | features/strategy/create-strategy/model/buildStrategyPayload.ts:27 | 62 | 폼→요청, 조건부 생략·runtime 기본값 치환·3개 이름 변경 |
| buildDcaPayload.ts 4함수 | features/strategy/create-strategy/model/buildDcaPayload.ts:5-52 | 42 | 폼→요청(sizing 복원 등) |
| toReconfigureVrRequest | features/strategy/reconfigure-vr/ReconfigureVrForm.tsx:40 | 21 | 15필드 `?? undefined` |
| buildAssetPayload / buildCategoryPayload | assetFormHelpers.ts:106, categoryFormHelpers.ts:16 | 14+17 | 복사+조건부 생략 |
| buildStrategyFormDefaults 외 3함수 | strategyFormHelpers.ts:18-57,104-107 | 41 | 응답→폼 초기값 |
| ruleToFormValue·buildDcaRuleDefaults·buildDcaFormDefaults | dcaFormSchema.ts:145-187 | 41 | 요청→폼 |
| initialFormValues | assetFormHelpers.ts:51 | 11 | 응답→폼 |
| 합계 | 약 11개 | **약 250줄** | 이 중 단순 복사·null 처리(`?? undefined`/`?? null`)가 지배적인 것은 toReconfigureVrRequest, buildAssetPayload, buildCategoryPayload, buildStrategyFormDefaults/buildVrDefaults (약 100줄), 나머지는 폼 구조가 요청과 달라서(sizing 펼침, dayOfMonth 문자열화) 생기는 실제 변환 |

### 5-3. 총량

- 응답 정규화+헬퍼+Raw: 약 352줄, 폼↔요청 mapper: 약 250줄 → **변환 코드 합계 약 600줄**(비테스트 41,369줄의 약 1.5%). 이 600줄에 대응하는 테스트: `entities/strategy/api/index.test.ts` 294줄, `entities/order/api/index.test.ts` 277줄, `entities/trade/api/index.test.ts` 180줄 등(3개 합 751줄, 같은 입출력을 검증).
- 정규화 함수 자체가 "필드 목록을 한 번 더 열거"하는 구조라 DTO 필드 추가 시 types.ts·normalizer·(폼이면) zod·buildPayload 4곳을 수정해야 한다. 이를 점검하는 용도로 `.claude/skills/dto-sync-check/SKILL.md`("entities 타입·normalizer 동기화 여부 점검")가 따로 존재한다 — 수작업 동기화를 전제한다는 증거.
- 단순 복사·이름 변경만 하는 비중: 응답 정규화 217줄 중 214줄 = 98.6%(정확히 센 값). 폼↔요청 mapper(약 250줄)는 단순 복사·null 처리가 약 100줄, 나머지는 구조 변환이다. 변환 코드 전체 약 600줄 기준으로는 (214+100)/600 ≈ 52%.

---

## 6. 백엔드가 응답 형식을 바꾸면 사라질 UI 코드 후보

판정 기준: 서버가 값을 내려주거나(파생 필드·메타 키·타입 정확도) 서버 규칙과 "동일하다/동기화"라고 코드·서버 문서가 적은 것. kista-api 쪽은 `MetaBundle.java`(메타 키 목록)와 `docs/agents/modules/tradingcore/trading-formulas.md:57`을 읽기 전용으로 대조했다.

### 6-A. 서버가 타입을 정확히 내려주면 사라지는 것 (스펙 정확도)

| 코드 | 위치 | 줄 | 근거 |
|---|---|---|---|
| 응답 정규화 함수 16개 + 헬퍼 + 인라인 변환 + Raw 타입 | 5-1절 | 약 352 | gen은 number, 수기는 string/number 혼재. 서버 스펙이 실제 와이어(`number`/`string`)와 일치하고 필수 필드를 `required`로 표시하면 `fetchEither<GeneratedType>`로 대체 가능. 와이어가 문자열인지는 **서버를 안 띄워 확인 못 함**(주석만 근거) |
| 수기 재선언 74쌍 | 2절 표 | entities/*/model/types.ts 967줄 중 대부분(기준: 74쌍 필드 합 452개) | 99.3% 동일 |
| `Required<>`/`NullableFields` 보정 | entities/admin/model/types.ts:3-10 | 8 | 서버 `@Schema` nullable·required 표기 누락 보정(주석 명시) |
| `ExactUnion` enum 고정 + `OrderType` 수기 | api-schema.ts:22-36 | 15 | 서버가 enum을 스펙에서 걷어낸 데 대한 방어(주석 명시) |
| deprecated 별칭 폴백 | entities/trade/api/index.ts:77-113 (`krwCash`·`totalAssetKrw`·`evalAmountKrw`) | 약 10 | 서버가 deprecated 필드를 제거하면 삭제 |
| `withDefaultAmount` | entities/finance/api/index.ts:24-27 + 호출 262·274·316 | 4+3 | 주석 "서버가 실제로 누락시키진 않지만 방어적으로" |

### 6-B. 서버가 파생 필드를 내려주면 사라지는 것 (UI가 다시 계산)

| 코드 | 위치 | 줄 | 서버가 줄 수 있는 것 / 근거 |
|---|---|---|---|
| `nextVrRolloverDate` | entities/strategy/model/vr-rollover.ts:1-10 (사용 파일 3개) | 10 | VrSummary에 `nextRolloverDate`. 주석 "kista-api VrCycleRolloverService의 dueDate와 동일 규칙" |
| `RAMP_DEFAULTS_BY_MODE` + `computeVrDerived`의 `effective*` 5개 | entities/strategy/model/vrRamp.ts:33-43, features/.../vrDerived.ts:36-84 | 11+약 49 | 서버 기본값표(`VrRampInput.withDefaults()`). 서버 문서가 "kista-ui `RAMP_DEFAULTS_BY_MODE`와 동기화"를 명시(trading-formulas.md:57). 기본값 조회 엔드포인트 또는 서버 위임으로 제거 가능(사용 파일 5개) |
| 서버 VR 검증 선행 계산(`requiredWithdrawalAssets` 등) | vrDerived.ts:62-65, 주석 :47 "서버 validateVrCommand와 동일 원칙" | 약 10 | 서버 검증 응답(400 detail)에 위임 가능 |
| `isInvalidBootstrap`·`isInvalidScheduledStart` 등 서버 규칙 사전검증 | strategyFormGuards.ts:11-30 외 (파일 200줄) | 부분(측정 한계: 파일 전체 중 서버 규칙 사본인 구간은 11-40줄까지만 확인) | 주석 "서버 validateBootstrapPosition과 동일 규칙" |
| `isScheduledStart`·`scheduledStartBadgeLabel` | entities/strategy/model/scheduled-start.ts | 17 | `startDate > 오늘` 판정을 서버 `scheduled: boolean`으로 (사용 파일 5개) |
| `supportsCapitalAdjustment`·`canWithdrawCapital`·`floorToCents` | entities/strategy/model/capitalAdjustment.ts | 13 | 서버 `canInject`/`canWithdraw` 플래그로 대체 가능. `Strategy.ledgerDeposit`(types.ts:79)도 이 판정용으로만 내려옴(주석 "투자금 인출 한도의 상한") |
| `apiKeyExpiryState`·`API_KEY_EXPIRY_LABEL`·`EXPIRING_WINDOW_MS` | entities/account/model/apiKeyExpiry.ts | 26 | 주석 "api 만료 알림(D-30)과 같은 기준". 서버가 상태를 내려주면 제거(사용 파일 4개) |
| `computeOrderReadiness` + `OrderReadiness` | entities/order/model/order-readiness.ts | 64 | 서버가 이미 내려준 `ledgerCheck`·`accountCashCheck`·`accountHoldingsCheck`를 UI가 다시 해석해 "미접수/부족" 판정(사용 파일 4개). 서버 플래그로 이관 가능 |
| `earliestNextExecution`·`latestLastExecution` | entities/strategy/model/dcaFormat.ts:73-93 | 약 21 | 서버 `nextExecution`/`lastExecution` 집계 필드 |
| `brokerMarket`·`brokerCurrency`·`BROKER_MARKET`·`MARKET_CURRENCY`·`CURRENCY_SCALE`·`isKeyOnlyBroker`·`isCryptoMarket` | shared/lib/api-schema.ts:52-114 | 약 63 | 서버 `brokers[].market/currency/amountScale`와 중복(주석 :57 자인). 이유로 "Server Component에서도 판정"이 적혀 있다 — 서버에서도 `getMetaBundle`을 읽을 수 있는지는 확인 못 함 |
| `DEFAULT_STRATEGY_SUGGESTIONS` | entities/user/model/types.ts:16-17 | 2 | 주석 "kista-api UserSettings.DEFAULT_STRATEGY_SUGGESTIONS와 동일한 값"(서버 UserSettings.java:17 실측 일치) |
| `MAX_DCA_RULES`·`MAX_DCA_CONDITIONS` | features/strategy/create-strategy/model/dcaFormSchema.ts:9-10 | 2 | 주석 "kista-api 상한과 동일" |
| `STOCK_WEEKDAYS`·`WEEKDAY_LABEL` | dcaFormat.ts:6-17 | 12 | 요일 메타 키 부재 |
| `strategyTypeShort` | entities/strategy/model/badges.ts:21-25 | 5 | 전략 타입 메타에 `shortLabel` 추가 시 제거 |

### 6-C. 서버 enum·메타를 UI가 수기 복제한 것 (메타 키가 없어서)

| 코드 | 위치 | 줄 | 필요한 서버 변경 |
|---|---|---|---|
| 사용자 상태·역할 라벨 맵 | entities/user/model/status.ts(44), role.ts(6) | 50 | `MetaBundle`(MetaBundle.java:7-47)에 `userStatuses`·`userRoles` 키 없음. 톤·색 맵 12줄은 UI 고유라 남음, 라벨 두 벌은 의도적으로 다름(:13 "의도적으로 다름") |
| `SKIP_REASON_LABELS` | widgets/strategy-detail/orderBannerCopy.ts:5-12 | 8 | `dcaSkipReasons`는 DCA 전용, 일반 `skipReasons` 키 없음 |
| `VR_RECURRING_MODE_LABEL`·모드 union·옵션 | vrRamp.ts:1-9, recurringModeOptions.ts | 약 15 | 메타 키 부재 |
| 에러 코드→문구 맵 | entities/account/model/brokerCredentials.ts:16-22 (`BROKER_ERROR_MESSAGE`, 4값) + `brokerErrorMessage` :25-30, `BROKER_CREDENTIAL.invalidMessage` :8-14 | 7+6+7 | `ErrorCode` 14값 중 4값만 문구 보유. 서버 ProblemDetail의 `detail`을 이미 `apiMsg`가 폴백으로 쓴다 — 서버 detail 문구가 사용자용이면 맵 제거 가능. `invalidMessage`는 broker별 안내(어느 입력을 확인할지)라 UI 고유 가능성이 있음(확인 못 함) |
| `FlowType`·`FlowCategoryType`·`FLOW_TYPE_LABEL`·`SLUG_BY_TYPE` | budgetRoutes.ts:3-8, useFinanceFlowData.ts:21 | 약 8 | `financeCategoryTypes` 메타는 있으나 라벨 미사용 |
| `GROUP_ROLE_LABEL` | GroupMemberList.tsx:28 | 1 | 메타 키 부재 |

### 6-D. 서버 엔드포인트 추가가 전제인 것 (응답 형식 변경이 아님, 참고)

- 가계부 집계: `entities/finance/lib/aggregate.ts` 271줄 + `flowAggregate.ts` 296줄 + `bulkRegisterPreview.ts` 162줄 + `period.ts` 146줄 = 875줄이 클라이언트 집계. gen 경로에는 `/api/finance/*` CRUD만 있고(확인: `api-types.ts` paths의 finance 경로 28개 전부 CRUD·share·초대) 집계 엔드포인트는 없다. 서버가 집계 API를 추가해야만 제거 가능하므로 위 후보와 성격이 다르다.
- `aggregate.ts:3` "finance_categories 자산 L1은 고정 UUID 시스템 시드다(kista-api V13 시드값과 동일)" 및 `:48` "마감 스코프는 kista-api 가드와 동일하게" — 서버 값·규칙의 하드코딩 사본.

### 6-E. 후보 합계(중복 집계 없이 대표값)

- 6-A: 응답 정규화·Raw·방어 코드 약 352줄 + 수기 재선언(74쌍) + 보정 약 30줄
- 6-B: 파생·규칙 사본 약 250줄(vrRamp 11 + vrDerived 약 59 + guards 부분 + scheduled-start 17 + capitalAdjustment 13 + apiKeyExpiry 26 + order-readiness 64 + dcaFormat 집계 21 + api-schema 63 + 소상수 21)
- 6-C: 메타 키 추가 시 약 100줄 (user 50 + skipReason 8 + recurring 15 + error 20 + 기타 9)

(6-B·6-C는 줄 수가 겹치지 않도록 파일 단위로만 합산했고, 폼 검증 사본(`strategyFormGuards.ts`)은 측정이 부분적이라 포함 줄 수가 하한이다.)

---

## 7. 종합

| 지표 | 값 |
|---|---|
| 분석한 개념 | 9개(2-1 ~ 2-9) |
| 개념 1개당 평균 선언 횟수(생성 포함) | 계좌 12, 전략 22, DCA 26, 주문 23, 포트폴리오 20, 가계부 39, 사용자 3, 통계·백테스트 20, 메타·설정 약 27 → 합 192, **평균 약 21** |
| 같은 중 수기+폼+Raw+표시 선언만(생성 제외) | 7, 15, 14, 11, 9, 20, 1, 11, 15 → 합 103, **평균 약 11.4** |
| 생성 스키마 1개당 수기 복제 | 74쌍 / 74 대응 gen = 1:1, 여기에 폼·zod 복제가 추가(전략 7개 폼 형태, DCA 3개) |
| 필드 겹침(수기 vs 생성) | 99.3%(449/452), 완전 동일 66/74 = 89% |
| 필드 겹침(폼 vs 요청) | StrategyFormValues 71%(의미상 86%), ReconfigureVrFormValues 94%, dcaRuleSchema 90% |
| 변환 코드 총량 | 응답 정규화·헬퍼·Raw 약 352줄 + 폼↔요청 약 250줄 = **약 600줄**(대응 테스트 3개 파일 751줄 별도) |
| 단순 복사·이름 변경만 하는 비중 | 응답 정규화 217줄 중 214줄 = **98.6%**(이름 변경 0건) |
| 코드값 집합 복제 | 19집합, 복제 선언 약 110곳. 메타로 라벨은 상당 부분 대체됐으나 union·`z.enum`·옵션·색 맵은 남음 |
| 램프 필드 1개 변경 시 수정 위치 | 타입 수준 12곳(gen 3 + 수기 9), 참조 파일 11개 |
| 백엔드 응답 변경 시 제거 후보 | 6절 참고, 파일 기준 상위 항목 합 약 700줄 이상(중복 제외 보수적 추정) |

### 구조적 원인 상위 5개

1. **생성 타입이 "쓸 수 없는 모양"이라 수기 타입이 표준이 됐다.** 스키마 프로퍼티 832개 중 692개(83%)가 optional이고, 금액·가격이 `number`로 적히는데 UI는 일부를 `string`으로 다루며(2-4절 8개 필드), enum이 스펙에서 사라진 곳이 있다(`api-schema.ts:22-36`). 그 결과 런타임에서 `components['schemas']`를 직접 쓰는 파일은 4개뿐이고, 수기 74쌍이 생성 타입을 99.3% 필드 일치로 복제한다. 이 이유를 일반 정책으로 적은 문서는 없다(3절).
2. **"unknown → 수기 타입" 정규화가 DTO마다 필드 열거를 반복한다.** 정규화 함수 16개(217줄)의 98.6%가 이름 변경 없는 `String()/Number()/toNum()` 복사다. 서버가 숫자를 문자열(BigDecimal)로 내려보낸다는 주석(trade/api:12, strategy/api:10)이 유일한 근거이며, 와이어 형태는 확인하지 못했다. 여기에 zod를 응답 검증에 쓰지 않는다는 원칙(shared.md:70)이 겹쳐 `String(x) as DcaIndicator` 같은 무검증 단언이 남는다.
3. **같은 필드 집합이 요청 타입·폼 스키마·폼 상태·백테스트 파라미터로 층층이 재선언된다.** VR 램프 8필드는 타입 수준 12곳에 있고, 폼 값과 요청 사이에 null↔undefined·이름 변경(avgPrice→initialAvgPrice)·구조 펼침(sizing)을 위한 mapper 약 250줄이 따로 있다. 폼 필드가 `number | null | undefined` 3상태라 `?? undefined`가 15번 반복된다(`ReconfigureVrForm.tsx:40-60`).
4. **서버 enum·규칙의 UI 사본을 서버와 "동일하다/동기화"라는 주석으로만 묶고 있다.** `RAMP_DEFAULTS_BY_MODE`(서버 문서가 동기화 명시), `nextVrRolloverDate`, `MAX_DCA_*`, `DEFAULT_STRATEGY_SUGGESTIONS`(서버 값 실측 일치), `apiKeyExpiry` D-30, `BROKER_MARKET`. 값 집합은 `/api/meta`로 라벨 대체가 진행됐지만 메타에 없는 집합(사용자 상태·역할, VR 모드, 요일, skip 사유)과 타입 union·`z.enum`·옵션 배열은 UI가 따로 갖고 있다(19집합, 약 110곳).
5. **서버가 이미 준 점검 결과·상태를 UI가 다시 파생한다.** `computeOrderReadiness`(64줄), `supportsCapitalAdjustment`/`canWithdrawCapital`, `isScheduledStart`, `earliestNextExecution`, `computeVrDerived`. 서버의 파생 필드·플래그가 없어서 UI가 판정 로직을 소유하고, 서버 규칙이 바뀌면 사본이 드리프트한다(`dto-sync-check` 스킬이 이를 수작업으로 점검).

### 측정하지 못한 것 / 한계

- 서버를 실행하지 않아 실제 JSON 와이어(숫자가 문자열로 오는지, optional 필드가 항상 채워지는지)는 확인하지 못했다. 정규화 필요성은 주석에만 근거한다.
- 겹침%는 최상위 프로퍼티명 대조다. 중첩 객체(예: `PortfolioSummary.positions[]`)의 필드와 타입 일치 여부(`string` vs `number`)는 2-4절의 7+1개 외에는 전수 비교하지 않았다.
- `entities/*/model/types.ts` 이외의 수기 선언(widgets·features 내부 타입)은 Props 241개를 제외하고 50개만 확인했으며, 이 중 entity 타입과 겹치는 13개를 2절에 일부 반영했다. 테스트 픽스처(`__fixtures__`, `*.test.ts`)에 있는 타입 복제는 세지 않았다.
- 6-B의 `strategyFormGuards.ts`는 서버 규칙 사본인 구간(:11-40)만 확인했고 파일 전체(200줄)의 사본 비율은 측정하지 않았다.
- 선언 횟수는 "필드 집합을 별도 선언한 interface/type/zod object"로 정의한 근사치다(Props·인자 묶음 제외). 개념 경계를 어떻게 자르느냐에 따라 ±몇 개 달라진다.
- kista-api는 `MetaBundle.java`·`UserSettings.java`·trading-formulas 문서만 읽었고 DTO 전수 대조는 하지 않았다. gen 스키마(openapi.json)를 서버 DTO의 대리로 썼다.
