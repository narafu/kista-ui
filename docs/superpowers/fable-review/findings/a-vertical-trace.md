# A. 화면 수직 추적: 화면 하나를 그리는 데 드는 파일·줄과 간접층 비중

읽기 전용 측정. 빌드·테스트·dev 서버는 실행하지 않았다.

## 0. 측정 방법과 한계

- 도달 파일: 각 `page.tsx`(+ 같은 디렉토리 `loading.tsx`, 가계부는 `layout.tsx`)에서 정적 import(`import`/`export ... from`/`import()`)를 따라 도달하는 프로젝트 내부 파일. node 스크립트로 계산했다(스크립트는 scratchpad, 저장소 미수정). tsconfig alias(`@app`·`@widgets`·`@features`·`@entities`·`@shared`·`@/lib`·`@/components`)와 상대경로를 해석한다. 줄 수는 `wc -l`과 같은 규칙이며 일부를 `wc -l`로 교차 확인했다.
- barrel 처리: 순수 re-export index는 import한 이름만 따라간다(precise). 이름을 무시하고 폐포를 잡으면(naive) 화면당 평균 약 36% 더 많은 파일이 잡힌다(6화면 naive 114/175/144/137/132/69 vs precise 82/100/120/105/112/49, api-types.ts 포함). 아래 표는 precise 기준이다.
- 파일 단위 도달이다. 도달한 파일 안에서 화면이 실제로 쓰지 않는 export(예: 가계부 화면에 딸려오는 관리자 카테고리 CRUD)는 걸러내지 못했다. 1문장 api/hook 함수 수는 도달한 api·hooks 파일 전체 함수 기준이라 화면이 안 쓰는 함수가 섞여 있다. 상한에 가깝다.
- 제외: 생성 파일 `shared/lib/api-types.ts`(9,564줄, 6화면 전부 도달)는 줄 수 합계에서 뺐다. 공통 셸(`app/layout.tsx` + `app/(main)/layout.tsx` 도달분 63파일/약 3,100줄: app 3/725, widgets 11/451, entities 27/1,098, shared 15/616, features 2/38, 프리미티브 5/171)도 6화면 공통이라 뺐다. `@modal` 인터셉트 라우트(11개, 146줄)는 화면에 넣지 않았다.
- 공용 프리미티브 = `components/ui/*` + `shared/ui/*` + `lib/utils.ts`. `shared/ui`에는 `EquityLineChart`·`RouteModal` 같은 합성 컴포넌트도 있으나 지침대로 함께 묶었다.
- Route Handler(`app/api/**`)는 import로 도달하지 않으므로 entities api 함수의 URL prefix로 매핑했다. 화면이 실제로 부르는 prefix만 센다(가계부 화면은 `admin` 제외). 6개 화면 공통 인프라인 `createProxyRoute.ts` 67줄 + `routeHelpers.ts` 53줄, 인증 라우트 `auth/refresh` 33줄 + `auth/logout` 35줄은 화면 합계에서 뺐다.
- 전용/공유: 다른 비-modal `page.tsx` 약 45개 중 하나도 도달하지 않는 파일을 전용으로 센다. 형제 라우트(edit·inject-capital 등)가 같은 기능을 쓰는 화면은 전용 비율이 낮게 나온다. 가계부 layout은 형제 탭이 공유하지만 진입점이 달라 전용으로 잡혔다.
- 테스트: "형제" = 도달 소스 파일과 같은 디렉토리의 `<이름>.test.ts(x)`. "슬라이스 전체"는 도달 슬라이스 디렉토리의 모든 테스트(상한)다.
- 단순 전달층 정의. A(엄격) = 순수 re-export barrel + 5~13줄 프록시 Route Handler + 아래에 명시한 래퍼 컴포넌트/hook + 본문이 `return use(Query|Mutation)(...)` 한 문장인 hook + 본문이 `return fetchEither|clientFetch|apiFetch(...)` 한 문장인 api 함수(변환·normalize 없음). B(보조) = `queryOptions.ts`·`queryKeys.ts`(인자를 `queryFn`/키로 넘기는 팩토리)와 지연 로딩·셸 래퍼. A는 "없어도 로직이 안 바뀌는 층", B는 "구조상 필요하지만 인자를 넘기는 층"이다. 래퍼 컴포넌트 판정은 사람이 읽고 분류했다.

## 화면별 추적

### 1. 대시보드 /dashboard

진입점: `app/(main)/dashboard/page.tsx`, `app/(main)/dashboard/loading.tsx`

| 계층 | 파일 | 줄 | 전용 파일(줄) | 단순 re-export index(파일/줄) |
|---|---:|---:|---:|---:|
| app | 2 | 59 | 2 (59) | 0/0 |
| widgets | 24 | 1969 | 22 (1921) | 4/4 |
| features | 4 | 75 | 1 (32) | 2/4 |
| entities | 20 | 656 | 1 (67) | 3/41 |
| shared | 17 | 729 | 2 (55) | 1/3 |
| 공용 프리미티브(components/ui + shared/ui + lib/utils) | 14 | 502 | - | 1/1 |
| app/api Route Handler (이 화면 호출분, import 비도달) | 4 | 25 | - | - |
| **합계(생성 파일 api-types.ts 9564줄 제외)** | **85** | **4015** | 전용 28/67파일, 2134/3488줄 (PRIM 제외) | 11/53 |

- 테스트: 도달 파일의 형제 `*.test.*` 32개 / 2820줄 (소스 대비 70%). 같은 슬라이스 전체 테스트 33개 / 3042줄(상한).
- barrel 폐포(naive, `export *`·이름 무시) 기준 도달 파일 114개 vs 이름 해석(precise) 82개 — 둘 다 api-types.ts 1개 포함.
- Route Handler: `app/api/accounts` 6줄, `app/api/market` 6줄, `app/api/crypto-market-indicators` 7줄, `app/api/daily-trades` 6줄
- 단순 전달층 A(엄격): 17파일/169줄 = barrel 11/53 + Route Handler 4/25 + 래퍼 컴포넌트·hook 2파일/55줄 + 1문장 hook 함수 1개/3줄 + 1문장 fetch api 함수 11개/33줄 → 소스 대비 4.2%
- 인자 전달형 B(보조): queryOptions 2파일/50줄 + queryKeys 3파일/36줄 + 래퍼/셸 1파일/36줄 = 122줄 → 3.0%
- A+B 7.2%

#### 데이터 흐름: 주간 달력의 월별 휴장일 (비로그인 포함, 서버/클라이언트 2경로)

| # | 단계 | file:line | 변형? |
|---|---|---|---|
| 1 | 서버 프리페치 | `app/(main)/dashboard/page.tsx:28` createQueryClient, `:32` prefetchQuery(monthlyHolidaysQueryOptions) | 전달 (createQueryClient는 기본 옵션 주입 `shared/lib/query/createQueryClient.ts:6-17`) |
| 2 | HydrationBoundary | `page.tsx:40` dehydrate(queryClient) | 전달 (라이브러리) |
| 3 | query hook | `entities/market/hooks/useMarketQueries.ts:13-16` useMonthlyHolidaysQuery | 약한 변형: `data`를 `{holidays=[], loading, isError}`로 재포장 |
| 3b | 소비 위젯 | `widgets/market-holiday-calendar/WeeklyMarketCalendar.tsx:203-222` 4회 호출 후 `new Set(flatMap)` | 변형: 4개 달을 Set으로 합침 (표시 타입 `Set<string>`) |
| 4 | queryOptions | `entities/market/model/queryOptions.ts:13-22` | 전달 + 분기: `typeof window`로 서버/브라우저 api 함수 선택(:17-18) |
| 5a | api (서버) | `entities/market/api/index.ts:8-16` getMonthlyHolidaysPublic | 전달. Route Handler를 거치지 않고 kista-api 직결. 에러 처리 `:10-14`가 `shared/lib/api-client/index.ts:82-86` parseApiResponse와 중복 |
| 5b | api (브라우저) | `entities/market/api/index.ts:18-20` → `shared/lib/api-client/index.ts:93-106` clientFetch | 전달 (clientFetch는 401 갱신 로직 보유, 공개 엔드포인트에는 무용) |
| 6 | Route Handler | `app/api/market/[[...path]]/route.ts:1-6` (requireAuth:false) → `shared/lib/proxy/createProxyRoute.ts:19-67` | 파일 6줄은 순수 전달, 엔진(URL 조립 `:28-45`, 에러 relay `:55`)은 실제 로직 |
| 7 | kista-api 호출 | `createProxyRoute.ts:47` fetch(`/api/market/holidays`) | 전달 |
| 8 | 응답 타입 | `string[]` 캐스트 (`api/index.ts:15`, `:19`) | 정규화·zod 없음 |
| 9 | 표시 타입 | `WeeklyMarketCalendar.tsx:222` holidaySet | 위 3b |

