# entities/ — 도메인 모델 · API 함수 · React Query 훅

FSD 계층에서 가장 저수준 도메인 레이어. `shared/`만 import 가능. 동일 계층 cross-import 금지.
캐시 소유권과 mutation 동기화의 규범은 `docs/agents/cache-policy.md`를 따른다.

## 의존성 규칙

```text
entities/{domain}  ->  shared/
```

entities끼리 직접 참조 금지. 두 도메인을 조합해야 하면 `features/` 또는 `widgets/`에서 처리.

## 슬라이스 목록

| 슬라이스 | 역할 |
|---|---|
| `account` | 계좌 CRUD, KIS 연결 테스트, 증거금 조회 |
| `asset` | 개인 자산·부채 수동 기록 CRUD, 월별 기록 완료 상태, 대시보드용 순수 집계 함수(`lib/aggregate.ts`) — 자동매매와 무관 |
| `strategy` | 전략(TradingCycle) CRUD, 일시정지/재개 |
| `order` | 다음 주문 미리보기, 주문 취소, 전략별 주문 내역 조회 |
| `trade` | 거래 내역, 사이클 히스토리, KIS live 포트폴리오, SSE 거래 알림 |
| `user` | 현재 사용자 조회, 로그아웃, 재신청, 회원 탈퇴, 설정 변경 |
| `market` | 시장 휴일, 마켓 세션 |
| `meta` | 전략 타입/종목 메타데이터 (MetaProvider 포함) |
| `admin` | 관리자 사용자 목록 조회, 승인/반려, 역할 변경, 강제 탈퇴 |
| `runtime-config` | 가입 승인, 증권사, 전략 등록 필드, ETF 벤치마크의 런타임 허용값/기본값 조회 |
| `admin-settings` | 관리자 런타임 설정(가입 승인·증권사·전략 필드·ETF 벤치마크) 전체 조회·갱신과 canonical 설정 캐시 동기화. cross-domain 저장 후 효과는 feature가 mutation-level callback으로 주입하며 entity lifecycle이 이를 await한다 |
| `fcm` | FCM 토큰 등록/해제 및 foreground 알림 표시 (`FcmAutoRegister`, `FcmForegroundListener`) |
| `privacy` | PRIVACY 전략 P 매매표 |
| `stats` | 전략 수익 통계 요약, 자산 곡선, 사이클 성과 페이지 조회 |

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
- Query 훅: `useXxxQuery` — key factory의 `queryKey`, `queryFn`, 데이터 성격에 맞는 `staleTime`
- Server/Client 공유 옵션: server-safe `model/queryOptions.ts`의 `xxxQueryOptions(token?)` — Server Component는 token으로 `prefetchQuery`, Client Component는 token 없이 `useQuery`에서 재사용
- Mutation 훅: `useXxxMutation` — 엔티티 훅은 API 호출과 도메인 캐시 동기화를 캡슐화하고 `onError`에 `toast.error`를 둔다. 성공 toast, 라우팅, 다른 도메인 무효화는 호출 feature의 `mutate(data, { onSuccess })`에서 처리한다
- 호출부에서 추가 동작이 필요하면 `mutation.mutate(data, { onSuccess: () => callback() })` 패턴 사용
- **참조 데이터 24h staleTime**: `market/model/queryOptions.ts`의 `monthlyHolidaysQueryOptions(year, month, token?)` — `staleTime: 24h`, queryFn이 `typeof window`로 서버/클라이언트를 분기해 서버+token → 인증 fetch, 서버+비인증 → public 엔드포인트, 브라우저 → Route Handler 경유 클라이언트 fetch를 고른다. `useMonthlyHolidaysQuery(year, month)`는 이 factory를 그대로 소비하며 더 이상 `initialData` 파라미터를 받지 않는다. `app/(main)/dashboard/page.tsx`가 `queryClient.prefetchQuery(monthlyHolidaysQueryOptions(...)).catch(() => undefined)`로 SSR prefetch하며, react-query 기본 `shouldDehydrateQuery`가 `status:'success'` 쿼리만 직렬화하므로 실패한 서버 조회는 dehydrate에 포함되지 않고 클라이언트가 즉시 재조회한다 — "실패한 조회를 빈 달로 24시간 hydrate 금지" 시맨틱은 이 방식으로 보존된다

**queryKey**: 각 entity의 `model/queryKeys.ts` factory가 SSOT다. 서로 다른 위젯이 동일 서버 데이터를 소비하면 같은 factory와 파라미터를 사용해 React Query 캐시를 공유한다.

## index.ts 규칙

각 슬라이스 최상단 `index.ts`가 public API. 외부에서 내부 파일 직접 import 금지.

```ts
import { deleteAccount } from '@entities/account'
```

## kista-api DTO 필드

- `UserResponse`: `{ id, nickname, status, hasTelegram, role, telegramBotUsername }`
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

