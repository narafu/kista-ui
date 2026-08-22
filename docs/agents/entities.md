# entities/ — 도메인 모델 · API 함수 · React Query 훅

FSD 계층에서 가장 저수준 도메인 레이어. `shared/`만 import 가능. 동일 계층 cross-import 금지.
router.refresh() 허용 범위와 stale time 표는 `docs/agents/shared.md`를 따른다.

## 의존성 규칙

```text
entities/{domain}  ->  shared/
```

entities끼리 직접 참조 금지. 두 도메인을 조합해야 하면 `features/` 또는 `widgets/`에서 처리. 슬라이스 목록은 `ls entities/`로 확인한다.

## 슬라이스 내부 구조

```text
entities/{domain}/
  api/index.ts
  model/types.ts
  hooks/
  providers/
  index.ts
```

## 훅 작성 패턴

- **가변 SSR 데이터**: 요청별 QueryClient에서 prefetch/dehydrate한다. Server Component prop을 query의 canonical `initialData`로 사용하거나 `initialDataUpdatedAt: 0`으로 즉시 stale 처리하지 않는다
- **삭제 후 캐시 정리**: list는 `setQueryData`로 항목을 제거하고 삭제 identifier의 detail/live key만 `removeQueries`한다. `removeQueries({ queryKey: accountKeys.all })` 같은 broad root 삭제는 금지한다
- **partial/empty authoritative cache 생성 금지**: list cache가 없는 상태에서 mutation 응답 한 건만으로 `undefined -> [saved]`나 `undefined -> []`를 만들지 않는다. list cache가 absent면 canonical list query를 `fetchQuery`로 await해 전체 목록을 materialize한다 (`account` quirk의 생성/삭제 패턴 참고)
- Query 훅: `useXxxQuery` — key factory의 `queryKey`, `queryFn`, 데이터 성격에 맞는 `staleTime`
- Server/Client 공유 옵션: server-safe `model/queryOptions.ts`의 `xxxQueryOptions(token?)` — Server Component는 token으로 `prefetchQuery`, Client Component는 token 없이 `useQuery`에서 재사용
- Mutation 훅: `useXxxMutation` — 엔티티 훅은 API 호출과 도메인 캐시 동기화를 캡슐화하고 `onError`에 `toast.error`를 둔다. 성공 toast, 라우팅, 다른 도메인 무효화는 호출 feature의 `mutate(data, { onSuccess })`에서 처리한다
- 호출부에서 추가 동작이 필요하면 `mutation.mutate(data, { onSuccess: () => callback() })` 패턴 사용
- **참조 데이터 24h staleTime**: `market/model/queryOptions.ts`의 `monthlyHolidaysQueryOptions(year, month, token?)` — `staleTime: 24h`, queryFn이 `typeof window`로 서버/클라이언트를 분기해 서버+token → 인증 fetch, 서버+비인증 → public 엔드포인트, 브라우저 → Route Handler 경유 클라이언트 fetch를 고른다. `useMonthlyHolidaysQuery(year, month)`는 이 factory를 그대로 소비하며 더 이상 `initialData` 파라미터를 받지 않는다. `app/(main)/dashboard/page.tsx`가 `queryClient.prefetchQuery(monthlyHolidaysQueryOptions(...)).catch(() => undefined)`로 SSR prefetch하며, react-query 기본 `shouldDehydrateQuery`가 `status:'success'` 쿼리만 직렬화하므로 실패한 서버 조회는 dehydrate에 포함되지 않고 클라이언트가 즉시 재조회한다 — "실패한 조회를 빈 달로 24시간 hydrate 금지" 시맨틱은 이 방식으로 보존된다

**queryKey**: 각 entity의 `model/queryKeys.ts` factory가 SSOT다. 서로 다른 위젯이 동일 서버 데이터를 소비하면 같은 factory와 파라미터를 사용해 React Query 캐시를 공유한다. 배열형 인자(예: id 목록)를 받는 factory는 내부에서 복사·정렬해 키에 포함한다(`accountKeys.prices`, `tradeKeys.dailyRange` 참고) — 순서만 다른 동일 배열이 서로 다른 캐시 항목으로 분리되는 것을 방지