값이 실제로 변하는 곳은 3, 3b 두 곳(재포장·Set 합침)뿐이고 나머지 7단계는 전달이다. 같은 데이터를 서버 직결·브라우저 프록시 두 갈래로 가져오는 비용이 5a/5b에 보인다.
부가 흐름(계좌 목록): `page.tsx:34` → `entities/account/model/queryOptions.ts:8-13` → `api/index.ts:16-18` listAccounts → `fetchEither`(`api-client:117-119`) → `DashboardContent.tsx:16` useAccountsQuery(`hooks/useAccountQueries.ts:8-16`, select로 모의계좌 후미 정렬). 계좌 데이터는 `accounts.length === 0` 판정(`DashboardContent.tsx:39`)에만 쓰인다.

#### 단순 전달층 상세
- barrel 11파일/53줄 (widgets 4, features 2, entities 3, shared 1, lib/utils 1).
- 래퍼 컴포넌트: `widgets/dashboard/MarketChartCard.tsx` 26줄(dynamic 로더 + Surface로 `MarketChartCardInner` 렌더, props 1개 전달), `widgets/dashboard/DashboardOverview.tsx` 29줄(`marketPanels`·`bottomPanels` 슬롯을 `DashboardMarkets`로 그대로 전달; `page.tsx:41-52` → `DashboardContent.tsx:15` → `DashboardOverview.tsx:11` → `DashboardMarkets.tsx:13` 3단 슬롯 전달).
- 보조(B): `widgets/fear-greed-card/FearGreedCard.tsx` 36줄(에러 분기 + `FearGreedCardInner` 지연 로딩), queryOptions 2/50줄, queryKeys 3/36줄.
- 1문장 fetch api 함수 11개/33줄 (대부분 `market`·`trade` api), 1문장 hook 1개/3줄.

### 2. 계좌 상세 /accounts/[id]

진입점: `app/(main)/accounts/[id]/page.tsx`, `app/(main)/accounts/[id]/loading.tsx`

| 계층 | 파일 | 줄 | 전용 파일(줄) | 단순 re-export index(파일/줄) |
|---|---:|---:|---:|---:|
| app | 2 | 75 | 2 (75) | 0/0 |
| widgets | 19 | 1083 | 8 (442) | 7/8 |
| features | 2 | 42 | 0 (0) | 1/4 |
| entities | 33 | 1877 | 0 (0) | 5/107 |
| shared | 18 | 793 | 0 (0) | 1/3 |
| 공용 프리미티브(components/ui + shared/ui + lib/utils) | 25 | 916 | - | 1/1 |
| app/api Route Handler (이 화면 호출분, import 비도달) | 3 | 18 | - | - |
| **합계(생성 파일 api-types.ts 9564줄 제외)** | **102** | **4804** | 전용 10/74파일, 517/3870줄 (PRIM 제외) | 15/123 |

- 테스트: 도달 파일의 형제 `*.test.*` 43개 / 4421줄 (소스 대비 92%). 같은 슬라이스 전체 테스트 63개 / 8358줄(상한).
- barrel 폐포(naive, `export *`·이름 무시) 기준 도달 파일 175개 vs 이름 해석(precise) 100개 — 둘 다 api-types.ts 1개 포함.
- Route Handler: `app/api/accounts` 6줄, `app/api/trading-cycles` 6줄, `app/api/orders` 6줄
- 단순 전달층 A(엄격): 19파일/213줄 = barrel 15/123 + Route Handler 3/18 + 래퍼 컴포넌트·hook 1파일/28줄 + 1문장 hook 함수 4개/12줄 + 1문장 fetch api 함수 10개/32줄 → 소스 대비 4.4%
- 인자 전달형 B(보조): queryOptions 4파일/116줄 + queryKeys 4파일/49줄 + 래퍼/셸 0파일/0줄 = 165줄 → 3.4%
- A+B 7.9%

#### 데이터 흐름: 포트폴리오 (서버 프리페치 + 클라이언트 구독)

| # | 단계 | file:line | 변형? |
|---|---|---|---|
| 1 | 서버 프리페치 | `app/(main)/accounts/[id]/page.tsx:38-42` (broker별 분기: MOCK 생략 / 코인 / 주식) | 전달 + 분기 |
| 2 | HydrationBoundary | `page.tsx:49` | 전달 |
| 3 | 소비 | `widgets/account-detail/AccountDetailContent.tsx:28-31` `useQuery({...accountPortfolioQueryOptions(accountId), enabled})` | 전달. entities hook을 거치지 않고 위젯이 queryOptions를 직접 사용 |
| 4 | queryOptions | `entities/trade/model/queryOptions.ts:8-13` | 전달 |
| 5 | api 함수 | `entities/trade/api/index.ts:63-66` getAccountPortfolio → `fetchEither` (`api-client:117-119`) | 전달 후 정규화 호출 |
| 6a | 서버 경로 | `apiFetch` (`api-client:121-140`), `resolveApiBaseUrl`(`:8-13`)로 kista-trading 직결 | 전달 |
| 6b | 브라우저 경로 | `clientFetch` (`api-client:93-106`) → `app/api/accounts/[[...path]]/route.ts:1-6` → `createProxyRoute.ts:19-67` | 파일은 전달, 엔진은 로직 |
| 7 | kista-trading 호출 | `GET /api/accounts/{id}/portfolio` | - |
| 8 | normalizer | `entities/trade/api/index.ts:13-43` normalizePortfolio | 변형: BigDecimal 문자열 → number, null 정규화 |
| 9 | 응답/표시 타입 | `entities/trade/model/types.ts` PortfolioSummary → `AccountDetailContent.tsx:58-59` `portfolio?.summary?.deposit ?? 0` → `AccountDetailTabs.tsx:23` → `AccountSummaryCard` | props 3단 전달 |

변형 지점은 8(정규화) 1곳. 계좌 자체(`useAccountDetailQuery`)는 `detailFromListQueryOptions`(`shared/lib/query/detailFromList.ts`, 16줄)로 목록 캐시에서 찾는다. `AccountDetailContent.tsx:24-25`의 `data === undefined ? initialAccount : data`는 하이드레이션 캐시와 `initialAccount` props가 이중으로 같은 값을 들고 있는 구조다.

#### 단순 전달층 상세
- barrel 15파일/123줄 (entities 5개 107줄 포함: account·order·strategy·trade·meta 등 index).
- 래퍼: `widgets/account-detail/TradesTab.tsx` 28줄 — `useAccountCycleHistoryQuery(id!, params)` 어댑터 + `CycleHistoryTable` 렌더만 수행.
- Route Handler 3개(accounts/trading-cycles/orders) 18줄, 1문장 hook 4개/12줄, 1문장 fetch api 함수 10개/32줄.
- 보조(B): queryOptions 4파일/116줄, queryKeys 4파일/49줄.

### 3. 전략 상세 /accounts/[id]/strategies/[sid]

진입점: `app/(main)/accounts/[id]/strategies/[sid]/page.tsx`, `app/(main)/accounts/[id]/strategies/[sid]/loading.tsx`

| 계층 | 파일 | 줄 | 전용 파일(줄) | 단순 re-export index(파일/줄) |
|---|---:|---:|---:|---:|
| app | 2 | 73 | 2 (73) | 0/0 |
| widgets | 22 | 2053 | 16 (1780) | 4/5 |
| features | 2 | 90 | 0 (0) | 1/2 |
| entities | 48 | 2378 | 1 (10) | 7/157 |
| shared | 20 | 844 | 1 (33) | 1/3 |
| 공용 프리미티브(components/ui + shared/ui + lib/utils) | 25 | 1256 | - | 1/1 |
| app/api Route Handler (이 화면 호출분, import 비도달) | 4 | 24 | - | - |
| **합계(생성 파일 api-types.ts 9564줄 제외)** | **123** | **6718** | 전용 20/94파일, 1896/5438줄 (PRIM 제외) | 14/168 |

- 테스트: 도달 파일의 형제 `*.test.*` 51개 / 5809줄 (소스 대비 86%). 같은 슬라이스 전체 테스트 51개 / 5797줄(상한).
- barrel 폐포(naive, `export *`·이름 무시) 기준 도달 파일 144개 vs 이름 해석(precise) 120개 — 둘 다 api-types.ts 1개 포함.
- Route Handler: `app/api/accounts` 6줄, `app/api/trading-cycles` 6줄, `app/api/orders` 6줄, `app/api/market` 6줄
- 단순 전달층 A(엄격): 19파일/273줄 = barrel 14/168 + Route Handler 4/24 + 래퍼 컴포넌트·hook 1파일/19줄 + 1문장 hook 함수 4개/12줄 + 1문장 fetch api 함수 16개/50줄 → 소스 대비 4.1%
- 인자 전달형 B(보조): queryOptions 5파일/138줄 + queryKeys 6파일/93줄 + 래퍼/셸 0파일/0줄 = 231줄 → 3.4%
- A+B 7.5%

