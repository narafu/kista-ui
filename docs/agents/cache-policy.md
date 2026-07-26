# UI 캐시 정책

이 문서는 UI 캐시 소유권의 SSOT다. `app/`, `entities/`, `features/`, `widgets/`, `shared/`의 캐시 관련 설명이 충돌하면 이 문서를 따른다.

## 핵심 원칙

- 가변 인증 데이터의 클라이언트 SSOT는 React Query다. Next.js Router Cache나 persistent Data Cache가 목록/빈 상태를 결정하면 안 된다.
- Server Component는 요청별 `QueryClient`에 prefetch한 뒤 `dehydrate()`하고, Client Component는 같은 query key를 읽는다.
- 직접 변경된 데이터는 mutation 성공 시 `setQueryData`로 먼저 반영한다. 계산 결과처럼 응답만으로 확정할 수 없는 데이터만 key family 단위로 무효화한다.
- mutation이 이동을 수반하면 직접 캐시 쓰기와 반드시 끝나야 하는 무효화를 완료한 뒤 feature가 이동한다.
- 전체 `QueryClient`를 비우거나 raw key literal로 넓게 삭제하지 않는다.
- 서버 조회 오류를 성공한 빈 목록으로 변환하지 않는다. HTTP 404가 도메인상 빈 컬렉션인 경우만 예외다.

## 캐시 소유권

| 데이터 분류 | 예시 | 소유자 | 신선도 | mutation 정책 |
|---|---|---|---|---|
| 가변 identity/list | accounts, strategies, me | React Query | 30-60초 | 직접 데이터 `setQueryData`, 파생 데이터 invalidate |
| 인터랙티브 파생 | order preview, stats | React Query | 30-60초 | key family 단위 invalidate |
| 이력 | orders, trades, cycle history | React Query | 1-5분 | 영향을 주는 mutation에서만 invalidate |
| 라이브 | prices, portfolio, execution state | React Query/SSE | `staleTime: 0` 또는 stream-driven | targeted update/refetch |
| 런타임 설정 | runtime-config, admin-settings | React Query | `staleTime: 0`, 필요 시 focus refetch | public/admin view 모두 invalidate |
| market holidays | React Query(visible state) + 서버 initial snapshot | hydration 24시간, 미주입 0 | `marketKeys.holidays` refetch; persistent Data Cache 없음 |
| public meta fallback | Next.js Data Cache + `MetaProvider` snapshot | 1시간 | TTL 만료 후 다음 요청에서 갱신 |
| 기타 느린 public reference | 도입 시 Next.js Data Cache 허용 | 1-24시간 | 명시적 tag revalidation 또는 TTL |

구현 위치:

- 공통 QueryClient 기본값: `shared/lib/query/createQueryClient.ts`
- query key factory: `entities/*/model/queryKeys.ts`
- 서버/클라이언트 공용 query options: `entities/*/model/queryOptions.ts`
- 계좌 SSR hydration: `app/(main)/dashboard/page.tsx`, `app/(main)/accounts/page.tsx`
- 계좌 query-owned 분기: `widgets/dashboard/DashboardContent.tsx`, `widgets/accounts-grid/AccountsPageContent.tsx`
- 휴장일 visible query: `entities/market/hooks/useMarketQueries.ts`
- 캐시 아키텍처 정적 가드: `shared/lib/query/cacheArchitecture.test.ts`

## Query Key Factory

- query hook, mutation effect, prefetch, invalidate, remove 모두 slice가 export한 factory를 사용한다. `queryKey: ['accounts']` 같은 raw literal은 금지한다.
- list/detail/live key는 하나의 resource root 아래에 둔다. 삭제 시 list에서 항목을 제거하고 해당 identifier의 detail/live key를 제거할 수 있어야 한다.
- 배열형 인자는 factory 내부에서 복사하고 정렬해 호출 순서가 같은 리소스에 중복 캐시를 만들지 않게 한다.
- Server Component가 호출할 query options는 `'use client'` 파일에 두지 않는다. `model/queryOptions.ts`처럼 서버에서 import 가능한 모듈로 분리한다.