- **account**: `accountNo`는 8자리만. `kisAccountType`은 항상 `"01"`. `AccountRequest` 필드명은 `appKey`, `secretKey`. 계좌 목록은 `accountListQueryOptions(token?)`/`useAccountsQuery()`와 `accountKeys.list()` 캐시를 SSOT로 사용한다. 생성/수정/삭제 mutation은 완전한 list cache가 있으면 직접 반영하고, list cache가 없으면 canonical list query 전체 조회를 await한다. detail은 생성/수정 시 직접 쓰고 삭제 시 detail/margin/prices를 제거한다
- **asset**: `category`만 `AssetCategory` enum(`INVESTMENT`/`SAVINGS`/`LOAN`/`REAL_ESTATE`, 와이어 값은 영문 상수 — 한글 라벨은 `shared/lib/api-schema.ts`의 `formatAssetCategoryLabel`에서만), 나머지 필드(`subcategory`/`institution`/`assetClass`/`strategy`)는 자유 입력이며, 등록 폼의 추천 목록(Select 콤보용)은 이 entity가 아니라 `runtime-config`의 `assetFormOptions`가 관리자 수정 가능한 SSOT다(아래 runtime-config 항목 참고) — 단 `assetClass`는 예외로, `lib/aggregate.ts`의 `KNOWN_ASSET_CLASSES`가 여전히 현황·구성비 위젯의 정렬 순서·색상 인덱스 기준을 별도로 소유한다(목적이 다른 두 목록이라 admin이 `assetFormOptions.assetClassSuggestions`만 편집해도 위젯 쪽 순서·팔레트는 그대로다 — 둘을 하나로 합치는 건 widgets 레이어까지 손대야 하는 별도 리팩토링). `strategy` 필드는 실제 자동매매 전략과 무관한 개인 메모다. 부채(순자산·구성비 분모) 판정은 반드시 `isLoanCategory(category)`로 하고 문자열 `'LOAN'` 직접 비교를 반복하지 않는다. `lib/aggregate.ts`가 위젯 공용 집계 함수를 전부 소유— 특히 `calcCategoryComposition`(대출 포함, 4개 세그먼트)과 `calcAssetClassComposition`(대출 제외)은 이름이 비슷해 혼동하기 쉬우니 범용 `calcComposition`을 위젯에서 직접 호출하지 말고 이 두 래퍼를 통해서만 쓴다. 목록은 벌크 삭제 전용 엔드포인트가 없어 `useDeleteManyAssetsMutation`이 개별 DELETE를 `Promise.allSettled`로 병렬 호출한다
- **strategy**: 백엔드 이름은 `TradingCycle`. pause/resume은 strategyId 기준. capability는 `StrategyTypeMeta` 필드를 직접 소비하고, 최소 시드는 `useStrategySeedPreviewQuery`를 사용한다. `seedBadgeClass()`를 재사용한다
- **meta**: `MetaProvider`는 `(main)/layout.tsx`에서만 제공 — `(main)` 밖에서 `useMeta()` 호출 불가. Client는 `useMeta()`의 `findStrategyType(code)`/`findTicker(code)`/`labelOf(category, code)` 사용. `TickerMeta.targetProfitRate`는 `string` 타입
- **runtime-config**: `useRuntimeConfigQuery()`는 `cache: 'no-store'`, `staleTime: 0`, window focus refetch로 서버 설정을 최신화한다. 신규 계좌는 활성 증권사만, 신규 전략은 활성 타입과 각 필드의 `allowedValues`/`defaultValue`/`customizable`을 사용한다. ETF 벤치마크는 `benchmarks.etf.allowedValues/defaultValue`를 사용하고 서버 값이 없으면 `DEFAULT_RUNTIME_BENCHMARKS`로 보정한다. 수정 화면의 기존 값은 런타임 허용 목록으로 덮어쓰지 않는다. `assetFormOptions`(자산 등록 폼의 세부 카테고리/기관/자산군/운용전략 추천 목록)는 위 필드들과 달리 `allowedValues`/`defaultValue`가 없는 순수 문자열 배열이다 — 대응하는 자산 필드가 여전히 자유 입력이라 값 자체를 제한하지 않고 입력을 돕는 추천값만 제공하기 때문. 서버 값이 없으면 `DEFAULT_ASSET_FORM_OPTIONS`로 보정한다(`entities/asset`가 아닌 이 슬라이스가 소유 — `entities/asset`는 다른 entity를 import할 수 없어 `features/asset/save-asset/AssetForm.tsx`가 두 entity를 함께 가져다 쓴다)
- **admin-settings**: `GET/PUT /api/admin/settings`는 관리자 프록시를 사용한다. 저장은 optimistic update 없이 처리하고 성공 후 `admin-settings`와 `runtime-config`를 모두 무효화한다
- **trade/providers**: `TradeNotificationProvider`는 SSE `/api/trades/stream` 구독용
- **privacy**: 관리자 전용 — Server Component에서 apiFetch로 `/api/admin/privacy-trade-bases` 직접 호출 (Route Handler 없음)
- **fcm**: `registerTokenToServer`는 `clientFetch<void>` 사용 (토큰 해제 API는 클라이언트 미구현 — `app/api/fcm/tokens/[token]` DELETE 라우트만 존재)
- **stats**: `GET /api/stats/summary|equity-curve|cycles` 소비. `equity-curve`와 `cycles`는 선택 전략 타입 필터(`type=INFINITE|PRIVACY|VR`)를 공유하고, `summary`는 전략 유형 비교 목적상 항상 전체 집계를 사용한다. `byType[].winRate`/`avgReturnRate`/`avgDurationDays`와 `CyclePerformance`의 `pnl`/`returnRate`/`durationDays`/`endDate`/`endAmount`는 미종료 사이클에서 `null` 가능 — 렌더링 시 null 가드 필수. `getStatsCycles`의 `nextCursor`는 없으면 응답에서 필드 자체가 생략되므로 옵셔널 처리

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
