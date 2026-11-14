# 02. 데이터 층 — 경로가 곧 키다. api 함수·queryKeys·queryOptions·얇은 hook을 없앤다

> **실행 세션은 먼저 맨 끝의 "실행 전 보정" 절과 `00-roadmap.md` 4절(공통 규칙)을 읽는다.** 본문과 다르면 그쪽이 우선한다. (2026-11-14)

근거 측정: `findings/a-vertical-trace.md` 종합 2·3번, `findings/c-parallel-structures.md` 1~3절, `findings/d-single-use-abstractions.md` 6절.

## 현재 구조와 문제

GET 하나를 화면에 붙이려고 파일 5~6개를 건드린다. 계좌 목록 예:

| 파일 | 줄 | 하는 일 |
|---|---|---|
| `entities/account/api/index.ts:16-18` | 3 | `fetchEither<Account[]>('/api/accounts', undefined, token)` |
| `entities/account/model/queryKeys.ts:3-4` | 2 | `['accounts','list']` |
| `entities/account/model/queryOptions.ts:8-13` | 6 | 위 둘을 묶는다 |
| `entities/account/hooks/useAccountQueries.ts:8-16` | 9 | `useQuery(위 옵션)` |
| `entities/account/index.ts:4-13` | 10 | 재수출 |
| `entities/account/model/types.ts` | — | 타입(01 지침서) |

전체 규모(테스트 제외):

- api 함수 130개 / 16파일 1,307줄. 본문이 `return fetchEither(...)` 한 문장인 것이 화면당 10~22개다(가계부는 42개 중 22개).
- `queryKeys.ts` + `queryOptions.ts` 21파일 487줄, 그 테스트 10파일 427줄. 키 팩토리가 10줄이면 테스트가 16줄 붙는다(`entities/account/model/queryKeys.ts` 대 `queryKeys.test.ts`).
- hooks 23파일 1,912줄. `return useQuery(xxxQueryOptions(...))` 한 줄짜리 hook이 17개, `use*Mutation`이 73개다.
- mutation의 대부분은 세 인자만 다르다. `useInvalidateFinanceMutation`(`entities/finance/hooks/useFinanceMutations.ts:260-271`)을 28곳이 `mutationFn / rootKey / 실패 문구`만 바꿔 부른다. `onError: (err) => toast.error(apiMsg(err, '…'))`가 28회 반복된다.
- `token?: string` 인자를 가진 api 함수가 87개다. 서버 컴포넌트가 받은 토큰을 page → queryOptions → api 함수로 손으로 넘긴다.
- 같은 요청이 세 경로로 나간다.
  - 서버 직결: `apiFetch`(`shared/lib/api-client/index.ts:121-140`)
  - 브라우저: `clientFetch`(`:93-106`) → Route Handler → `createProxyRoute`
  - 공개 엔드포인트: api 함수 안에서 `fetch`를 직접 부르고 `typeof window`로 가른다(`entities/market/api/index.ts:8-20`, `entities/market/model/queryOptions.ts:17-18`). 에러 파싱이 `parseApiResponse`와 중복이다.
- 어느 프로세스(8080 / 8081)로 보낼지 정하는 표가 두 군데다: `api-client/index.ts:6-13`의 `TRADING_PREFIXES`와 `app/api/*/route.ts` 13개 각각의 `target`. 주석이 "동일 기준"이라고만 묶고 있다.
- 서버에서 가져온 값을 hydration 캐시와 `initial*` props로 두 번 넘기고 클라이언트에서 합친다: `widgets/account-detail/AccountDetailContent.tsx:24-25`의 `data === undefined ? initialAccount : data`, `widgets/strategy-detail/StrategyDetailContent.tsx:28-31`, `features/strategy/create-strategy/StrategyFormPage.tsx:26`.

이 층의 코드는 대부분 URL과 타입을 다른 이름으로 다시 부르는 일이다. URL은 이미 OpenAPI 스펙에 있다.

## 목표 구조

**OpenAPI 경로를 그대로 쿼리의 이름으로 쓴다.** 타입이 붙은 클라이언트 하나가 요청·키·옵션을 만든다.