## SSR Prefetch와 Hydration

가변 목록을 Server Component prop의 `initialData`로 연결하지 않는다. 요청별 prefetch timestamp를 보존하는 `dehydrate()`를 사용한다.

```tsx
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { accountListQueryOptions } from '@entities/account'
import { createQueryClient } from '@shared/lib/query'

export default async function AccountsPage() {
  const token = await getAuthToken()
  const queryClient = createQueryClient()

  if (token) {
    await queryClient.prefetchQuery(accountListQueryOptions(token))
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AccountsPageContent />
    </HydrationBoundary>
  )
}
```

`initialDataUpdatedAt: 0`은 금지한다. 이는 정상 prefetch timestamp를 버리고 즉시 stale 처리해 hydration 목적을 훼손한다. 제한적으로 `initialData`가 필요한 참조/스냅샷 query는 실제 취득 시각을 사용하되, 가변 목록은 hydration으로 이전한다.

## Mutation 동기화

API 응답으로 확정되는 직접 데이터는 이미 완전한 list cache가 있을 때 동기적으로 쓴다. list cache가 없으면 mutation 응답 한 건으로 list를 만들지 말고 canonical list query를 await해 전체 목록을 materialize한 뒤 feature callback을 실행한다.

```ts
onSuccess: async (saved) => {
  queryClient.setQueryData(accountKeys.detail(saved.id), saved)
  const accounts = queryClient.getQueryData<Account[]>(accountKeys.list())
  if (accounts !== undefined) {
    queryClient.setQueryData(accountKeys.list(), upsertAccount(accounts, saved))
  } else {
    await queryClient.fetchQuery(accountListQueryOptions())
  }
}
```

삭제는 root를 광범위하게 지우지 않고 list와 삭제 identifier의 key만 정리한다. 삭제 시에도 absent list를 `[]`로 만들지 않는다.

```ts
queryClient.removeQueries({ queryKey: accountKeys.detail(accountId) })
queryClient.removeQueries({ queryKey: accountKeys.margin(accountId) })
queryClient.removeQueries({ queryKey: accountKeys.pricesRoot(accountId) })
const accounts = queryClient.getQueryData<Account[]>(accountKeys.list())
if (accounts !== undefined) {
  queryClient.setQueryData(
    accountKeys.list(),
    accounts.filter((account) => account.id !== accountId),
  )
} else {
  await queryClient.fetchQuery(accountListQueryOptions())
}
```

`undefined -> [saved]`, `undefined -> []`, 존재하지 않는 query에 대한 invalidate만으로 성공 처리를 끝내는 패턴은 partial/empty authoritative cache를 만들거나 목적지에 durable state를 남기지 못하므로 금지한다.

mutation 응답만으로 계산할 수 없는 파생 데이터는 factory root로 무효화한다. 이동 전에 완료되어야 하면 반드시 await한다.

```ts
await Promise.all([
  queryClient.invalidateQueries({ queryKey: strategyKeys.all }),
  queryClient.invalidateQueries({ queryKey: statsKeys.all }),
  queryClient.invalidateQueries({ queryKey: orderKeys.all }),
  queryClient.invalidateQueries({ queryKey: tradeKeys.all }),
])
router.push('/accounts')
```

## Feature 소유 이동

- entity mutation hook은 API 호출과 자기 도메인의 캐시 동기화만 담당한다.
- 성공 toast, 다른 도메인 invalidation, `router.push()`/`router.back()`은 사용자 시나리오를 아는 feature 또는 widget이 담당한다.
- entity의 `onSuccess` 캐시 쓰기는 호출부의 mutation callback보다 먼저 실행된다. 추가 invalidation promise가 이동 전 완료되어야 하면 feature callback을 `async`로 만들고 await한다.
- 캐시 동기화 대신 `router.refresh()`를 호출한 뒤 이동하는 패턴은 금지한다. refresh는 현재 route를 갱신할 뿐 목적지 Router Cache의 가변 상태를 보장하지 않는다.