#### 데이터 흐름: 전략 상세 (서버 fetchQuery + 클라이언트 구독)

| # | 단계 | file:line | 변형? |
|---|---|---|---|
| 1 | 서버 프리페치 | `app/(main)/accounts/[id]/strategies/[sid]/page.tsx:24-27` `Promise.allSettled([fetchQuery(account), fetchQuery(strategyDetail)])`, 실패 시 throw(`:28-29`) | 전달 |
| 2 | queryOptions | `entities/strategy/model/queryOptions.ts:31-39` | 변형: 목록 캐시를 `client.fetchQuery`(`:35`)로 얻어 `find`(`:36`) — 전용 상세 API가 없음 |
| 3 | 목록 queryOptions | `queryOptions.ts:22-27` | 전달 |
| 4 | api 함수 | `entities/strategy/api/index.ts:133-136` listStrategies → `fetchEither('/api/accounts/{id}/trading-cycles')` | 전달 |
| 5 | 서버 경로 | `api-client:121-140` apiFetch → kista-trading 직결 (Route Handler 미경유) | 전달 |
| 6 | normalizer | `api/index.ts:104-125` normalizeStrategy (+ 하위 `:11-102` VR/DCA 정규화) | 변형: `unknown` → `Strategy`. 대부분 `String()`/`optNum`/`optDec` 형 강제 |
| 7 | 타입 | `entities/strategy/model/types.ts` (148줄, 수기 작성) | - |
| 8 | HydrationBoundary + props | `page.tsx:44`, `:45-50` (`initialAccount`·`initialStrategy` props 병행) | 같은 값을 캐시와 props로 이중 전달 |
| 9 | query hook | `entities/strategy/hooks/useStrategyQueries.ts:106-108` useStrategyDetailQuery | 전달 (1문장) |
| 10 | 소비 | `widgets/strategy-detail/StrategyDetailContent.tsx:28-31` `data === undefined ? initialStrategy : data` | 폴백 합성 |
| 11 | 브라우저 재조회 | `clientFetch` → `app/api/accounts/[[...path]]/route.ts:1-6` → `createProxyRoute.ts:19-67` → kista-trading | 파일 전달 |
| 12 | 표시 | `StrategyDetailContent.tsx:79-81` → `StrategyDetail.tsx:24` / `DcaStrategyDetail` (props `strategy`) | 분기 후 전달 |

변형은 2(find), 6(normalize), 10(폴백 합성)의 3곳. 나머지는 전달이다.

#### 단순 전달층 상세
- barrel 14파일/168줄 (entities 7개 157줄 포함).
- 래퍼: `widgets/cycle-history/StrategyTradesTab.tsx` 19줄 — `CycleHistoryTable`에 hook 하나와 title만 넘김.
- Route Handler 4개(accounts/trading-cycles/orders/market) 24줄, 1문장 hook 4개/12줄, 1문장 fetch api 함수 16개/50줄.
- 보조(B): queryOptions 5파일/138줄, queryKeys 6파일/93줄.

### 4. 전략 등록 폼 /accounts/[id]/strategies/new

진입점: `app/(main)/accounts/[id]/strategies/new/page.tsx`

| 계층 | 파일 | 줄 | 전용 파일(줄) | 단순 re-export index(파일/줄) |
|---|---:|---:|---:|---:|
| app | 2 | 46 | 2 (46) | 0/0 |
| widgets | 2 | 48 | 0 (0) | 1/1 |
| features | 33 | 3094 | 0 (0) | 1/4 |
| entities | 35 | 2006 | 0 (0) | 7/162 |
| shared | 17 | 750 | 0 (0) | 1/3 |
| 공용 프리미티브(components/ui + shared/ui + lib/utils) | 15 | 606 | - | 2/2 |
| app/api Route Handler (이 화면 호출분, import 비도달) | 3 | 25 | - | - |
| **합계(생성 파일 api-types.ts 9564줄 제외)** | **107** | **6575** | 전용 2/89파일, 46/5944줄 (PRIM 제외) | 12/172 |

- 테스트: 도달 파일의 형제 `*.test.*` 50개 / 6663줄 (소스 대비 101%). 같은 슬라이스 전체 테스트 62개 / 7493줄(상한).
- barrel 폐포(naive, `export *`·이름 무시) 기준 도달 파일 137개 vs 이름 해석(precise) 105개 — 둘 다 api-types.ts 1개 포함.
- Route Handler: `app/api/accounts` 6줄, `app/api/trading-cycles` 6줄, `app/api/runtime-config` 13줄
- 단순 전달층 A(엄격): 16파일/255줄 = barrel 12/172 + Route Handler 3/25 + 래퍼 컴포넌트·hook 1파일/19줄 + 1문장 hook 함수 3개/9줄 + 1문장 fetch api 함수 10개/30줄 → 소스 대비 3.9%
- 인자 전달형 B(보조): queryOptions 2파일/67줄 + queryKeys 5파일/84줄 + 래퍼/셸 3파일/91줄 = 242줄 → 3.7%
- A+B 7.6%

#### 데이터 흐름: 전략 등록 제출 (뮤테이션, 서버 프리페치/하이드레이션 없음)

| # | 단계 | file:line | 변형? |
|---|---|---|---|
| 1 | 서버 컴포넌트 | `app/(main)/accounts/[id]/strategies/new/page.tsx:13-19` → `NewStrategyFormBody.tsx:13-27` (`requirePageToken`, `loadAccountForNewStrategy`) | 전달. 계좌 목록을 받아 `find`(`features/strategy/create-strategy/model/loadStrategyFormContext.ts:7-10`)로 broker만 추출 |
| 2 | 폼 래퍼 | `features/strategy/create-strategy/StrategyFormPage.tsx:19-41` | 전달 (등록 모드에서는 `StrategyForm`에 props 그대로) |
| 3 | 폼 검증 | `model/useStrategyForm.ts:136` zodResolver + `model/strategyFormSchema.ts:6-45` | 검증 (zod) |
| 4 | payload 조립 | `useStrategyForm.ts:236-247` handleSubmit → `model/buildStrategyPayload.ts:27-88` | 변형: 폼 값 → `StrategyRequest` (램프 기본값 채움) |
| 5 | create/update 분기 | `model/useStrategyFormEffects.ts:40-52` | 분기 후 전달 |
| 6 | mutation hook | `entities/strategy/hooks/useStrategyQueries.ts:110-121` | `mutationFn` 전달(`:113`), 성공 시 캐시 upsert(`:115-116`, 변형), 실패 toast(`:119`) |
| 7 | api 함수 | `entities/strategy/api/index.ts:143-146` createStrategy → `fetchEither(POST)` → `clientFetch` | 전달 |
| 8 | Route Handler | `app/api/accounts/[[...path]]/route.ts:1-6` → `createProxyRoute.ts:19-67` (본문 텍스트 그대로 전달 `:34-45`) | 파일 전달 |
| 9 | kista-trading 호출 | `POST /api/accounts/{id}/trading-cycles` | - |
| 10 | normalizer | `api/index.ts:104-125` normalizeStrategy | 변형: 형 강제 |
| 11 | 표시/후속 | `StrategyFormPage.tsx:30` `router.push(backHref)` + 캐시 갱신 | - |

같은 폼이 `@modal` 인터셉트 라우트(`app/(main)/@modal/(.)accounts/[id]/strategies/new/page.tsx:9-17`, 14줄)에서 `NewStrategyFormBody dismiss="back"`으로 한 번 더 마운트된다. DCA 전략은 별도 폼(`DcaStrategyForm.tsx:49` `zodResolver(dcaFormSchema)`)을 쓰므로 폼 시스템이 2벌이다(`useStrategyForm.ts:136`의 `strategyFormSchema`와 병행).

#### 단순 전달층 상세
- barrel 12파일/172줄 (entities 7개 162줄 포함).
- 래퍼: `app/.../strategies/new/page.tsx` 19줄(래핑 div + `NewStrategyFormBody`).
- Route Handler 3개(accounts/trading-cycles/runtime-config) 25줄, 1문장 hook 3개/9줄, 1문장 fetch api 함수 10개/30줄.
- 보조(B): `NewStrategyFormBody.tsx` 27줄, `StrategyFormPage.tsx` 41줄, `loadStrategyFormContext.ts` 23줄, queryOptions 2/67줄, queryKeys 5/84줄.
- 참고: 이 화면은 features 33파일/3,094줄이 본체다(`useStrategyForm.ts` 278, `DcaStrategyForm.tsx` 215, `StrategyForm.tsx` 200, `strategyFormGuards.ts` 200, `dcaFormSchema.ts` 187 등). 전달층이 아니라 폼 자체의 부피다.