```ts
// shared/api/client.ts — fetch 한 곳
export const api = createFetchClient<paths>({ fetch: kistaFetch })   // openapi-fetch
export const $api = createQueryClient(api)                           // openapi-react-query

// 서버 컴포넌트
await queryClient.prefetchQuery($api.queryOptions('get', '/api/accounts'))

// 클라이언트 컴포넌트
const { data } = $api.useQuery('get', '/api/accounts/{id}/trading-cycles', { params: { path: { id } } })

// mutation
const save = $api.useMutation('post', '/api/finance/transactions')
```

구성 요소는 네 개다.

### 1. `kistaFetch` — 전송 경로를 한 함수로

- 브라우저: 상대 경로로 Route Handler를 부른다. 401 갱신·로그아웃(`clientFetch`의 현재 동작)을 여기에 둔다.
- 서버: 대상 프로세스 base URL을 붙이고 `Authorization`을 단다. 토큰은 인자로 받지 않는다. 요청별 `QueryClient`를 만들 때 한 번 넣는다(`createQueryClient({ token })`). `queryFn`이 받는 컨텍스트의 `client`에서 토큰을 찾는다.
- 공개 경로 목록(`/api/market/**` 등)은 이 함수 안의 상수 하나다. 공개 경로에는 서버·브라우저 모두 토큰을 붙이지 않는다.
- 경로 → 프로세스 표는 `resolveUpstream(path)` 하나다. 서버 직결과 프록시가 같은 함수를 쓴다.
- **UI의 진입점은 하나가 된다(api 지침서 05 개정판, 2026-11-12).** 서버는 여전히 두 프로세스(kista-web: 인증·가계부·meta·SSE / kista-worker: 매매 엔진 HTTP 전부)가 경로로 나눠 받지만, 경로 분기는 Caddy 한 곳에만 둔다. UI 서버 측 호출은 `API_BASE_URL=http://caddy:8080`(Caddy 내부 리스너) 하나를 쓴다. UI는 경로 → 호스트 표를 갖지 않는다. api 통합 배포(05 단계 M) 전까지는 지금의 두 호스트 매핑이 동작해야 하므로 `resolveUpstream` 구조를 유지하고, 그 직후 태스크 8(아래)로 한 호스트로 줄인다.
- 내부 리스너를 거치면 api가 받는 요청은 `X-Forwarded-Proto: http`, `Host: caddy:8080`이 된다. UI 쪽 영향은 없다(2026-11-12 코드 확인): api의 리다이렉트를 브라우저로 넘기는 곳이 없고(로그인 콜백의 리다이렉트는 UI origin으로 만든다 — `app/auth/callback/route.ts:28-90`), AT 쿠키의 `Secure`는 UI가 브라우저 쪽 `x-forwarded-proto`로 정하며(`proxy.ts:17,132`, `app/api/auth/refresh/route.ts:18`), api의 RT `Set-Cookie`를 그대로 넘기는 세 곳(`app/auth/callback/route.ts:82-84`, `shared/lib/auth/refresh.ts:33-34` → `proxy.ts:96`·`app/api/auth/refresh/route.ts:25`)은 api가 `Secure`·`SameSite`를 요청 헤더가 아니라 설정값으로 만들고 `Domain`을 달지 않아(`RefreshTokenCookieHelper.java:23-38`) 달라지지 않는다. 확인이 남은 것은 SSE 2개(`trades/stream`, `auth/status-stream`)가 Caddy 내부 리스너를 지날 때 버퍼링·타임아웃 없이 흐르는지다. 전환 때 실제로 확인한다.
- 엔진(worker) 배포 중 약 3~4분은 엔진 경로가 502/503이다. 잘못된 role로 간 요청은 503 `code=WRONG_ROLE`이다. 프록시는 5xx 본문을 숨기지만(`relayUpstreamError`) 503의 `code`는 넘긴다. 화면 표현은 06 지침서 2절.

### 2. 프록시 Route Handler 하나

`app/api/[[...path]]/route.ts` 한 파일이 `resolveUpstream`으로 대상을 고른다. 지금의 프록시 13개 파일을 지운다. 프록시가 아닌 것(`auth/*`, `fcm/*`, SSE 2개, `health`)은 더 구체적인 경로라 그대로 우선 매칭된다. `admin`의 `Cache-Control: no-store`와 `runtime-config`의 헤더 추가는 `resolveUpstream`이 돌려주는 옵션으로 옮긴다.