**서버 조회 실패를 빈 목록으로 위장 금지**: fetch/파싱 오류를 성공한 빈 배열·빈 객체로 변환해 반환하지 않는다(404가 도메인상 실제 빈 컬렉션을 의미하는 경우는 예외). 오류를 삼키면 위 `shouldDehydrateQuery` 방어가 무력화되어 실패가 "데이터 없음"으로 영구 캐시될 수 있다

## index.ts 규칙

각 슬라이스 최상단 `index.ts`가 public API. 외부에서 내부 파일 직접 import 금지.

```ts
import { deleteAccount } from '@entities/account'
```

## kista-api DTO 필드

- `UserResponse`: `{ id, nickname, status, hasTelegram, role, telegramBotUsername, strategySuggestions }` — `strategySuggestions: string[]`는 자산 등록 폼 운용전략 추천 목록(유저별 설정, 2026-08 admin 전역 설정에서 이관, 항상 non-null)
- `AccountResponse`: `{ id, nickname, accountNoMasked, broker }`
- `TradingCycleResponse`: `{ id, accountId, type, status, ticker, cycleSeedType, initialUsdDeposit, startDate, divisionCount, isReverseMode, currentRound, currentHoldings, vr }`
- **TradingCycleResponse 필드 추가 시**: `entities/strategy/model/types.ts` + `entities/strategy/api/index.ts`의 `normalizeStrategy()`를 함께 수정
- **`divisionCount`**: INFINITE 전략 전용 분할 수 (20/30/40). VR/PRIVACY는 `undefined`로 정규화된다
- **`vr`**: VR 전략 전용 요약 `{ value, bandWidth, intervalWeeks, recurringAmount, poolLimit, gradient }`. 비VR은 없음
- **`isReverseMode`**: 리버스모드 활성 여부. `StrategyRequest`에는 없음
- **`StrategyRequest`**: VR 등록 시 `initialUsdDeposit`, `intervalWeeks`, `bandWidth`, `recurringAmount`를 포함한다. 적립식 VR은 `initialUsdDeposit=0` payload를 허용한다. `initialHoldings`/`initialAvgPrice`(중간부터 시작)는 세 전략(INFINITE·PRIVACY·VR) 공통·등록 전용 필드로, 보유 수량>0일 때만 전송하고 서버가 등록 시점 전일종가×보유수량으로 V값을 계산한다(더 이상 `initialValue`를 프론트에서 곱해 보내지 않음). `scheduledStartDate`(yyyy-MM-dd)도 세 전략 공통·등록 전용 필드로, 미전송 시 오늘(KST) 시작 — 지정한 날짜 자체가 아니라 그 이후 첫 거래일부터 매매가 시작된다(exclusive 경계)
- **`Strategy.startDate`**: 응답의 사이클 시작(예정)일(yyyy-MM-dd). `startDate > todayKst()`면 아직 매매 시작 전 — `isScheduledStart(strategy)`로 판정하고 `scheduledStartBadgeLabel(startDate)`로 "N월 N일 시작예정" 배지 라벨을 만든다(둘 다 `entities/strategy` export, `fmtMonthDay`는 ko-KR에서 "8. 1." 형식이라 이 문구엔 쓰지 않음)
- `AdminAnomalies`: 현재 필드 `pausedAccounts`, `inactiveAccounts`
- API 함수명은 `listAccounts(token?)`

## 주요 도메인별 quirk