### 5. 가계부 투자(자산) /finance

진입점: `app/(main)/finance/(dashboard)/page.tsx`, `app/(main)/finance/(dashboard)/layout.tsx`

| 계층 | 파일 | 줄 | 전용 파일(줄) | 단순 re-export index(파일/줄) |
|---|---:|---:|---:|---:|
| app | 4 | 247 | 3 (188) | 0/0 |
| widgets | 21 | 1553 | 15 (1428) | 8/8 |
| features | 8 | 355 | 4 (127) | 3/6 |
| entities | 18 | 2098 | 0 (0) | 2/132 |
| shared | 20 | 806 | 1 (4) | 1/3 |
| 공용 프리미티브(components/ui + shared/ui + lib/utils) | 40 | 1985 | - | 1/1 |
| app/api Route Handler (이 화면 호출분, import 비도달) | 1 | 5 | - | - |
| **합계(생성 파일 api-types.ts 9564줄 제외)** | **112** | **7049** | 전용 23/71파일, 1747/5059줄 (PRIM 제외) | 15/150 |

- 테스트: 도달 파일의 형제 `*.test.*` 37개 / 3574줄 (소스 대비 51%). 같은 슬라이스 전체 테스트 24개 / 3086줄(상한).
- barrel 폐포(naive, `export *`·이름 무시) 기준 도달 파일 132개 vs 이름 해석(precise) 112개 — 둘 다 api-types.ts 1개 포함.
- Route Handler: `app/api/finance` 5줄
- 단순 전달층 A(엄격): 16파일/290줄 = barrel 15/150 + Route Handler 1/5 + 래퍼 컴포넌트·hook 0파일/0줄 + 1문장 hook 함수 8개/30줄 + 1문장 fetch api 함수 22개/105줄 → 소스 대비 4.1%
- 인자 전달형 B(보조): queryOptions 1파일/74줄 + queryKeys 1파일/27줄 + 래퍼/셸 2파일/78줄 = 179줄 → 2.5%
- A+B 6.7%

#### 데이터 흐름: 자산 스냅샷 목록 (layout 프리페치 + 클라이언트 구독)

이 화면은 `page.tsx`가 `'use client'`이고 프리페치·HydrationBoundary는 형제 `layout.tsx`에 있다.

| # | 단계 | file:line | 변형? |
|---|---|---|---|
| 1 | 서버 프리페치 | `app/(main)/finance/(dashboard)/layout.tsx:25` prefetchQuery(assetSnapshotListQueryOptions(token)) (+ `:26`, `:29` 두 개 더) | 전달 |
| 2 | HydrationBoundary | `layout.tsx:34` | 전달 |
| 3 | query hook | `entities/finance/hooks/useFinanceQueries.ts:17-19` useAssetSnapshotsQuery | 전달 (1문장) |
| 3b | 소비 | `app/(main)/finance/(dashboard)/page.tsx:14` 및 `widgets/asset-overview/AssetOverview.tsx:31` (두 곳이 같은 hook 호출) | - |
| 4 | queryOptions | `entities/finance/model/queryOptions.ts:23-28` | 전달 |
| 5 | api 함수 | `entities/finance/api/index.ts:44-46` listAssetSnapshots → `fetchEither` | 전달 |
| 6a | 서버 경로 | `api-client:121-140` apiFetch → kista-api(8080) 직결 | 전달 |
| 6b | 브라우저 경로 | `clientFetch` → `app/api/finance/[[...path]]/route.ts:1-5` → `createProxyRoute.ts:19-67` | 파일 전달 |
| 7 | kista-api 호출 | `GET /api/finance/asset-snapshots` | - |
| 8 | 응답 타입 | `entities/finance/model/types.ts:4-` `AssetSnapshot` (수기 타입, 제네릭 캐스트) | normalizer 없음 |
| 9 | 표시 변형 | `widgets/asset-overview/AssetOverview.tsx:42-44` → `entities/finance/lib/aggregate.ts:82-122` calcMonthlySummary / calcCategoryBreakdown | 변형: 월·카테고리 집계 |

변형은 9(집계) 1곳뿐이고 1~8단계는 전부 전달이다. 이 도메인은 normalizer가 없어(`entities/finance/api/index.ts`에서 `normalize` 0건) api 함수 42개 중 22개가 1문장 fetch다.

#### 단순 전달층 상세
- barrel 15파일/150줄 (widgets 7개: asset-composition·asset-overview·asset-record-check·asset-record-list·asset-trend·kpi-card·revealable-value 등 각 1줄, entities 2개 132줄 — `entities/finance/index.ts` 128줄).
- Route Handler 1개(finance) 5줄, 1문장 hook 8개/30줄, 1문장 fetch api 함수 22개/105줄.
- 보조(B): `widgets/asset-trend/AssetTrend.tsx` 39줄·`widgets/asset-composition/AssetComposition.tsx` 39줄(Card 헤더 + `*Inner` 지연 로딩), queryOptions 1/74줄, queryKeys 1/27줄.
- 참고: `entities/finance/api/index.ts`(360줄)에는 관리자용 시스템 카테고리 CRUD(`:149-162`)도 같은 파일에 있어 이 화면이 파일 단위로 함께 도달한다. 이 화면은 호출하지 않는다.

### 6. 백테스트 /stats/backtest

진입점: `app/(main)/stats/backtest/page.tsx`

| 계층 | 파일 | 줄 | 전용 파일(줄) | 단순 re-export index(파일/줄) |
|---|---:|---:|---:|---:|
| app | 1 | 10 | 1 (10) | 0/0 |
| widgets | 6 | 175 | 4 (130) | 2/2 |
| features | 3 | 464 | 3 (464) | 1/2 |
| entities | 16 | 798 | 4 (82) | 4/60 |
| shared | 8 | 513 | 0 (0) | 0/0 |
| 공용 프리미티브(components/ui + shared/ui + lib/utils) | 14 | 670 | - | 2/2 |
| app/api Route Handler (이 화면 호출분, import 비도달) | 2 | 19 | - | - |
| **합계(생성 파일 api-types.ts 9564줄 제외)** | **50** | **2649** | 전용 12/34파일, 686/1960줄 (PRIM 제외) | 9/66 |

- 테스트: 도달 파일의 형제 `*.test.*` 14개 / 1291줄 (소스 대비 49%). 같은 슬라이스 전체 테스트 13개 / 1543줄(상한).
- barrel 폐포(naive, `export *`·이름 무시) 기준 도달 파일 69개 vs 이름 해석(precise) 49개 — 둘 다 api-types.ts 1개 포함.
- Route Handler: `app/api/backtest` 6줄, `app/api/runtime-config` 13줄
- 단순 전달층 A(엄격): 13파일/113줄 = barrel 9/66 + Route Handler 2/19 + 래퍼 컴포넌트·hook 2파일/25줄 + 1문장 hook 함수 0개/0줄 + 1문장 fetch api 함수 1개/3줄 → 소스 대비 4.3%
- 인자 전달형 B(보조): queryOptions 0파일/0줄 + queryKeys 0파일/0줄 + 래퍼/셸 0파일/0줄 = 0줄 → 0.0%
- A+B 4.3%

#### 데이터 흐름: 백테스트 실행 (프리페치 없음, 뮤테이션)

| # | 단계 | file:line | 변형? |
|---|---|---|---|
| 1 | page | `app/(main)/stats/backtest/page.tsx:8-10` → `widgets/backtest/BacktestPageContent.tsx:11-12` | 전달 (page는 `<BacktestPageContent />`만 반환) |
| 2 | 폼 상태 | `features/backtest/run-backtest/model/useBacktestForm.ts:18` useBacktestMutation, `:110` buildParams, `:145` mutate | 변형: 폼 상태 → `BacktestParams` |
| 3 | mutation hook | `entities/backtest/hooks/useBacktestMutation.ts:7-15` | 전달 (`mutationFn: (params) => getBacktest(params)`) |
| 4 | api 함수 | `entities/backtest/api/index.ts:4-11` getBacktest | 변형: params → query string (null 생략, `:7-9`), 이후 `fetchEither` |
| 5 | 브라우저 경로 | `clientFetch` (`api-client:93-106`) → `app/api/backtest/route.ts:1-6` (GET만) → `createProxyRoute.ts:19-67` | 파일 전달 |
| 6 | kista-trading 호출 | `GET /api/backtest?...` | - |
| 7 | 응답 타입 | `entities/backtest/model/types.ts:48-54` BacktestResult | normalizer 없음 |
| 8 | 표시 변형 | `widgets/backtest/BacktestPageContent.tsx:39-46` summary → `BacktestSummaryCards`, `points.map`으로 차트 rows 컬럼명 매핑 | 변형: 얇은 매핑 |

