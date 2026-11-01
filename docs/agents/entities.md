# entities/ — 도메인 모델 · API 함수 · React Query 훅

FSD 계층에서 가장 저수준 도메인 레이어. `shared/`만 import 가능. 동일 계층 cross-import 금지.
router.refresh() 허용 범위와 stale time 표는 `docs/agents/shared.md`를 따른다.

- **가계부(finance) 작업 시 docs/agents/finance.md 필수 Read** (화면은 finance-widgets.md, 폼·뮤테이션은 finance-features.md) — 관련: `entities/finance`, `financeKeys`, `useFinanceQueries`, `isMonthClosed`, `useMonthlyClosingScopeGroupId`, `FinanceTransactionResponse`, `FinanceCategoryResponse`, `FinanceGroupMember`, `useShareFinanceTransactionMutation`
- **전략·DCA·크립토·브로커 분기 작업 시 docs/agents/strategy.md 필수 Read** — 관련: `TradingCycleResponse`, `normalizeStrategy`, `StrategyRequest`, `isScheduledStart`, `DCA rules[]`, `isCryptoBroker`, `cryptoPortfolioQueryOptions`, `cryptoPricesQueryOptions`, `useStrategySeedPreviewQuery`

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

- **가변 SSR 데이터**: 요청별 QueryClient에서 prefetch/dehydrate한다. Server Component prop을 query의 canonical `initialData`로 사용하지 않는다
- **삭제 후 캐시 정리**: list는 `setQueryData`로 항목을 제거하고 삭제 identifier의 detail/live key만 `removeQueries`한다. `removeQueries({ queryKey: accountKeys.all })` 같은 broad root 삭제는 금지한다
- **partial/empty authoritative cache 생성 금지**: list cache가 없는 상태에서 mutation 응답 한 건만으로 `undefined -> [saved]`나 `undefined -> []`를 만들지 않는다. list cache가 absent면 canonical list query를 `fetchQuery`로 await해 전체 목록을 materialize한다 (`account` quirk의 생성/삭제 패턴 참고)
- Query 훅: `useXxxQuery` — key factory의 `queryKey`, `queryFn`, 데이터 성격에 맞는 `staleTime`
- Server/Client 공유 옵션: server-safe `model/queryOptions.ts`의 `xxxQueryOptions(token?)` — Server Component는 token으로 `prefetchQuery`, Client Component는 token 없이 `useQuery`에서 재사용
- Mutation 훅: `useXxxMutation` — 엔티티 훅은 API 호출과 도메인 캐시 동기화를 캡슐화하고 `onError`에 `toast.error`를 둔다. 성공 toast, 라우팅, 다른 도메인 무효화는 호출 feature의 `mutate(data, { onSuccess })`에서 처리한다. 호출부에서 `onError`를 다시 덮어쓰지 않는다(토스트 중복) — `docs/agents/copy.md` 참고
- 호출부에서 추가 동작이 필요하면 `mutation.mutate(data, { onSuccess: () => callback() })` 패턴 사용
- **참조 데이터 24h staleTime**: `market/model/queryOptions.ts`의 `monthlyHolidaysQueryOptions(year, month)` — `staleTime: 24h`, queryFn이 `typeof window`로 서버/클라이언트를 분기해 서버 → public 엔드포인트(로그인 여부와 무관하게 토큰 없이 — 만료 AT를 붙이면 permitAll 경로에서도 401), 브라우저 → Route Handler 경유 클라이언트 fetch를 고른다. `useMonthlyHolidaysQuery(year, month)`는 이 factory를 그대로 소비한다. `app/(main)/dashboard/page.tsx`가 `queryClient.prefetchQuery(monthlyHolidaysQueryOptions(...)).catch(() => undefined)`로 SSR prefetch하며, react-query 기본 `shouldDehydrateQuery`가 `status:'success'` 쿼리만 직렬화하므로 실패한 서버 조회는 dehydrate에 포함되지 않고 클라이언트가 즉시 재조회한다 — "실패한 조회를 빈 달로 24시간 hydrate 금지" 시맨틱은 이 방식으로 보존된다

**queryKey**: 각 entity의 `model/queryKeys.ts` factory가 SSOT다. 서로 다른 위젯이 동일 서버 데이터를 소비하면 같은 factory와 파라미터를 사용해 React Query 캐시를 공유한다. 배열형 인자(예: id 목록)를 받는 factory는 내부에서 복사·정렬해 키에 포함한다(`accountKeys.prices`, `tradeKeys.dailyRange` 참고) — 순서만 다른 동일 배열이 서로 다른 캐시 항목으로 분리되는 것을 방지

**서버 조회 실패를 빈 목록으로 위장 금지**: fetch/파싱 오류를 성공한 빈 배열·빈 객체로 변환해 반환하지 않는다(404가 도메인상 실제 빈 컬렉션을 의미하는 경우는 예외). 오류를 삼키면 위 `shouldDehydrateQuery` 방어가 무력화되어 실패가 "데이터 없음"으로 영구 캐시될 수 있다

## index.ts 규칙

각 슬라이스 최상단 `index.ts`가 public API. 외부에서 내부 파일 직접 import 금지.

```ts
import { useDeleteAccountMutation } from '@entities/account'
```

## 주요 도메인별 quirk