## `router.refresh()` 허용 범위

일반 query mutation의 성공 처리에는 사용하지 않는다. 현재 허용되는 예외는 다음 두 가지다.

- `widgets/pull-to-refresh/PullToRefresh.tsx`: 사용자가 명시적으로 요청한 화면 전체 재동기화다. 특정 mutation의 누락된 캐시 처리를 가리는 수단이 아니라 모바일의 수동 recovery 동작이므로 허용한다.
- `entities/trade/providers/TradeNotificationProvider.tsx`: SSE `trade` 이벤트는 알림 중심 payload이며 영향을 받는 서버 렌더 집계 전체를 아직 식별할 수 없다. 외부에서 발생한 체결 뒤 toast와 서버 화면을 재동기화하기 위한 provider-level refresh를 유지한다. 이벤트 payload가 account/strategy/order/trade key를 완전히 특정하게 되면 targeted `setQueryData`/invalidate로 대체한다.

새 예외는 이 문서에 목적과 종료 조건을 먼저 기록해야 한다.

## Next.js Persistent Cache

- mutable authenticated resource(`accounts`, `strategies`, `me`, admin data, orders, trades, stats)는 `unstable_cache`, `'use cache'`, `cacheTag` 대상이 아니다.
- 허용 대상은 사용자별 즉시 일관성이 필요하지 않은 느리게 변하는 reference/public 데이터뿐이다. TTL(1-24시간), key 입력, tag, 오류 의미를 명시한다.
- 현재 persistent Next Data Cache 적용은 비인증 `getMetaBundle()`의 public fallback(`revalidate: 3600`)뿐이다. market holidays는 persistent cache directive가 없고, 화면 상태는 `marketKeys.holidays(year, month)` React Query가 소유한다.
- `unstable_cache`는 Next.js 16에서 `'use cache'`로 대체된 legacy API다. 기존 wrapper를 유지할 때만 사용하고 신규 코드는 Cache Components 도입 여부를 먼저 검토한다.
- `cacheTag()`는 `cacheComponents: true`와 `'use cache'` scope가 모두 있을 때만 사용한다. 현재 설정에 Cache Components가 없다면 도입하지 않는다.
- `revalidateTag(tag, 'max')`는 Next persistent cache만 stale 처리한다. React Query나 client Router Cache 동기화로 간주하지 않는다.
- migration 중 두 캐시가 일시 공존할 수는 있지만, visible list/empty state를 결정하는 소유자는 하나여야 한다. runtime consumer가 모두 hydrated React Query로 이동하기 전에 wrapper를 삭제하지 않는다.

## Stale Time

| 리소스 | `staleTime` | 근거 |
|---|---:|---|
| 공통 기본값, accounts, strategies | 30초 | 화면 재진입 재사용과 mutation 직접 동기화의 균형 |
| me, order preview/history, stats | 60초 | 자주 읽지만 mutation에서 명시적으로 무효화 |
| trade/cycle history, daily trades | 5분 | 과거 이력 중심 |
| margin, prices, portfolio/execution | 0 또는 stream-driven | 거래 판단에 쓰는 라이브 값 |
| runtime-config, admin-settings | 0 | 운영 설정 변경 즉시 반영, 필요 시 focus refetch |
| market holidays | hydration 데이터 24시간, 미주입 0 | 월 단위 참조 데이터, 실패를 장기 빈 값으로 캐시하지 않음 |
| candles | 10분 | 차트 조회 비용과 최신성 균형 |
| fear/greed | 6시간 | 원본 갱신 주기의 절반 |
| housing regions | 1시간 | 저빈도 참조 목록 |
| Next reference cache | 1-24시간 | 데이터별 TTL/tag 필수 |

기본값을 바꿀 때는 `shared/lib/query/createQueryClient.ts`와 테스트를 함께 수정한다. 개별 override는 데이터 성격을 설명하는 주석 또는 테스트가 있어야 한다.

## 새 Query 체크리스트