변형은 2, 4, 8의 3곳이고 실제 값 가공은 거의 없다. 6개 화면 중 가장 얕다(소스 2,649줄).

#### 단순 전달층 상세
- barrel 9파일/66줄, Route Handler 2개(backtest·runtime-config) 19줄.
- 래퍼: `app/(main)/stats/backtest/page.tsx` 10줄(위젯 한 개 렌더), `entities/backtest/hooks/useBacktestMutation.ts` 15줄(주석 포함, 로직은 `mutationFn` 1줄).
- 1문장 fetch api 함수 1개/3줄, B 항목 없음.

## 종합 (6개 화면)

### 화면별 요약

| 화면 | 파일 | 줄 | 테스트(형제) 파일/줄 | A 전달층 파일/줄(%) | B 보조 줄(%) | 전용 파일 비율(프리미티브 제외) |
|---|---:|---:|---:|---:|---:|---:|
| 1 대시보드 | 85 | 4,015 | 32 / 2,820 | 17 / 169 (4.2%) | 122 (3.0%) | 28/67 (42%) |
| 2 계좌 상세 | 102 | 4,804 | 43 / 4,421 | 19 / 213 (4.4%) | 165 (3.4%) | 10/74 (14%) |
| 3 전략 상세 | 123 | 6,718 | 51 / 5,809 | 19 / 273 (4.1%) | 231 (3.4%) | 20/94 (21%) |
| 4 전략 등록 폼 | 107 | 6,575 | 50 / 6,663 | 16 / 255 (3.9%) | 242 (3.7%) | 2/89 (2%) |
| 5 가계부 투자 | 112 | 7,049 | 37 / 3,574 | 16 / 290 (4.1%) | 179 (2.5%) | 23/71 (32%) |
| 6 백테스트 | 50 | 2,649 | 14 / 1,291 | 13 / 113 (4.3%) | 0 (0%) | 12/34 (35%) |
| **평균** | **약 97** | **약 5,302** | **약 38 / 4,096** | **약 17 / 219 (4.1% 가중)** | **약 157 (3.0%)** | 평균 약 24% |

(파일·줄은 api-types.ts 제외, Route Handler 포함. A·B는 서로 겹치지 않는다. A+B 합계는 가중 7.1%.)

### 계층별 평균 (화면당, 6화면)

| 계층 | 파일 | 줄 |
|---|---:|---:|
| entities | 28.3 | 1,636 |
| widgets | 15.7 | 1,147 |
| 공용 프리미티브 | 22.2 | 989 |
| shared | 16.7 | 739 |
| features | 8.7 | 687 (화면별 편차 큼: 폼 3,094, 대시보드 75) |
| app(page·layout·loading) | 2.2 | 85 |
| Route Handler | 2.8 | 약 19 |

- 가장 두꺼운 층은 entities다(화면당 28파일, 1,636줄, 소스의 약 31%). 줄 기준 다음은 widgets(22%)이다. 전략 등록 폼에서는 features가 3,094줄로 가장 크다.
- 가계부(가장 큰 7,049줄)는 프리미티브 40파일/1,985줄, entities 18/2,098줄이다.

### 결론: 간접층 비중은 작다

- 엄격 기준 순수 전달층은 화면 소스의 약 4%(평균 219줄), 보조층까지 합쳐도 약 7%다. 파일 수로는 화면당 17개(A) + 약 7개(B)다. "간접층이 두꺼워서 비대하다"는 가설은 줄 수로는 지지되지 않는다.
- 부피의 본체는 (a) 각 층 안의 실제 코드(entities 1,636줄, widgets 1,147줄), (b) 테스트(소스의 70~100%), (c) 한 화면이 끌고 오는 파일 수(평균 97개, 프리미티브 22개 포함)다. 파일 수로는 barrel이 11~15개로 단일 항목 중 가장 많다(줄은 53~172).
- 이 수치는 파일 단위 도달이라 상한이다. 정확도의 한계는 0절 참고.

### 구조적 원인 상위 5개

1. **테스트 부피가 소스에 필적한다.** 저장소 전체 소스 41,142줄(생성 파일 제외) 대비 테스트 29,584줄(72%). 계층별로 features 9,512/10,731줄(89%), shared 2,968/3,454줄(86%), entities 6,131/7,474줄(82%), widgets 10,043/14,673줄(68%). 화면 평균 소스 5,302줄에 형제 테스트 4,096줄이고, 전략 등록 폼은 6,663줄로 소스(6,575줄)를 넘는다. 전달층도 테스트한다. `entities/account/model/queryKeys.ts`(10줄)에 `queryKeys.test.ts`(16줄), `queryOptions.ts`(28줄)에 `queryOptions.test.ts`(55줄). entities 전체로 queryKeys·queryOptions 소스 21파일/487줄 대 테스트 10파일/427줄이다(`find`·`cat | wc -l` 실측).
2. **entities 슬라이스 의식: GET 하나에 5~6개 파일, 수기 타입·normalizer 병행.** 계좌 목록 하나가 `entities/account/api/index.ts:16-18` + `model/queryOptions.ts:8-13` + `model/queryKeys.ts:3-4` + `hooks/useAccountQueries.ts:8-16` + `index.ts:8-13`(barrel) + `model/types.ts`로 나뉜다. entities 전체는 api 16파일 1,307줄, hooks 23파일 1,912줄, queryOptions·queryKeys 21파일 487줄, types 15파일 967줄, barrel 16개다. 타입은 수기이고 생성된 `api-types.ts`(9,564줄)는 `shared/lib/api-schema.ts`와 entities 3곳(admin·market·stats의 `model/types.ts`)만 import한다. normalizer 함수는 19개이며, 예를 들어 `entities/strategy/api/index.ts:104-125`는 대부분 `String(s.id)` 같은 형 강제다. 반대로 가계부는 normalizer 없이 제네릭 캐스트만 한다(`entities/finance/api/index.ts:44-46`).
3. **서버 직결 / 브라우저 프록시 / 공개 직결 3경로와 이중 상태 전달.** `fetchEither`가 토큰 유무로 `apiFetch`와 `clientFetch`를 고른다(`shared/lib/api-client/index.ts:117-119`). 백엔드 라우팅 표가 두 곳에서 따로 유지된다(`api-client:4-13`의 `TRADING_PREFIXES`와 각 `app/api/*/route.ts`의 `target`, 둘 다 `grep` 6건). 공개 엔드포인트는 세 번째 경로가 있고 에러 처리가 중복된다(`entities/market/api/index.ts:8-16` vs `api-client:82-86`, 분기 `entities/market/model/queryOptions.ts:17-18`). 하이드레이션 캐시와 `initial*` props가 같은 값을 이중으로 들고 `?? initialX`로 합친다(`widgets/account-detail/AccountDetailContent.tsx:24-25`, `widgets/strategy-detail/StrategyDetailContent.tsx:28-31`, `features/strategy/create-strategy/StrategyFormPage.tsx:26`). 프록시 Route Handler 15개(합 102줄)는 각각 5~13줄이라 파일 비중은 작지만 경로 수가 늘린다.
4. **위젯 층의 슬롯·props 전달과 Inner 쌍, 1줄 barrel.** 대시보드는 슬롯이 3단을 지난다(`DashboardContent.tsx:15` → `DashboardOverview.tsx:11-28` → `DashboardMarkets.tsx:13-28`). 지연 로딩 `*Inner` 쌍이 6개다(`widgets/dashboard/MarketChartCard.tsx:6-13`, `widgets/fear-greed-card/FearGreedCard.tsx:7-14`, `widgets/asset-trend/AssetTrend.tsx:8-15` 등, `grep` 6건). 어댑터성 래퍼도 있다(`widgets/account-detail/TradesTab.tsx:12-14`, `widgets/cycle-history/StrategyTradesTab.tsx:10-18`). 저장소에는 순수 re-export 파일이 101개(495줄)이고, 그중 widgets가 37개로 대부분 1줄 index다(`widgets/page-header/index.ts` 등). 계좌 상세는 `AccountDetailTabs.tsx:13-23`이 props 7개를 그대로 `AccountSummaryCard`로 넘긴다.
5. **라우트 이중화와 기능 단위가 큰 폼.** `@modal` 인터셉트 페이지가 11개(146줄)이고 `loading.tsx` 1줄 re-export가 13개다(예: `app/(main)/@modal/(.)accounts/[id]/strategies/new/page.tsx:9-17`가 `NewStrategyFormBody`를 다시 마운트). 전략 폼은 features 33파일/3,094줄에 일반 폼과 DCA 폼이 병존한다(`features/strategy/create-strategy/model/useStrategyForm.ts:136`의 `strategyFormSchema`와 `DcaStrategyForm.tsx:49`의 `dcaFormSchema`, 각 278줄·215줄·187줄 규모). 같은 폼 기능이 수정·재설정 라우트에서도 쓰여 이 화면의 전용 파일 비율은 2%다.