- **account**: `accountNo`는 8자리만. 계좌 목록은 `accountListQueryOptions(token?)`/`useAccountsQuery()`와 `accountKeys.list()` 캐시를 SSOT로 사용한다. 생성/수정/삭제 mutation은 완전한 list cache가 있으면 직접 반영하고, list cache가 없으면 canonical list query 전체 조회를 await한다. detail은 생성/수정 시 직접 쓰고 삭제 시 detail/prices를 제거한다. account-cache E2E(`tests/e2e/support/account-cache-lock.ts`)는 고정 개발 USER UUID를 key로 OS temp directory에 cross-process lock을 걸어 계좌 캐시 회귀 스펙이 다른 실행과 동시에 계좌를 조회/변경하지 않도록 격리한다
- **meta**: `MetaProvider`는 `(main)/layout.tsx`에서만 제공 — `(main)` 밖에서 `useMeta()` 호출 불가. Client는 `useMeta()`의 `findStrategyType(code)`/`findTicker(code)`/`labelOf(category, code)` 사용. `TickerMeta.targetProfitRate`는 `string` 타입. `MetaBundle`은 `strategyTypes`/`tickers`/`brokers`/`strategyStatuses`/`cycleSeedTypes`에 더해 `assetClasses`/`markets`/`financeAccountTypes`/`financeCategoryTypes`(전부 `EnumMeta[]`)를 포함한다 — `labelOf('assetClasses'|'markets', code)`로 소비
- **runtime-config**: `useRuntimeConfigQuery()`는 `cache: 'no-store'`, `staleTime: 0`, window focus refetch로 서버 설정을 최신화한다. 신규 계좌는 활성 증권사만, 신규 전략은 활성 타입과 각 필드의 `allowedValues`/`defaultValue`/`customizable`을 사용한다. ETF 벤치마크는 `benchmarks.etf.allowedValues/defaultValue`를 사용하고 서버 값이 없으면 `DEFAULT_RUNTIME_BENCHMARKS`로 보정한다. 수정 화면의 기존 값은 런타임 허용 목록으로 덮어쓰지 않는다. 자산 등록 폼의 운용전략 추천 목록은 `RuntimeConfig`가 아니라 유저별 설정이다 — `entities/user`의 `User.strategySuggestions` 참고
- **admin-settings**: `GET/PUT /api/admin/settings`는 관리자 프록시를 사용한다. 저장은 optimistic update 없이 처리하고 성공 후 `admin-settings`와 `runtime-config`를 모두 무효화한다
- **trade/providers**: `TradeNotificationProvider`는 SSE `/api/trades/stream` 구독용 — 타 도메인 캐시 무효화는 `onTrade` 콜백으로 주입받는다(`widgets/layout/TradeNotificationBridge`)
- **privacy**: 관리자 전용 — Server Component에서 apiFetch로 `/api/admin/privacy-trade-bases` 직접 호출 (Route Handler 없음)
- **fcm**: `registerTokenToServer`는 `clientFetch<void>` 사용 (토큰 해제 API는 클라이언트 미구현 — `app/api/fcm/tokens/[token]` DELETE 라우트만 존재)
- **stats**: `GET /api/stats/summary|equity-curve|cycles` 소비. `equity-curve`와 `cycles`는 선택 전략 타입 필터(`type=INFINITE|PRIVACY|VR`)를 공유하고, `summary`는 전략 유형 비교 목적상 항상 전체 집계를 사용한다. `cycles`는 추가로 `accountId`·`ticker`(서버 `StrategyTicker` enum — 잘못된 값은 400)·`status`(`ACTIVE|CLOSED`, 생략 시 전체) 필터를 받으며(`StatsCyclesFilters`, 전부 AND), 서버가 필터 후 번호 페이지네이션한다(`page` 0-based, 응답 `page`/`totalElements`/`totalPages`, 범위 밖 page는 빈 `items`). 이 엔드포인트 타입은 `api-types.ts` 생성물이 아니라 `model/types.ts` 수기 정의다. `byType[].winRate`/`avgReturnRate`/`avgDurationDays`와 `CyclePerformance`의 `pnl`/`returnRate`/`durationDays`/`endDate`/`endAmount`는 미종료 사이클에서 `null` 가능 — 렌더링 시 null 가드 필수.
- **stats 서버 TTL**: `summary`/`equity-curve`/`housing-benchmark`는 kista-api가 사용자 단위 서버 사이드 5-10분 TTL 캐시(`TtlResultCache`)를 둔다. 체결 시에는 kista-api가 그 사용자 키를 비운다(summary·equity-curve는 SSE 발행 전에, benchmark는 Redis `trade.event` 별도 구독으로). 그 외 mutation으로는 비워지지 않아 `statsKeys.all` invalidate 직후 refetch해도 서버가 그 TTL만큼 이전 값을 반환할 수 있다 — React Query 캐시 문제로 오진하지 않는다

## KIS live API quirk

- **필드명 대조**: KIS live 응답은 UI 타입과 필드명이 다를 수 있다 — 새 엔드포인트를 소비할 때 실제 응답과 필드명을 대조하고, 불일치는 `entities/*/api`의 normalizer에서 변환한다
- **`getPrices` 쿼리 직렬화**: 반복 파라미터만 허용
- **MultiPriceResponse**: 응답 `{ prices: [{ticker, price}] }`를 `PriceMap`으로 정규화해야 함
- **통화 주의**: `positions[].evalAmountUsd`는 USD, `summary.totalAssetUsd`/`totalEvalProfit`은 KRW

## API 날짜 파라미터

- `getStrategyCycleHistory`: `{}` 전달 시 서버 기본값 `30d`