- **account**: `accountNo`는 8자리만. `kisAccountType`은 항상 `"01"`. `AccountRequest` 필드명은 `appKey`, `secretKey`. 계좌 목록은 `accountListQueryOptions(token?)`/`useAccountsQuery()`와 `accountKeys.list()` 캐시를 SSOT로 사용한다. 생성/수정/삭제 mutation은 완전한 list cache가 있으면 직접 반영하고, list cache가 없으면 canonical list query 전체 조회를 await한다. detail은 생성/수정 시 직접 쓰고 삭제 시 detail/margin/prices를 제거한다. account-cache E2E(`tests/e2e/support/account-cache-lock.ts`)는 고정 개발 USER UUID를 key로 OS temp directory에 cross-process lock을 걸어 계좌 캐시 회귀 스펙이 다른 실행과 동시에 계좌를 조회/변경하지 않도록 격리한다
- **finance**(구 `entities/asset`, kista-api finance 스키마 재설계로 2026-08 개명): `/api/finance/*` 네임스페이스 하나를 소비한다. 리소스는 자산 스냅샷(`asset-snapshots`)·카테고리(`categories`, 4타입 CRUD)·계좌(`accounts`, CRUD)·월 마감(`monthly-closings`)·그룹(`groups`/멤버/초대)·거래내역(`transactions`)·예산(`budgets`). `AssetSnapshot.categoryId`는 `finance_categories`(그룹 소유 2계층 트리) FK — 응답의 `rootCategoryId`·`categoryName`·`accountName`을 그대로 렌더링에 쓰고 별도 이름 조회가 필요 없다. `assetClass`(`AssetClass` 6값: CASH/EQUITY/FIXED_INCOME/COMMODITY/CRYPTO/REAL_ESTATE)와 `market`(`Market` 2값: DOMESTIC/GLOBAL)은 서버가 정의한 닫힌 enum이라 `useMeta()`의 `assetClasses`/`markets`(`MetaBundle`, `labelOf('assetClasses'|'markets', code)`)로 라벨을 얻는다. 자산(ASSET) L1 카테고리 4개는 고정 UUID 시스템 시드(`f1000000-...-0401`~`0404`, 예적금/부동산/투자/대출 — `SYSTEM_INVESTMENT_CATEGORY_ID` 등 4개 상수로 export)라 구 `AssetCategory` enum과 동일한 4값 구조가 유지된다. 부채(순자산·구성비 분모) 판정은 반드시 `isLiability(snapshot)`(`rootCategoryId === SYSTEM_LOAN_CATEGORY_ID`)로 하고 문자열 비교를 반복하지 않는다. `categoryName`이 응답에 없는 집계 결과(`calcCategoryBreakdown` 등, `{category: L1 id, amount}` 형태)의 라벨은 `formatAssetL1CategoryLabel(id)`로 얻는다. `lib/aggregate.ts`가 위젯 공용 집계 함수를 전부 소유 — `calcCategoryComposition`(대출 포함)과 `calcAssetClassComposition`(대출 제외)은 범용 `calcComposition`을 위젯에서 직접 호출하지 말고 이 두 래퍼를 통해서만 쓴다. 자산 등록 폼의 카테고리 Select는 기존 카테고리(L1+L2) 선택만 가능하다 — 새 세부카테고리 생성은 `/finance` 설정 탭(`features/finance/manage-categories`)에서 한다. 단건 GET·벌크 삭제 엔드포인트가 여전히 없어 `loadAssetSnapshotById`는 전체 목록에서 find하고 `useDeleteManyAssetSnapshotsMutation`은 개별 DELETE를 `Promise.allSettled`로 병렬 호출한다. 월 마감은 `PATCH /monthly-closings/{month}`.
  - **그룹 스코프**: 모든 리소스 쿼리(`asset-snapshots`/`categories`/`accounts`/`monthly-closings`)가 활성 그룹으로 스코프된다(그룹 미지정 시 서버가 개인 그룹으로 처리). 활성 그룹은 `ActiveGroupProvider`(`app/(main)/layout.tsx`에서 `MetaProvider`와 형제로 마운트, 서버가 쿠키 `kista-active-group`에서 읽은 값을 `initialGroupId`로 주입)가 소유하고, `useActiveGroupId()`가 저장된 groupId를 `useFinanceGroupsQuery()` 결과와 대조해 더 이상 내 소속이 아니면(추방 등) 렌더 중 파생으로 `undefined`(개인 그룹) 취급한다 — `useEffect` 동기화 없음. `financeKeys`의 각 list factory는 `groupId?: string`을 받아 `groupId ?? 'personal'`로 캐시 키를 분리한다. 새 Server Component 프리페치를 추가할 때는 `getAuthToken()`과 함께 `getActiveGroupId()`(`@shared/lib/auth/activeGroup`)도 반드시 반영해야 클라이언트 초기 캐시 키와 일치해 하이드레이션이 성립한다(`app/(main)/finance/page.tsx` 참고). 그룹 전환은 `useSetActiveGroupId()` 한 줄로 쿠키 갱신+`router.refresh()`까지 끝난다(Route Handler 왕복 없음 — 비민감 UUID 포인터라 httpOnly 아님)
  - **카테고리 CRUD**: 생성 POST는 `type` 필수(누락 시 400이 아니라 오분류된 409). **PUT은 `parentId`/`type`을 서버가 무시**한다 — 이름·정렬순서만 실제 반영(카테고리 이동 불가). 삭제는 하위 트리 전체 cascade 소프트 삭제이며 참조 중인 과거 스냅샷은 그대로 유지된다(서버가 참조 검사 안 함). 시스템 카테고리(`system:true`)는 그룹 스코프 엔드포인트(`/api/finance/categories`)에서 수정·삭제 시 서버가 403. 카테고리 생성 다이얼로그(`CategoryFormDialog`/`SystemCategoryFormDialog`)는 `getCascadeLevels`로 임의 depth 계단식 부모 Select를 구성한다 — depth 제한 없음. 자산 등록 폼(`AssetForm`)의 카테고리 Select도 동일 함수를 사용해 depth 무관 렌더링. 카테고리 뮤테이션(`useCreateFinanceCategoryMutation` 등)은 다른 finance 리소스와 달리 **`invalidateQueries` 후 재조회** 방식이다(POST/PUT 응답의 `children`이 항상 `[]`로 고정돼 있어 `upsertById` 직접 캐시 쓰기가 트리를 깨뜨리기 때문)
  - **거래내역(`transactions`)·예산(`budgets`)** — 수입/소비/저축 탭(`app/(main)/finance/FinanceDashboard.tsx`)이 소비한다(2026-08). `FinanceTransactionResponse`엔 `type`/`categoryName`/`rootCategoryId`가 없다 — 한 `GET /transactions`가 세 타입을 섞어 반환하므로 `lib/categoryIndex.ts`의 `buildCategoryIndex({INCOME,EXPENSE,SAVING})`(세 트리를 한 번에 순회)로 `categoryId -> {type, rootId, name}` 인덱스를 만들고 `lib/flowAggregate.ts`의 `filterByType`로 탭을 나눈다. 삭제된 카테고리를 가리키는 거래는 이 인덱스에 없다(카테고리 삭제가 소프트 삭제라 `GET /categories`가 반환 안 함) — 그런 거래는 어느 탭 집계에도 넣지 않고 `unclassifiedTransactions()`로 별도 노출한다("분류할 수 없는 내역"). 조회 기간은 `lib/period.ts`의 `windowRange(month)`가 계산하는 **12개월 슬라이딩 윈도우 쿼리 하나**로 요약·전월대비·6개월추이·YTD누적·예산대비를 전부 클라이언트에서 잘라 쓴다(`periodRange`가 월간/연간 각각의 실제 표시 범위를 계산) — 위젯마다 따로 쿼리하지 않는다. 연간 모드의 "전년대비"는 이 12개월 윈도우로 커버되지 않는 범위(전년 1월~동일월)라 `previousYearRange(period)` 기준의 별도 쿼리를 `enabled: mode==='yearly'`로만 조건부 실행한다(`FinanceDashboard.tsx`→`FinanceSummary`). `FinanceBudgetResponse.amount`는 월 할당액이고 `calcBudgetProgress`가 YTD 모드에서 곱하는 배수는 "경과 개월 수"가 아니라 "YTD 범위 중 그 예산이 실제로 유효했던 개월 수"다(예산 시작일이 연중이면 그 이전 달은 배수에서 빠진다). 예산은 INCOME/EXPENSE/SAVING 카테고리에 걸 수 있다(ASSET 카테고리 예산 등록만 kista-api가 400) — 세 타입 모두 대상이라 `features/finance/manage-budgets/BudgetManager`는 세그먼트 없이 호출부(`BudgetManagerDialog`)가 넘긴 고정 `type` prop 하나로 동작한다. 거래·예산 뮤테이션은 캐시 키에 조회 범위(from/to)가 섞여 있어 카테고리와 동일하게 `invalidateQueries(financeKeys.transactionsRoot()|budgetsRoot())` 방식이다(월 스코프 캐시에 saved 항목을 직접 upsert하려면 "어느 윈도우 캐시에 속하는지" 판정이 필요해 더 복잡하다)
  - **관리자 시스템 카테고리 CRUD**: `/api/admin/finance/categories`(GET/POST/PUT/DELETE)는 같은 `FinanceCategoryResponse`/`FinanceCategoryRequest` 형태를 재사용하지만 `groupId=null`·`system:true`로 고정된 공통 카테고리를 관리한다. `listSystemFinanceCategories`/`createSystemFinanceCategory`/`updateSystemFinanceCategory`/`deleteSystemFinanceCategory`(`entities/finance/api`)와 `useSystemFinanceCategoriesQuery`/`useCreateSystemFinanceCategoryMutation`/`useUpdateSystemFinanceCategoryMutation`/`useDeleteSystemFinanceCategoryMutation` 훅이 그룹 스코프 카테고리 함수·훅과 완전히 분리돼 있다. 캐시도 `financeKeys.systemCategoriesRoot()`/`systemCategories(type)`로 별도 네임스페이스라 그룹 스코프 `categoriesRoot()`를 침범하지 않는다. groupId가 없어 `useActiveGroupId()`를 구독하지 않는다(구독 시 admin 전용 화면에서 불필요하게 `/api/finance/groups`가 호출됨)
  - **계좌 CRUD**: flat 목록이라 기존 `upsertById`/`synchronizeListQueries` 하우스 패턴 그대로. 응답 `accountNo`는 서버가 복호화한 평문(마스킹 없음) — 목록 UI에서 뒷자리만 노출하는 건 UI 책임
  - **그룹**: 생성/삭제/이름수정 API가 없다 — 공유 그룹은 개인 그룹에서 초대 코드 발급(`useCreateFinanceGroupInvitationMutation`, OWNER 전용) → 수락(`useRespondToInvitationMutation`)으로만 생긴다. 초대 코드는 발급 응답에서 한 번만 내려오고 재조회 불가. 멤버 응답(`FinanceGroupMember`)엔 `userId`/`role`만 있고 닉네임이 없어 `nickname ?? userId.slice(0,8)` 폴백이 최종 형태다. `useRemoveFinanceGroupMemberMutation(groupId)`은 탈퇴/추방 겸용(variables=대상 userId, 본인 또는 OWNER만 가능) — 개인 그룹 탈퇴는 서버가 409