### 3. 캐시 정책은 경로에 붙인다

- `staleTime`: `createQueryClient`에서 `queryClient.setQueryDefaults(['get', '/api/market/holidays'], { staleTime: 24 * HOUR })`처럼 경로 접두 키로 등록한다. `docs/agents/shared.md`의 "Stale Time" 표가 코드 한 곳이 되고 문서 표는 지운다.
- 무효화 기본 규칙: mutation이 성공하면 **같은 리소스 경로로 시작하는 GET 쿼리**를 무효화한다. `MutationCache`의 `onSuccess` 한 곳에 둔다. 리소스 경로는 mutation 경로에서 마지막 `{id}` 이후를 잘라낸 것이다(`PATCH /api/finance/transactions/{id}/share` → `/api/finance/transactions`).
- 다른 리소스까지 무효화해야 하면 mutation 옵션 `meta: { invalidates: ['/api/runtime-config'] }`로 선언한다.
- 실패 토스트: `MutationCache`의 `onError` 한 곳에서 서버 `detail`을 띄운다. 호출부가 문구를 넣지 않는다(UI·API 책임 분담 원칙 "오류 문구" 행). 토스트를 원하지 않는 mutation만 `meta: { silent: true }`. 응답에 `fieldErrors`가 있어도 건너뛰지 않는다. 필드 표시는 폼이 더하는 것이고 토스트는 항상 뜬다(04 "서버 오류의 분담").
- 무효화가 아니라 캐시를 직접 고쳐야 하는 mutation(계좌·전략의 등록·수정·삭제, 일시정지·재개, 알림 설정 낙관적 갱신)은 도메인 hook으로 남긴다. 현재 기준 약 15개다.

### 4. 서버 값은 캐시로만 넘긴다

- page는 `prefetchQuery`/`fetchQuery`만 하고 `initial*` props를 넘기지 않는다.
- 화면이 성립하려면 반드시 있어야 하는 데이터(계좌 상세의 계좌, 전략 상세의 전략)는 클라이언트에서 `useSuspenseQuery`로 읽는다. 서버가 채웠으므로 첫 렌더에 값이 있고, `data === undefined` 분기와 `if (!account) return null`이 사라진다.
- 부가 구역 데이터는 지금처럼 `useQuery` + `SectionError`를 쓴다.

### 5. 목록은 두 가지뿐이다

kista-api 지침서 10(`kista-api/docs/superpowers/fable-review/guides/10-ui-contract.md` 2-2절)이 모든 컬렉션 응답을 두 형식으로 통일한다. UI도 목록을 읽는 방법을 둘만 둔다.

| 종류 | 서버 응답 | UI |
|---|---|---|
| 전량형(계좌, 전략, 가계부 계좌·카테고리·예산, 메타성 목록) | `{ items }` | `$api.useQuery(...)`, 받은 전량 안에서 열 정렬·즉시 필터 가능 |
| 페이지형(가계부 거래내역, 자산 스냅샷, 전략 주문, 일별 체결, 사이클 이력, DCA 실행 이력, 관리자 목록, 로그) | `?cursor=&size=` → `{ items, nextCursor, hasMore }` | `$api.useInfiniteQuery(...)` 하나. `getNextPageParam: (last) => last.hasMore ? last.nextCursor : undefined`를 `shared/api`의 `cursorPage` 옵션 상수로 한 번만 적는다 |

- `openapi-react-query`의 `useInfiniteQuery`는 페이지 파라미터 이름 기본값이 `cursor`라 서버 규약과 그대로 맞는다.
- 페이지형을 클라이언트에서 자르거나(`use-client-pagination`) 다시 정렬·필터하지 않는다. 필터·기간은 쿼리 파라미터로 서버에 보낸다.
- 번호 페이지네이션(`PaginationBar`·`PageSizeSelector`, 사용 15·13파일)과 총 건수·총 페이지 표시는 페이지형에서 사라진다. 화면은 "더 보기"로 통일한다(06 지침서의 목록 프리미티브). 총계가 필요한 화면은 집계 엔드포인트의 값을 쓴다.
- 지금의 페이지 형식 3갈래(`page/size/totalElements`, `content`, 커서)를 다루는 코드(`useCycleHistory`의 "더 보기" 기록, `listDcaExecutions`의 페이지 매핑, `use-client-pagination`)가 이 하나로 합쳐진다.