- [ ] 소유 resource와 data class를 위 표에서 정했다.
- [ ] `entities/{slice}/model/queryKeys.ts` factory를 사용하고 인자를 안정적으로 직렬화했다.
- [ ] Server Component가 공유하면 server-safe `model/queryOptions.ts`를 만들었다.
- [ ] mutable SSR 데이터는 요청별 prefetch + `dehydrate()`로 전달했다.
- [ ] 로딩/오류/빈 상태가 Client Component의 query data로 결정된다.
- [ ] 실제 freshness에 맞는 stale time을 선택했다.
- [ ] 서버 오류를 성공한 빈 데이터로 바꾸지 않았다.

## 새 Mutation 체크리스트

- [ ] 직접 변경된 list/detail을 `setQueryData`로 먼저 반영했다.
- [ ] 삭제 identifier의 detail/live key를 제거했다.
- [ ] 파생 데이터만 factory key family로 invalidate했다.
- [ ] unrelated cache나 전체 QueryClient를 지우지 않았다.
- [ ] cross-domain invalidation과 navigation은 feature/widget이 소유한다.
- [ ] 이동 전에 필요한 promise를 await했다.
- [ ] routine `router.refresh()` 없이 정상 client navigation 회귀 테스트를 추가했다.

## 검증

```bash
npm run test:run
npm run typecheck
npm run build
npm run doctor
npm run test:e2e -- tests/e2e/account-cache-consistency.spec.ts
```

계좌 E2E는 로컬 `kista-api`의 `local` profile, `POST /api/auth/dev-token`, MOCK broker를 사용한다. 실제 KIS 자격증명은 필요하지 않다. Playwright는 기본 `E2E_PORT=3100`, `E2E_API_BASE=http://localhost:8080`을 사용한다.

`DevAuthController`가 별도 사용자 생성을 지원하지 않아 account-cache storage state도 고정 개발 USER UUID `00000000-0000-0000-0000-000000000001`을 사용한다. 소유권과 격리 계약은 다음과 같다.

- setup은 account-cache 전용 토큰을 `e2e/.auth/account-cache.json`에 기록한다. 토큰 파일은 분리되지만 backend identity는 기존 USER storage state와 같다.
- Playwright 프로젝트 의존성은 `setup -> account-cache -> chromium`이다. account-cache 스펙은 serial로 실행되며 기존 USER 스위트와 동시에 실행되지 않는다.
- account-cache project의 `beforeAll`은 정규화된 loopback `E2E_API_BASE`와 고정 USER UUID를 key로 OS temp directory에 atomic-create cross-process lock을 획득하고 두 serial scenario가 끝날 때까지 유지한다. live PID lock이 있으면 계좌를 조회/변경하지 않고 실패한다.
- dead PID나 읽을 수 없는 lock은 자동 탈취하지 않는다. 실행 중인 suite가 없음을 확인한 뒤 오류에 표시된 lock file을 수동 삭제해야 한다. 정상 teardown은 owner token을 재검증한 뒤 lock을 해제한다.
- 테스트 계좌 nickname은 진단 편의를 위해 `e2e-account-cache-` prefix를 사용하지만 소유권 근거로 사용하지 않는다. 이전 실행의 같은 prefix 계좌도 unowned account다.
- 첫 scenario 전에 account 목록이 하나라도 있으면 수동 정리 안내와 함께 무삭제 실패한다. 어떤 계좌도 이름이나 prefix로 채택하거나 삭제하지 않는다.
- API/UI create 응답에서 현재 run이 기록한 account ID만 cleanup 대상이다. 모든 DELETE 직전에 lock 보유, loopback API origin, `/api/auth/me` 고정 UUID, 전체 account 목록에 unrecorded ID가 없는지를 순서대로 확인한다.
- 두 회귀는 initial `page.goto()` 뒤 main-frame document request를 기록하고 window sentinel 생존을 검사한다. 목적지 URL/heading/content도 함께 검증하므로 full document reload로 Router Cache 문제를 숨길 수 없다.