### 이 문서가 말하지 못하는 것

- 화면이 실제로 호출하는 export 비율, 번들 크기, 런타임 렌더 비용은 측정하지 않았다.
- 1문장 hook·api 판정은 정규식 휴리스틱이고, 래퍼 컴포넌트 판정은 사람이 읽고 분류했다(`DashboardMarkets`처럼 레이아웃 조립은 전달로 세지 않았다). 경계 사례는 보수적으로 B 또는 비전달로 뒀다.
- 화면 6개는 표본이다. 통계·관리자·설정 계열 화면은 보지 않았다.

## 부록: 화면별 도달 파일 전체 목록 (줄 수, 경로)

### 1. 대시보드 /dashboard

**app** (2)

```
5	app/(main)/dashboard/loading.tsx
54	app/(main)/dashboard/page.tsx
```

**widgets** (24)

```
473	widgets/crypto-market-indicators/CryptoIndicatorCards.tsx
101	widgets/crypto-market-indicators/CryptoMarketSection.tsx
57	widgets/crypto-market-indicators/IndicatorLineChart.tsx
1	widgets/crypto-market-indicators/index.ts
38	widgets/crypto-market-indicators/niceTicks.ts
44	widgets/dashboard/DashboardContent.tsx
82	widgets/dashboard/DashboardEmpty.tsx
29	widgets/dashboard/DashboardMarkets.tsx
29	widgets/dashboard/DashboardOverview.tsx
24	widgets/dashboard/DashboardSkeleton.tsx
26	widgets/dashboard/MarketChartCard.tsx
279	widgets/dashboard/MarketChartCardInner.tsx
64	widgets/dashboard/marketChartCategories.ts
36	widgets/fear-greed-card/FearGreedCard.tsx
93	widgets/fear-greed-card/FearGreedCardInner.tsx
77	widgets/fear-greed-card/FearGreedGauge.tsx
49	widgets/fear-greed-card/FearGreedSection.tsx
85	widgets/fear-greed-card/FearGreedTrend.tsx
19	widgets/fear-greed-card/fearGreedZones.ts
1	widgets/fear-greed-card/index.ts
313	widgets/market-holiday-calendar/WeeklyMarketCalendar.tsx
1	widgets/market-holiday-calendar/index.ts
47	widgets/page-header/PageHeader.tsx
1	widgets/page-header/index.ts
```

**features** (4)

```
39	features/account/create-account/NewAccountButton.tsx
2	features/account/create-account/index.ts
32	features/auth/logout/DashboardLogoutErrorToast.tsx
2	features/auth/logout/index.ts
```

**entities** (20)

```
66	entities/account/api/index.ts
20	entities/account/hooks/useAccountQueries.ts
25	entities/account/index.ts
10	entities/account/model/queryKeys.ts
28	entities/account/model/queryOptions.ts
8	entities/account/model/sortAccounts.ts
26	entities/account/model/types.ts
42	entities/market/api/index.ts
60	entities/market/hooks/useMarketQueries.ts
4	entities/market/index.ts
2	entities/market/model/constants.ts
9	entities/market/model/queryKeys.ts
22	entities/market/model/queryOptions.ts
35	entities/market/model/types.ts
115	entities/trade/api/index.ts
67	entities/trade/hooks/useDailyTradesRangeQuery.ts
12	entities/trade/index.ts
6	entities/trade/model/direction.ts
17	entities/trade/model/queryKeys.ts
82	entities/trade/model/types.ts
```

**shared** (17)

```
140	shared/lib/api-client/index.ts
114	shared/lib/api-schema.ts
5	shared/lib/auth/cookies.ts
18	shared/lib/auth/jwt.ts
18	shared/lib/auth/token.ts
2	shared/lib/chart/axisTick.ts
9	shared/lib/chart/tooltip.ts
92	shared/lib/date-range.ts
19	shared/lib/env.ts
187	shared/lib/format/index.ts
6	shared/lib/format/pnl.ts
37	shared/lib/indicators.ts
10	shared/lib/query-string.ts
17	shared/lib/query/createQueryClient.ts
16	shared/lib/query/detailFromList.ts
3	shared/lib/query/index.ts
36	shared/lib/utils.ts
```

**공용 프리미티브** (14): button-variants, button, popover, select, skeleton, lib/utils, CardSkeleton, IconButton, SegmentedTabs, SegmentedToggle, Spinner, Surface, iconButtonStyles, segmentedStyles

**생성 파일**: shared/lib/api-types.ts (9564줄, 직접 import는 shared/lib/api-schema.ts 1곳 + entities 일부 types)

### 2. 계좌 상세 /accounts/[id]

**app** (2)

```
19	app/(main)/accounts/[id]/loading.tsx
56	app/(main)/accounts/[id]/page.tsx
```

**widgets** (19)

```
67	widgets/account-detail/AccountDetailContent.tsx
72	widgets/account-detail/AccountDetailTabs.tsx
103	widgets/account-detail/AccountSummaryCard.tsx
127	widgets/account-detail/CryptoHoldingsCard.tsx
28	widgets/account-detail/TradesTab.tsx
1	widgets/account-detail/index.ts
178	widgets/cycle-history/CycleHistoryTable.tsx
2	widgets/cycle-history/index.ts
44	widgets/kpi-card/KpiCard.tsx
1	widgets/kpi-card/index.ts
47	widgets/page-header/PageHeader.tsx
1	widgets/page-header/index.ts
31	widgets/revealable-value/RevealableValue.tsx
1	widgets/revealable-value/index.ts
114	widgets/strategy-card/DcaStrategyCard.tsx
221	widgets/strategy-card/StrategyCard.tsx
1	widgets/strategy-card/index.ts
43	widgets/strategy-list/StrategyList.tsx
1	widgets/strategy-list/index.ts
```

**features** (2)

```
38	features/strategy/create-strategy/NewStrategyButton.tsx
4	features/strategy/create-strategy/index.ts
```

**entities** (33)

```
66	entities/account/api/index.ts
20	entities/account/hooks/useAccountQueries.ts
25	entities/account/index.ts
26	entities/account/model/apiKeyExpiry.ts
10	entities/account/model/queryKeys.ts
28	entities/account/model/queryOptions.ts
8	entities/account/model/sortAccounts.ts
26	entities/account/model/types.ts
4	entities/meta/index.ts
70	entities/meta/model/types.ts
38	entities/meta/providers/MetaProvider.tsx
134	entities/order/api/index.ts
51	entities/order/hooks/useOrderQueries.ts
21	entities/order/index.ts
64	entities/order/model/order-readiness.ts
6	entities/order/model/queryKeys.ts
22	entities/order/model/queryOptions.ts
72	entities/order/model/types.ts
242	entities/strategy/api/index.ts
240	entities/strategy/hooks/useStrategyQueries.ts
45	entities/strategy/index.ts
25	entities/strategy/model/badges.ts
93	entities/strategy/model/dcaFormat.ts
16	entities/strategy/model/queryKeys.ts
39	entities/strategy/model/queryOptions.ts
17	entities/strategy/model/scheduled-start.ts
148	entities/strategy/model/types.ts
115	entities/trade/api/index.ts
68	entities/trade/hooks/useCycleHistory.ts
12	entities/trade/index.ts
17	entities/trade/model/queryKeys.ts
27	entities/trade/model/queryOptions.ts
82	entities/trade/model/types.ts
```

**shared** (18)

```
140	shared/lib/api-client/index.ts
114	shared/lib/api-schema.ts
5	shared/lib/auth/cookies.ts
18	shared/lib/auth/token.ts
92	shared/lib/date-range.ts
19	shared/lib/env.ts
187	shared/lib/format/index.ts
6	shared/lib/format/pnl.ts
25	shared/lib/hooks/use-range-filter-state.ts
23	shared/lib/hooks/use-table-sort.ts
15	shared/lib/normalize.ts
10	shared/lib/query-string.ts
17	shared/lib/query/createQueryClient.ts
16	shared/lib/query/detailFromList.ts
3	shared/lib/query/index.ts
42	shared/lib/query/listCacheSync.ts
36	shared/lib/utils.ts
25	shared/model/placed-order.ts
```

**공용 프리미티브** (25): button-variants, button, card, input, select, skeleton, lib/utils, Badge, CardSkeleton, EmptyState, IconButton, LoadingRow, MobileSortControl, PageSizeSelector, SectionError, SegmentedTabs, SegmentedToggle, SortableHeadCell, Spinner, TableDataCell, TableHeadCell, dateGroup, iconButtonStyles, range-filter/RangeFilterControls, segmentedStyles

**생성 파일**: shared/lib/api-types.ts (9564줄, 직접 import는 shared/lib/api-schema.ts 1곳 + entities 일부 types)