### entities에 남는 것

- `model/types.ts`: 생성 타입 별칭(01).
- `model/*.ts`: 도메인 순수 로직. 05 지침서가 이 중 서버 규칙 사본을 더 줄인다.
- `hooks/`: 캐시를 직접 고치는 mutation과 조합 쿼리(`useCycleHistory` 무한 스크롤 등)만.
- `api/`, `queryKeys.ts`, `queryOptions.ts`, 한 줄 query hook은 없다.

### 그렇게 정한 이유

- api 함수·키·옵션이 담는 정보는 "메서드 + 경로 + 파라미터 + 응답 타입"이고, 이것은 전부 `paths` 타입에 있다. 사람이 한 번 더 적을 이유가 없다.
- 키가 경로이면 "어느 화면이 같은 서버 데이터를 쓰는가"와 "mutation 뒤에 무엇을 다시 받아야 하는가"가 이름 규칙 없이 정해진다. 지금은 키 팩토리의 계층(`xxxRoot()`)을 사람이 URL 계층과 맞춰 유지한다.
- 토큰 전달과 프로세스 선택은 전송의 관심사다. 130개 함수의 시그니처에 퍼져 있을 일이 아니다.
- `openapi-fetch`·`openapi-react-query`는 이미 쓰는 `openapi-typescript`와 같은 프로젝트의 런타임이다. 직접 만들면 경로 파라미터 치환과 응답 타입 추론에 타입 코드 60줄쯤이 들고 유지 부담이 남는다.

### 기각한 대안

- **파일만 합친다**(도메인당 `queries.ts` 하나에 api·키·옵션·hook): 파일 수는 절반이 되지만 130개 함수와 73개 mutation hook은 그대로다.
- **React Query를 걷어내고 RSC + Server Action으로 간다**: 체결 SSE 무효화(`TradeNotificationBridge`), 낙관적 갱신, 필터 전환 시 이전 페이지 유지처럼 클라이언트 캐시에 기대는 동작이 많다. 얻는 것보다 다시 만들 것이 많다.
- **자동 무효화 없이 mutation마다 무효화 대상을 적는다**: 지금 구조의 이름만 바뀐 형태다. 가계부 28개 mutation이 이미 전부 "자기 리소스 루트 무효화"다. 기본 규칙으로 두고 예외만 적는 편이 적다.
- **서버에서 `next/headers`를 `kistaFetch` 안에서 읽는다**: 클라이언트 번들과 같은 모듈 그래프에 서버 전용 import가 들어간다. 요청별 `QueryClient`에 토큰을 넣는 쪽이 경계가 분명하다.

사용자 결정(2026-11-12): `openapi-fetch`·`openapi-react-query` 도입 승인.

## 예상 감량과 위험

| 대상 | 현재 | 목표 | 감량 |
|---|---:|---:|---:|
| `entities/*/api/index.ts` | 16파일 1,307줄 | 모양 변환이 있는 함수만 약 150줄 | 약 1,150 |
| `queryKeys.ts`·`queryOptions.ts` | 21파일 487줄 | 조합 쿼리 옵션 약 60줄 | 약 430 |
| 위 테스트 | 10파일 427줄 | 약 50줄 | 약 380 |
| `entities/*/hooks` | 23파일 1,912줄 | 캐시 직접 갱신 mutation·조합 쿼리 약 700줄 | 약 1,200 |
| 프록시 Route Handler | 13파일 102줄 | 1파일 약 15줄 | 12파일 |
| `api-client` + `createProxyRoute` | 260줄 | `kistaFetch`·`resolveUpstream`·캐시 정책 약 200줄 | 약 60 |
| `initial*` props와 폴백 분기 | 3개 화면 | 0 | 약 40 |
| entities barrel의 재수출 줄 | 약 480줄 | 03 지침서에서 처리 | — |