- **strategy**: 백엔드 이름은 `TradingCycle`. pause/resume은 strategyId 기준. capability는 `StrategyTypeMeta` 필드를 직접 소비하고, 최소 시드는 `useStrategySeedPreviewQuery`를 사용한다. `seedBadgeClass()`를 재사용한다
- **meta**: `MetaProvider`는 `(main)/layout.tsx`에서만 제공 — `(main)` 밖에서 `useMeta()` 호출 불가. Client는 `useMeta()`의 `findStrategyType(code)`/`findTicker(code)`/`labelOf(category, code)` 사용. `TickerMeta.targetProfitRate`는 `string` 타입. `MetaBundle`은 `strategyTypes`/`tickers`/`brokers`/`strategyStatuses`/`cycleSeedTypes`에 더해 `assetClasses`/`markets`/`financeAccountTypes`/`financeCategoryTypes`(전부 `EnumMeta[]`)를 포함한다 — finance 스키마 재설계(2026-08)로 kista-api `MetaController`가 추가한 필드, `labelOf('assetClasses'|'markets', code)`로 소비
- **runtime-config**: `useRuntimeConfigQuery()`는 `cache: 'no-store'`, `staleTime: 0`, window focus refetch로 서버 설정을 최신화한다. 신규 계좌는 활성 증권사만, 신규 전략은 활성 타입과 각 필드의 `allowedValues`/`defaultValue`/`customizable`을 사용한다. ETF 벤치마크는 `benchmarks.etf.allowedValues/defaultValue`를 사용하고 서버 값이 없으면 `DEFAULT_RUNTIME_BENCHMARKS`로 보정한다. 수정 화면의 기존 값은 런타임 허용 목록으로 덮어쓰지 않는다. 자산 등록 폼의 운용전략 추천 목록(`assetFormOptions`)은 2026-08 admin 전역 런타임 설정에서 유저별 설정으로 이관돼 `RuntimeConfig`에서 삭제됐다 — `entities/user`의 `User.strategySuggestions` 참고
- **admin-settings**: `GET/PUT /api/admin/settings`는 관리자 프록시를 사용한다. 저장은 optimistic update 없이 처리하고 성공 후 `admin-settings`와 `runtime-config`를 모두 무효화한다
- **trade/providers**: `TradeNotificationProvider`는 SSE `/api/trades/stream` 구독용
- **privacy**: 관리자 전용 — Server Component에서 apiFetch로 `/api/admin/privacy-trade-bases` 직접 호출 (Route Handler 없음)
- **fcm**: `registerTokenToServer`는 `clientFetch<void>` 사용 (토큰 해제 API는 클라이언트 미구현 — `app/api/fcm/tokens/[token]` DELETE 라우트만 존재)
- **stats**: `GET /api/stats/summary|equity-curve|cycles` 소비. `equity-curve`와 `cycles`는 선택 전략 타입 필터(`type=INFINITE|PRIVACY|VR`)를 공유하고, `summary`는 전략 유형 비교 목적상 항상 전체 집계를 사용한다. `byType[].winRate`/`avgReturnRate`/`avgDurationDays`와 `CyclePerformance`의 `pnl`/`returnRate`/`durationDays`/`endDate`/`endAmount`는 미종료 사이클에서 `null` 가능 — 렌더링 시 null 가드 필수. `getStatsCycles`의 `nextCursor`는 없으면 응답에서 필드 자체가 생략되므로 옵셔널 처리
- **stats 서버 TTL**: `summary`/`equity-curve`/`housing-benchmark`는 kista-api가 사용자 단위 서버 사이드 5-10분 TTL 캐시(`StatsResultCache`)를 두며 mutation으로 busting되지 않는다. `statsKeys.all` invalidate 직후 refetch해도 서버가 그 TTL만큼 이전 값을 반환할 수 있다 — React Query 캐시 문제로 오진하지 않는다