### 3. 전략 상세 /accounts/[id]/strategies/[sid]

**app** (2)

```
20	app/(main)/accounts/[id]/strategies/[sid]/loading.tsx
53	app/(main)/accounts/[id]/strategies/[sid]/page.tsx
```

**widgets** (22)

```
178	widgets/cycle-history/CycleHistoryTable.tsx
19	widgets/cycle-history/StrategyTradesTab.tsx
2	widgets/cycle-history/index.ts
44	widgets/kpi-card/KpiCard.tsx
1	widgets/kpi-card/index.ts
47	widgets/page-header/PageHeader.tsx
1	widgets/page-header/index.ts
96	widgets/strategy-detail/CloseStrategyDialog.tsx
42	widgets/strategy-detail/DcaExecutionFilters.tsx
202	widgets/strategy-detail/DcaExecutionHistory.tsx
181	widgets/strategy-detail/DcaStrategyDetail.tsx
264	widgets/strategy-detail/NextOrderCard.tsx
56	widgets/strategy-detail/OrderHistoryFilters.tsx
164	widgets/strategy-detail/OrderRows.tsx
124	widgets/strategy-detail/StrategyDetail.tsx
84	widgets/strategy-detail/StrategyDetailContent.tsx
226	widgets/strategy-detail/StrategyMetaSection.tsx
202	widgets/strategy-detail/StrategyOrderHistory.tsx
13	widgets/strategy-detail/StrategyToggleButton.tsx
1	widgets/strategy-detail/index.ts
70	widgets/strategy-detail/orderBannerCopy.ts
36	widgets/strategy-detail/useTodayMarketStatus.ts
```

**features** (2)

```
2	features/strategy/manage-strategy/index.ts
88	features/strategy/manage-strategy/useManageStrategyMutations.ts
```

**entities** (48)

```
66	entities/account/api/index.ts
99	entities/account/hooks/useAccountMarginQuery.ts
20	entities/account/hooks/useAccountQueries.ts
25	entities/account/index.ts
10	entities/account/model/invalidate.ts
10	entities/account/model/queryKeys.ts
28	entities/account/model/queryOptions.ts
8	entities/account/model/sortAccounts.ts
26	entities/account/model/types.ts
42	entities/market/api/index.ts
60	entities/market/hooks/useMarketQueries.ts
4	entities/market/index.ts
2	entities/market/model/constants.ts
9	entities/market/model/queryKeys.ts
22	entities/market/model/queryOptions.ts
35	entities/market/model/types.ts
4	entities/meta/index.ts
70	entities/meta/model/types.ts
38	entities/meta/providers/MetaProvider.tsx
134	entities/order/api/index.ts
51	entities/order/hooks/useOrderQueries.ts
21	entities/order/index.ts
64	entities/order/model/order-readiness.ts
6	entities/order/model/queryKeys.ts
22	entities/order/model/queryOptions.ts
18	entities/order/model/status-badge.ts
72	entities/order/model/types.ts
46	entities/stats/index.ts
35	entities/stats/model/queryKeys.ts
116	entities/stats/model/types.ts
242	entities/strategy/api/index.ts
240	entities/strategy/hooks/useStrategyQueries.ts
45	entities/strategy/index.ts
25	entities/strategy/model/badges.ts
13	entities/strategy/model/capitalAdjustment.ts
93	entities/strategy/model/dcaFormat.ts
16	entities/strategy/model/queryKeys.ts
39	entities/strategy/model/queryOptions.ts
17	entities/strategy/model/scheduled-start.ts
148	entities/strategy/model/types.ts
10	entities/strategy/model/vr-rollover.ts
115	entities/trade/api/index.ts
68	entities/trade/hooks/useCycleHistory.ts
12	entities/trade/index.ts
6	entities/trade/model/direction.ts
17	entities/trade/model/queryKeys.ts
27	entities/trade/model/queryOptions.ts
82	entities/trade/model/types.ts
```

**shared** (20)

```
140	shared/lib/api-client/index.ts
114	shared/lib/api-schema.ts
5	shared/lib/auth/cookies.ts
18	shared/lib/auth/token.ts
92	shared/lib/date-range.ts
19	shared/lib/env.ts
187	shared/lib/format/index.ts
6	shared/lib/format/pnl.ts
18	shared/lib/hooks/use-media-query.ts
25	shared/lib/hooks/use-range-filter-state.ts
33	shared/lib/hooks/use-scrolled-to-end.ts
23	shared/lib/hooks/use-table-sort.ts
15	shared/lib/normalize.ts
10	shared/lib/query-string.ts
17	shared/lib/query/createQueryClient.ts
16	shared/lib/query/detailFromList.ts
3	shared/lib/query/index.ts
42	shared/lib/query/listCacheSync.ts
36	shared/lib/utils.ts
25	shared/model/placed-order.ts
```

**공용 프리미티브** (25): alert-dialog, button-variants, button, card, input, pagination, radio-group, select, skeleton, lib/utils, Badge, CardSkeleton, EmptyState, LoadingRow, MobileSortControl, PageSizeSelector, PaginationBar, SectionError, SegmentedToggle, SortableHeadCell, TableDataCell, TableHeadCell, dateGroup, range-filter/RangeFilterControls, segmentedStyles

**생성 파일**: shared/lib/api-types.ts (9564줄, 직접 import는 shared/lib/api-schema.ts 1곳 + entities 일부 types)

### 4. 전략 등록 폼 /accounts/[id]/strategies/new

**app** (2)

```
27	app/(main)/accounts/[id]/strategies/new/NewStrategyFormBody.tsx
19	app/(main)/accounts/[id]/strategies/new/page.tsx
```

**widgets** (2)

```
47	widgets/page-header/PageHeader.tsx
1	widgets/page-header/index.ts
```

**features** (33)

```
215	features/strategy/create-strategy/DcaStrategyForm.tsx
23	features/strategy/create-strategy/StrategyFieldLabel.tsx
200	features/strategy/create-strategy/StrategyForm.tsx
41	features/strategy/create-strategy/StrategyFormPage.tsx
56	features/strategy/create-strategy/StrategyFormSkeleton.tsx
4	features/strategy/create-strategy/index.ts
52	features/strategy/create-strategy/model/buildDcaPayload.ts
88	features/strategy/create-strategy/model/buildStrategyPayload.ts
187	features/strategy/create-strategy/model/dcaFormSchema.ts
23	features/strategy/create-strategy/model/loadStrategyFormContext.ts
200	features/strategy/create-strategy/model/strategyFormGuards.ts
125	features/strategy/create-strategy/model/strategyFormHelpers.ts
45	features/strategy/create-strategy/model/strategyFormSchema.ts
66	features/strategy/create-strategy/model/useSeedModel.ts
278	features/strategy/create-strategy/model/useStrategyForm.ts
44	features/strategy/create-strategy/model/useStrategyFormData.ts
101	features/strategy/create-strategy/model/useStrategyFormEffects.ts
70	features/strategy/create-strategy/model/useTypeDefaults.ts
84	features/strategy/create-strategy/model/vrDerived.ts
76	features/strategy/create-strategy/sections/CycleSeedSection.tsx
144	features/strategy/create-strategy/sections/DcaConditionsSection.tsx
62	features/strategy/create-strategy/sections/DcaRuleEditor.tsx
80	features/strategy/create-strategy/sections/DcaRuleList.tsx
199	features/strategy/create-strategy/sections/DcaSettingsSection.tsx
47	features/strategy/create-strategy/sections/DivisionCountSection.tsx
65	features/strategy/create-strategy/sections/InitialHoldingsSection.tsx
24	features/strategy/create-strategy/sections/ReadOnlySeedSection.tsx
36	features/strategy/create-strategy/sections/ScheduledStartSection.tsx
106	features/strategy/create-strategy/sections/SeedAmountInput.tsx
87	features/strategy/create-strategy/sections/SeedInputSection.tsx
82	features/strategy/create-strategy/sections/StrategyTickerSection.tsx
60	features/strategy/create-strategy/sections/StrategyTypeSection.tsx
124	features/strategy/create-strategy/sections/VrSettingsSection.tsx
```

**entities** (35)