합계 제품 약 2,900줄, 테스트 약 400줄(hook 테스트 감량은 07에서 계산). 파일은 약 45개 준다.

위험:

- **무효화 범위가 달라진다.** 지금 손으로 좁혀 둔 무효화(예: `strategyKeys.seedPreview`는 체결 무효화에서 제외, `statsKeys.all` 금지 — `docs/agents/shared.md` "체결 SSE")가 접두 규칙으로 넓어지면 폼의 시드가 초기화되는 식의 회귀가 난다. `TradeNotificationBridge`의 대상·제외 목록은 경로 목록으로 1:1 옮기고 기존 테스트(`TradeNotificationBridge.test.tsx`)를 경로 기준으로 다시 써서 먼저 통과시킨다.
- **목록에서 상세를 찾는 쿼리**(`detailFromListQueryOptions`, `strategyDetailQueryOptions`)는 경로 하나에 대응하지 않는다. 단건 조회 엔드포인트가 없어서 생긴 구조다. 서버에 `GET /api/accounts/{id}`, `GET /api/trading-cycles/{id}`를 요청한다(`cross-repo.md`에 추가). 생기기 전까지는 목록 쿼리 + `select`로 읽는다.
- **배열 파라미터의 순서**: `accountKeys.prices`는 티커를 정렬해 키에 넣는다. 경로 키에서는 호출부가 정렬된 배열을 넘겨야 한다. `params` 정규화(배열 정렬)를 `$api` 래핑 한 곳에서 한다.
- **401 처리**: `clientFetch`의 갱신·로그아웃 단일화 로직은 인증 흐름이다. 동작을 바꾸지 않고 그대로 옮긴다. Opus가 맡고 `/code-review high`를 돌린다.
- **라이브러리 동작**: 공식 문서(context7 `/openapi-ts/openapi-typescript`, 2026-11-11 조회)로 확인한 것 — `openapi-react-query`는 `queryOptions`·`useQuery`·`useInfiniteQuery`·`useMutation`을 제공하고 키는 `[method, path, { params }]`다. `openapi-fetch`는 `fetch` 주입과 `onRequest`/`onResponse` 미들웨어를 지원하며, 실패 응답을 던지게 하려면 `onResponse`에서 직접 throw한다(여기서 `ApiError`를 던진다). TanStack Query의 `MutationCache` 전역 `onSuccess`/`onError`와 `mutation.meta`, `setQueryDefaults`의 부분 키 매칭도 문서로 확인했다. 확인하지 못한 것 — `useSuspenseQuery` 제공 여부와 설치될 버전의 키 세 번째 원소 정확한 모양. 태스크 1에서 `node_modules` 소스로 확인하고, `useSuspenseQuery`가 없으면 `useSuspenseQuery($api.queryOptions(...))`로 쓴다.
- **목록 규약 전환은 api와 같은 날 배포한다.** 봉투가 배열에서 `{ items }`로 바뀌는 순간 구 UI가 깨진다. 묶음(가계부 / 전략 주문·체결·이력 / 관리자)별로 api 지침서 10의 T4와 짝지어 배포한다.

## 동작 보존용 선행 테스트

1. 무효화 표를 먼저 만든다. 현재 mutation 73개 각각이 무효화·갱신하는 키를 표로 뽑고(Sonnet 서브에이전트), 새 규칙(같은 리소스 접두 + `meta.invalidates`)으로 같은 집합이 나오는지 표에서 대조한다. 넓어지는 것과 좁아지는 것을 표시한다. 이 표가 태스크 4의 입력이다.
2. `kistaFetch`에 현재 `api-client` 테스트(401 갱신 1회, 동시 401 단일화, 블랙리스트 사유 전달, 204 처리)를 그대로 옮겨 통과시킨다.
3. 프록시 통합 전후로 `createProxyRoute` 테스트의 케이스(공개 경로에 토큰 미부착, 4xx relay, 5xx 숨김, 증권사 503 예외)를 단일 핸들러에 대해 통과시킨다.
4. e2e: `npm run test:e2e`(로컬 api 필요, 사용자가 기동)로 계좌 캐시 회귀 스펙을 전후 확인한다.