## KIS live API quirk

- **OVRS_EXCG_CD**: 거래소 코드는 `ticker.exchangeCode()` 사용
- **TTTC2101R 외화증거금**: `itgr_ord_psbl_amt`(통합주문가능금액) 사용 — 원화 자동 환전 포함. `frcr_dncl_amt_2`(환전 외화만) 사용 금지
- **`getPrices` 쿼리 직렬화**: 반복 파라미터만 허용
- **MultiPriceResponse**: 응답 `{ prices: [{ticker, price}] }`를 `PriceMap`으로 정규화해야 함
- **통화 주의**: `positions[].evalAmountUsd`는 USD, `summary.totalAssetUsd`/`totalEvalProfit`은 KRW
- **StatisticsController 응답 형식**: 신규 엔드포인트 추가 시 필드명 대조 필수

## OpenAPI 타입 생성

`shared/lib/api-types.ts`는 `openapi.json`에서 자동 생성된 타입 파일이다. 직접 수정하지 않는다.

```bash
npm run gen:types
```

새 enum 타입이 필요하면 `openapi.json` → `api-types.ts` → `api-schema.ts` 순으로 추가한다.

## API 날짜 파라미터

- `getAccountCycleHistory`: `{ from?, to? }`
- `getStrategyCycleHistory`: `{}` 전달 시 서버 기본값 `30d`
- `getDailyTransactionsBatch({from, to}, token?)` — 유저 스코프 배치 조회, 보유 계좌 전체를 계좌 구분 없이 합쳐 1회 요청으로 반환 (`GET /api/daily-trades`)
- `GET /api/trades`: `id, tradeDate, ticker, orderType, direction, quantity, price, status, kisOrderId`