```
66	entities/account/api/index.ts
99	entities/account/hooks/useAccountMarginQuery.ts
25	entities/account/index.ts
10	entities/account/model/invalidate.ts
10	entities/account/model/queryKeys.ts
28	entities/account/model/queryOptions.ts
26	entities/account/model/types.ts
4	entities/meta/index.ts
24	entities/meta/model/marketRules.ts
70	entities/meta/model/types.ts
38	entities/meta/providers/MetaProvider.tsx
21	entities/order/index.ts
6	entities/order/model/queryKeys.ts
6	entities/runtime-config/api/index.ts
17	entities/runtime-config/hooks/useRuntimeConfigQuery.ts
9	entities/runtime-config/index.ts
36	entities/runtime-config/model/types.ts
46	entities/stats/index.ts
35	entities/stats/model/queryKeys.ts
116	entities/stats/model/types.ts
242	entities/strategy/api/index.ts
240	entities/strategy/hooks/useStrategyQueries.ts
45	entities/strategy/index.ts
93	entities/strategy/model/dcaFormat.ts
61	entities/strategy/model/poolLimitRamp.ts
16	entities/strategy/model/queryKeys.ts
39	entities/strategy/model/queryOptions.ts
148	entities/strategy/model/types.ts
43	entities/strategy/model/vrRamp.ts
31	entities/strategy/ui/DcaRuleSummaryLabel.tsx
239	entities/strategy/ui/VrFieldControls.tsx
12	entities/trade/index.ts
6	entities/trade/model/direction.ts
17	entities/trade/model/queryKeys.ts
82	entities/trade/model/types.ts
```

**shared** (17)

```
140	shared/lib/api-client/index.ts
114	shared/lib/api-schema.ts
5	shared/lib/auth/cookies.ts
18	shared/lib/auth/token.ts
3	shared/lib/dismiss.ts
19	shared/lib/env.ts
187	shared/lib/format/index.ts
6	shared/lib/format/pnl.ts
50	shared/lib/hooks/use-decimal-amount-text.ts
15	shared/lib/normalize.ts
10	shared/lib/query-string.ts
16	shared/lib/query/detailFromList.ts
3	shared/lib/query/index.ts
42	shared/lib/query/listCacheSync.ts
61	shared/lib/subviewHistory.ts
36	shared/lib/utils.ts
25	shared/model/placed-order.ts
```

**공용 프리미티브** (15): button-variants, button, input, label, select, skeleton, switch, lib/utils, Badge, FormActions, Spinner, UnitInput, select-all-on-focus, selection-card/SelectionCard, selection-card/index

**생성 파일**: shared/lib/api-types.ts (9564줄, 직접 import는 shared/lib/api-schema.ts 1곳 + entities 일부 types)

### 5. 가계부 투자(자산) /finance

**app** (4)

```
90	app/(main)/finance/(dashboard)/FinanceHeader.tsx
59	app/(main)/finance/(dashboard)/FinancePeriodProvider.tsx
41	app/(main)/finance/(dashboard)/layout.tsx
57	app/(main)/finance/(dashboard)/page.tsx
```

**widgets** (21)

```
39	widgets/asset-composition/AssetComposition.tsx
193	widgets/asset-composition/AssetCompositionInner.tsx
1	widgets/asset-composition/index.ts
93	widgets/asset-overview/AssetOverview.tsx
171	widgets/asset-overview/AssetOverviewParts.tsx
1	widgets/asset-overview/index.ts
122	widgets/asset-record-check/AssetRecordCheck.tsx
1	widgets/asset-record-check/index.ts
65	widgets/asset-record-list/AssetRecordFilters.tsx
273	widgets/asset-record-list/AssetRecordList.tsx
214	widgets/asset-record-list/AssetRecordRows.tsx
1	widgets/asset-record-list/index.ts
39	widgets/asset-trend/AssetTrend.tsx
214	widgets/asset-trend/AssetTrendInner.tsx
1	widgets/asset-trend/index.ts
44	widgets/kpi-card/KpiCard.tsx
1	widgets/kpi-card/index.ts
47	widgets/page-header/PageHeader.tsx
1	widgets/page-header/index.ts
31	widgets/revealable-value/RevealableValue.tsx
1	widgets/revealable-value/index.ts
```

**features** (8)

```
37	features/asset/save-asset/NewAssetButton.tsx
3	features/asset/save-asset/index.ts
47	features/asset/toggle-monthly-check/ToggleMonthlyCheckButton.tsx
1	features/asset/toggle-monthly-check/index.ts
42	features/finance/save-transaction/NewTransactionButton.tsx
189	features/finance/save-transaction/TransactionFormDialog.tsx
2	features/finance/save-transaction/index.ts
34	features/finance/save-transaction/transactionFormHelpers.ts
```

**entities** (18)

```
360	entities/finance/api/index.ts
24	entities/finance/hooks/useCategoryPathState.ts
465	entities/finance/hooks/useFinanceMutations.ts
75	entities/finance/hooks/useFinanceQueries.ts
128	entities/finance/index.ts
271	entities/finance/lib/aggregate.ts
66	entities/finance/lib/assetSort.ts
33	entities/finance/lib/budgetRoutes.ts
47	entities/finance/lib/categoryIndex.ts
57	entities/finance/lib/categoryTree.ts
53	entities/finance/lib/colors.ts
146	entities/finance/lib/period.ts
27	entities/finance/model/queryKeys.ts
74	entities/finance/model/queryOptions.ts
160	entities/finance/model/types.ts
4	entities/meta/index.ts
70	entities/meta/model/types.ts
38	entities/meta/providers/MetaProvider.tsx
```

**shared** (20)

```
140	shared/lib/api-client/index.ts
114	shared/lib/api-schema.ts
5	shared/lib/auth/cookies.ts
18	shared/lib/auth/token.ts
2	shared/lib/chart/axisTick.ts
9	shared/lib/chart/tooltip.ts
19	shared/lib/env.ts
42	shared/lib/form/submitFormDialog.ts
187	shared/lib/format/index.ts
6	shared/lib/format/pnl.ts
87	shared/lib/hooks/use-amount-hidden.ts
24	shared/lib/hooks/use-client-pagination.ts
18	shared/lib/hooks/use-confirm-dialog.ts
23	shared/lib/hooks/use-table-sort.ts
4	shared/lib/metadata.ts
10	shared/lib/query-string.ts
17	shared/lib/query/createQueryClient.ts
3	shared/lib/query/index.ts
42	shared/lib/query/listCacheSync.ts
36	shared/lib/utils.ts
```

**공용 프리미티브** (40): alert-dialog, button-variants, button, card, checkbox, dialog, input, label, pagination, popover, select, skeleton, switch, lib/utils, Badge, CascadingCategorySelect, ConfirmDeleteDialog, EmptyState, GroupSharedBadge, IconButton, InputUnitSuffix, LoadingRow, MobileSortControl, MonthClosedNotice, PageSizeSelector, PaginationBar, SaveButton, SectionError, SectionTabBar, SegmentedToggle, ShareToGroupSwitch, ShareableRowActions, SortableHeadCell, Spinner, TableDataCell, TableHeadCell, YearMonthSelect, iconButtonStyles, segmentedStyles, select-all-on-focus

**생성 파일**: shared/lib/api-types.ts (9564줄, 직접 import는 shared/lib/api-schema.ts 1곳 + entities 일부 types)

### 6. 백테스트 /stats/backtest

**app** (1)

```
10	app/(main)/stats/backtest/page.tsx
```

**widgets** (6)

```
66	widgets/backtest/BacktestPageContent.tsx
44	widgets/backtest/BacktestSummaryCards.tsx
19	widgets/backtest/BacktestWarnings.tsx
1	widgets/backtest/index.ts
44	widgets/kpi-card/KpiCard.tsx
1	widgets/kpi-card/index.ts
```

**features** (3)

```
256	features/backtest/run-backtest/BacktestForm.tsx
2	features/backtest/run-backtest/index.ts
206	features/backtest/run-backtest/model/useBacktestForm.ts
```

**entities** (16)

```
11	entities/backtest/api/index.ts
15	entities/backtest/hooks/useBacktestMutation.ts
2	entities/backtest/index.ts
54	entities/backtest/model/types.ts
4	entities/meta/index.ts
70	entities/meta/model/types.ts
38	entities/meta/providers/MetaProvider.tsx
6	entities/runtime-config/api/index.ts
17	entities/runtime-config/hooks/useRuntimeConfigQuery.ts
9	entities/runtime-config/index.ts
36	entities/runtime-config/model/types.ts
45	entities/strategy/index.ts
61	entities/strategy/model/poolLimitRamp.ts
148	entities/strategy/model/types.ts
43	entities/strategy/model/vrRamp.ts
239	entities/strategy/ui/VrFieldControls.tsx
```

**shared** (8)

```
140	shared/lib/api-client/index.ts
114	shared/lib/api-schema.ts
2	shared/lib/chart/axisTick.ts
9	shared/lib/chart/tooltip.ts
19	shared/lib/env.ts
187	shared/lib/format/index.ts
6	shared/lib/format/pnl.ts
36	shared/lib/utils.ts
```

**공용 프리미티브** (14): button-variants, button, card, input, label, select, skeleton, lib/utils, EquityLineChart, Spinner, UnitInput, select-all-on-focus, selection-card/SelectionCard, selection-card/index

**생성 파일**: shared/lib/api-types.ts (9564줄, 직접 import는 shared/lib/api-schema.ts 1곳 + entities 일부 types)