## 태스크 분해

| # | 태스크 | 대상 | 모델 | 완료 판정 |
|---|---|---|---|---|
| 1 | 라이브러리 설치와 동작 확인(키 모양, `queryOptions`, suspense, infinite) | `package.json`, 스크래치 검증 | Sonnet | 확인 결과를 PROGRESS에 기록. `npm run typecheck` |
| 2 | `resolveUpstream` 단일화, 프록시 Route Handler 통합 | `shared/lib/proxy/**`, `app/api/**/route.ts`(프록시 13개) | Opus | 프록시 테스트 통과, `find app/api -name route.ts \| wc -l`이 10 이하 |
| 3 | `kistaFetch` + `api`/`$api` + 요청별 토큰 + `setQueryDefaults` 표 + `MutationCache` 규칙 | `shared/api/**`(신규), `shared/lib/query/createQueryClient.ts` | Opus | 선행 테스트 2 통과. 기존 `api-client`는 아직 지우지 않는다 |
| 4 | 무효화 대조표 작성 | 문서(`findings/k-invalidation-map.md`) | Sonnet | 73개 mutation 전부 행이 있음 |
| 5a | 가계부 전환 | `entities/finance/**`, 소비 widgets·features·app | Sonnet | `grep -rn "useInvalidateFinanceMutation\|financeKeys" --include='*.ts*' . \| grep -v test` 0건, `npx vitest run entities/finance features/finance widgets/finance-* widgets/asset-*` |
| 5b | 참조·통계·관리자 전환 | `entities/{market,meta,runtime-config,admin-settings,stats,backtest,admin,privacy,error-log,user,fcm}/**` | Sonnet (도메인별 병렬, 파일 안 겹침) | 도메인별 `queryKeys.ts`·`queryOptions.ts` 삭제, 해당 vitest |
| 5c | 계좌·체결·주문·전략 전환 | `entities/{account,trade,order,strategy}/**`, `widgets/layout/TradeNotificationBridge.tsx` | Opus | 브리지 테스트 통과, e2e 계좌 캐시 스펙 |
| 6 | `initial*` props 제거, 핵심 데이터 `useSuspenseQuery` 전환, page의 토큰 전달 제거 | `app/(main)/**/page.tsx`, `widgets/{account-detail,strategy-detail}/**`, `features/strategy/create-strategy/StrategyFormPage.tsx` | Sonnet | `grep -rn "initialAccount\|initialStrategy" --include='*.tsx' .` 0건 |
| 7 | 구 `api-client`·`fetchEither`·`createProxyRoute` 삭제, 문서 갱신 | `shared/lib/api-client/**`, `docs/agents/{architecture,entities,shared}.md` | Haiku | `npm run knip`, `npm run lint`, `npm run test:run` |

| 8 | 진입점 단일화: `resolveUpstream` 삭제(항상 `getApiBaseUrl()`), `getTradingApiBaseUrl`·`TRADING_API_BASE_URL`(env.ts, `.env.example`, 루트·`deploy/server` compose, `docs/agents/deployment.md`)과 `NEXT_PUBLIC_TRADING_API_BASE_URL` 폴백 삭제, 운영 `API_BASE_URL`을 Caddy 내부 리스너로. 스펙이 하나로 합쳐지므로 `scripts/fetch-spec.mjs`의 8080·8081 병합(42줄)을 지우고 `fetch:spec`을 `/api-docs` 한 곳 내려받기로(통합 배포부터 trading 경로 포함, `/api/internal/**` 제외) | `shared/api/**`, `shared/lib/env.ts`, compose 2개, `scripts/fetch-spec.mjs`, `package.json` | Sonnet | api 지침서 05 단계 M 직후. `git grep -n TRADING_API_BASE_URL` 0건, SSE 2개가 실제로 흐르는지 확인, 로그인·토큰 갱신 1회 확인 |

5a를 먼저 한다. 가계부는 정규화가 없고 mutation이 전부 무효화형이라 새 규칙이 맞는지 가장 싸게 검증된다.

## 하지 말아야 할 것

- `$api.useQuery('get', '/api/accounts')`를 `useAccountsQuery()`로 다시 감싸지 않는다. 감싸는 것은 `select`·`enabled` 조건 같은 실제 로직이 있을 때뿐이다(`sortMockLast`가 그 예다. 다만 정렬은 05에서 서버로 옮길 후보다).
- 경로 문자열을 상수 파일로 빼지 않는다. 경로는 타입이 검사한다.
- 자동 무효화가 불안하다고 mutation마다 `meta.invalidates`를 전부 적지 않는다. 대조표에서 차이가 난 것만 적는다.
- 401 갱신·로그아웃 로직을 이 기회에 고치지 않는다.
- 전환 중에 한 도메인 안에서 구 키와 새 키를 섞지 않는다. 도메인 단위로 한 번에 옮긴다(섞이면 무효화가 한쪽만 닿는다).

## 다른 지침서와의 의존·순서

- 선행: 01(타입). 생성 타입이 정확해야 `paths`에서 추론한 응답 타입을 그대로 쓸 수 있다.
- 03(계층 재심)은 이 지침서로 entities가 얇아진 뒤의 모양을 전제로 한다.
- 05는 이 지침서가 남긴 "모양 변환 함수 약 150줄"과 목록 → 상세 조회를 서버 변경으로 더 줄인다.
- kista-api는 web·worker 두 role이 경로로 나눠 받고 Caddy가 분기한다(api 지침서 05 개정판). UI 진입점은 Caddy 하나다. 태스크 8이 api 05 단계 M과 짝이다.
- `cross-repo.md`에 추가할 요청: 단건 조회 엔드포인트 2개(`GET /api/accounts/{id}`, `GET /api/trading-cycles/{id}`), 오류 `detail`을 사용자용 문장으로 보장.

## 실행 전 보정 (2026-11-14 — 본문과 다르면 이 절이 우선)

공통 규칙은 `00-roadmap.md` 4절. 측정 원본은 `findings/s-guide-premises-01-06.md`.

전제 정정:

- 태스크 2: 프록시 Route Handler는 13개가 맞다(`git grep -l createProxyRoute -- 'app/api' ':!*.test.*'`). `route.ts`는 22개이고 프록시가 아닌 것이 9개다(`auth/{logout,me,reapply-done,refresh,status-stream}`, `fcm/tokens` 2개, `health`, `trades/stream`). 그래서 판정 "10 이하"는 그대로다. 프록시가 아닌 9개는 이 태스크에서 손대지 않는다(11의 2·4·6이 줄인다). 12가 먼저 끝났으면 프록시는 12개다.
- 위험 절의 단건 조회: `GET /api/trading-cycles/{id}`는 이미 스펙에 있다(`shared/lib/api-types.ts:1664-1672`). 서버에 요청할 것은 `GET /api/accounts/{id}` 하나다(api 10 T11). 전략 단건은 태스크 5c에서 목록 `find` 대신 이 GET을 쓴다. 계좌 단건은 T11이 `api-types.ts`에 들어올 때까지 목록 쿼리 + `select`다.
- 태스크 6 판정: `StrategyFormPage`의 prop 이름은 `initial`이라 `initialAccount\|initialStrategy` grep에 걸리지 않는다. 대상에는 포함한다(`features/strategy/create-strategy/StrategyFormPage.tsx:13-21`). 10의 B1(삭제된 리소스 URL의 안내 화면)을 판정에 더한다: 없는 계좌·전략 id로 들어가면 오류 경계가 아니라 "삭제되었거나 없는 항목" 안내와 목록 링크가 뜬다(케이스 1건).
- 태스크 8 대상: `docs/agents/deployment.md`에는 `TRADING_API_BASE_URL` 문자열이 없다. 대신 지침서가 빠뜨린 곳이 7곳이다 — `.github/tests/contract.bats:10`(필수 보간 단언), `README.md:18,59`, `playwright.config.ts:35`, `scripts/visual-diff/run.mjs:124`, `shared/lib/proxy/createProxyRoute.test.ts:58,60,82`, `app/(main)/accounts/[id]/strategies/[sid]/edit/page.test.tsx:21`, `deploy/server/README.md:32`. 같은 커밋에서 고친다. `scripts/visual-diff/proxy.mjs`의 가짜 서버 2개도 하나로 합친다.
- **이 지침서는 `useAppForm`을 모른다.** 묶음 C 뒤로 폼 15파일이 entities mutation hook의 결과를 `useAppForm({ mutation })`에 넘긴다(`shared/ui/form/useAppForm.ts:23-27`의 `MutationLike`). 태스크 1에서 `$api.useMutation`의 반환이 `MutationLike`에 맞는지 확인하고, 태스크 5에서 hook을 지울 때 그 15파일이 `$api.useMutation(...)`을 직접 넘기게 한다.
- 실패 토스트: 지금은 hook마다 `onError: toast.error(apiMsg(...))`가 띄운다. 태스크 3의 전역 `MutationCache` `onError`를 켜는 것과 hook의 `onError`를 지우는 것은 **도메인별로 같은 커밋**이어야 토스트가 두 번 뜨지 않는다. 전역 처리는 `fieldErrors`가 있어도 항상 `detail`을 띄운다(04 "서버 오류의 분담"). `PROGRESS.md` 묶음 C의 "hook `onError`도 고친다"는 그 답 이전 기록이라 따르지 않는다.

같은 커밋에서 고칠 것(가드):

- `testing/mockApi.ts`는 전역 `fetch`를 바꿔 끼운다. 새 `kistaFetch`·`openapi-fetch` 클라이언트가 `fetch`를 모듈 로드 때 잡아 두면 mock이 듣지 않는다. 호출 시점에 `globalThis.fetch`를 읽게 한다. 태스크 3의 선행 테스트에 "mockApi로 등록한 응답이 `$api` 호출에 온다" 1건을 넣는다.
- `eslint.config.mjs:16`의 `runtimeFiles`에 `shared/**`가 없다. 서버 fetch를 `shared/api/**`에 두면 `next/cache` 금지 규칙(`:69-70`)과 `router.refresh()` 금지(`:74`)가 닿지 않는다. 그 glob에 `shared/api/**`를 더한다.
- `kistaFetch`가 `next/headers`를 쓰면 그것을 mock하는 테스트가 3건째가 된다. 그때는 `vitest.setup.ts` 전역 대역으로 옮긴다(사용자 확정 2026-11-13, `PROGRESS.md` 묶음 C "남긴 것").
- 문서: `docs/agents/architecture.md` "API 계층", `entities.md:22`, `shared.md:22,47`은 태스크 7이 아니라 해당 코드를 지우는 커밋에서 고친다.

기본값:

- 코인 쿼리(`getCryptoPrices`, 코인 포트폴리오, 코인 지표)와 `app/api/crypto-market-indicators`는 12가 지운다. 12 전이면 `$api`로 옮기지 않는다(V8).
- 62행의 SSE 확인(Caddy 내부 리스너를 지나는 `trades/stream`·`status-stream`): 버퍼링·끊김이 보이면 SSE 2개만 지금 경로를 유지하고 태스크 8의 나머지를 한다. 증상을 api 레포 `cross-repo.md` F절에 적는다.
- 141행의 `useSuspenseQuery` 확인은 `node_modules/openapi-react-query` 소스로 한다(문서보다 소스).
- 태스크 4의 `findings/k-invalidation-map.md`는 지침서가 만들라고 한 산출물이다. 만든다.

중단 조건의 대체 경로:

- 태스크 8의 선행(api 05 단계 M)이 오지 않는다 → 태스크 8만 남겨 둔다. 1~7에 영향이 없다.
- 목록 규약 전환(5a·5c의 봉투 변경)은 api와 같은 날이다 → ui 커밋을 준비하고 `cross-repo.md`에 적는다. api가 아직이면 그 목록만 지금 모양으로 두고 나머지 전환을 끝낸다.
- 401 갱신·로그아웃 흐름을 옮기다 테스트가 깨진다 → 되돌린다. 이 흐름은 그대로 옮기는 것이 원칙이다(174행).

배포: 태스크 1~7은 ui 단독이고 화면이 같다. 태스크 2·3은 인증·프록시 경로라 `/code-review high`를 돌린다(본문 그대로).
