# lib/ — API 계층 · kista-api DTO · KIS quirk · 캐시

> **FSD 리팩토링 완료**: `lib/api/*.ts`, `hooks/*.ts`, `lib/fcm.ts`는 대부분 **re-export shim**. 실제 구현은 `entities/{domain}/{api|hooks}/`에 있음. 새 코드는 entities 계층에 작성할 것.

## clientFetch vs apiFetch

현재 구현 위치: **`shared/lib/api-client/index.ts`** (`lib/api/client.ts`는 re-export shim)

- **`apiFetch(path, opts, token)`**: Server Component 전용 — kista-api 직접 호출
- **`clientFetch<T>(path, opts?)`**: Client Component 전용 — Route Handler 경유, 401 시 자동 로그아웃(`/api/auth/logout` + `window.location.href='/'`)
- Client Component에서 raw `fetch('/api/...')+throw` 패턴 금지 — 반드시 `clientFetch` 사용
- **204 처리**: `clientFetch<void>` 사용 — `res.json()` 금지 (`SyntaxError: Unexpected end of JSON`)
- **lib/api 호출 패턴**: `listAccounts(token?)` — token 생략 시 Route Handler 경유. token 전달은 Server Component 전용. 함수명: `listAccounts` (`getAccounts` 아님)

## Route Handler 목록

catch-all Route Handler: `/api/accounts/[[...path]]`, `/api/admin/[[...path]]`, `/api/market/[[...path]]`, `/api/meta/[[...path]]`, `/api/orders/[[...path]]`, `/api/portfolio/[[...path]]`, `/api/privacy-trades/[[...path]]`, `/api/strategies/[[...path]]`, `/api/trading-cycles/[[...path]]`

전용 Route Handler: `app/api/auth/logout`, `app/api/auth/me`, `app/api/auth/reapply-done`, `app/api/auth/status-stream`, `app/api/fcm/tokens`, `app/api/fcm/tokens/[token]`, `app/api/settings/notification-channel`, `app/api/settings/telegram`, `app/api/trades/stream`

## kista-api DTO 필드

- `UserResponse`: `{ id, nickname, status, hasTelegram, role, telegramBotUsername }`
- `AccountResponse`: `{ id, nickname, accountNoMasked, broker }` — strategyType/ticker/hasTelegram 없음 (V35 이후)
- `TradingCycleResponse`: `{ id, accountId, type, status, ticker, cycleSeedType, initialUsdDeposit }` — `multiple` 필드 제거됨(커밋 `e63cdfb2`)
- **TradingCycleResponse 필드 추가 시**: `entities/strategy/model/types.ts` + `entities/strategy/api/index.ts`의 `normalizeStrategy()` **두 곳 동시 업데이트 필수**. BigDecimal → `toNum()` 사용. 한 곳만 수정 시 런타임 `undefined`

## 전략 (Strategy / TradingCycle)

- 프론트 `Strategy` ↔ 백엔드 `TradingCycle` — 이름 다름
- 목록: `/api/accounts/{id}/trading-cycles`, 개별: `/api/trading-cycles/{id}`
- pause/resume: **strategyId 기준** (구 accountId 아님)
- **cycleSeedType**: `NONE`(자동실행 off) / `MAX`(시드 MAX) / `MAINTAIN`(시드 유지). `normalizeStrategy()`에서 `?? 'NONE'`으로 정규화
- **StrategyForm 최소 시드**: INFINITE = `basePrice * 20 * 2 * 1.1`, PRIVACY = `currentCycleStart / 2`. 미달 시 등록 버튼 비활성화
- **PercentGauge pct 초기화**: 타입/종목 변경 시 100% → `deposit < newMinSeed`이면 0%로
- **INFINITE vs PRIVACY 판별**: 리터럴 직접 사용 금지. `typeMeta?.availableTickers?.length > 1` = INFINITE. API 인자도 `meta.tickers.map(t => t.code)` 사용 (하드코딩 금지)

## MetaProvider / API

- **MetaProvider**: `(main)/layout.tsx`에서 `GET /api/meta` prefetch → `<MetaProvider meta={meta}>`. Client에서 `useMeta()` → `findStrategyType(code)`, `findTicker(code)`, `labelOf(category, code)`
- `StrategyTypeMeta`에 `availableTickers` 포함 (`defaultTicker`/`defaultMultiple` 없음). UI 초기화: `availableTickers[0]` + 상수 `"1"`

## KIS live API quirk

- **OVRS_EXCG_CD**: `TTTS3035R`에서 거래소 코드는 `ticker.exchangeCode()` 사용. SOXL="AMS", TQQQ/USD="NASD". 하드코딩 "NASD"로 SOXL 조회 시 빈 배열
- **TTTC2101R 외화증거금**: `frcr_ord_psbl_amt1`은 통합증거금 OFF 시 0. `frcr_gnrl_ord_psbl_amt`가 항상 유효. `KisMarginAdapter`: `max(itgr_ord_psbl_amt, frcr_gnrl_ord_psbl_amt)`
- **`getPrices` 쿼리 직렬화**: `?tickers=TQQQ,SOXL` 콤마 금지 → Spring `@RequestParam List<Ticker>`는 반복 파라미터만. `tickers.map(t => 'tickers=' + encodeURIComponent(t)).join('&')` 패턴 (`entities/account/api/index.ts:getPrices` 참고)
- **MultiPriceResponse**: 응답 `{ prices: [{ticker, price}] }` (flat map 아님) → `getPrices()`에서 `PriceMap`으로 normalizer 변환 필수. 미변환 시 `prices["TQQQ"]` = undefined → MAX 배수 버튼 비활성화
- **통화 주의**: KIS `CTRP6504R`의 `positions[].evalAmountUsd`는 USD, `summary.totalAssetUsd`/`totalEvalProfit`은 **KRW** (필드명에 Usd 있어도 KRW)
- **StatisticsController 응답 형식**: KIS live 엔드포인트는 DTO를 그대로 반환 → kista-ui 타입과 drift 발생 가능. 신규 엔드포인트 추가 시 필드명 반드시 대조 (불일치 시 `undefined.toFixed()` → 500)
- **`GET /api/accounts/{id}/profit`**: `PeriodProfitResult { totalRealizedProfit, totalReturnRate }`. `accountId`/`startDate`/`endDate`/`dailyProfits`는 서버 미전송 → `?? 0` 가드 필요

## API 날짜 파라미터

- `getAccountProfit` / `getAccountTrades` 등: `{ from, to }` (ISO date string)
- `getPortfolioSnapshots` / `getAccountCycleHistory`: `{ from?, to? }` (optional — `{}` 전달 시 전체 기간)
- `getStrategyCycleHistory` → `/api/trading-cycles/{id}/history`. `{}` 전달 시 서버 기본값 '30d'
- `getDailyTransactions(accountId, {from, to}, token?)` → `GET /api/accounts/{id}/daily-trades`
- `TradeHistory` enum: `OrderType` = `LOC|MOC|LIMIT`, `OrderStatus` = `PLACED|FILLED|FAILED`
- `GET /api/trades` 현재 필드: `id, tradeDate, ticker, orderType, direction, quantity, price, status, kisOrderId` — `strategy`/`amountUsd`/`createdAt` 제거됨
- `GET /api/accounts/{id}/trades` → `Execution[] { tradeDate, ticker, direction, quantity, price, kisOrderId }` (`TradeHistory` 타입 아님 — `id`/`orderType`/`status` 없음)

## React Query 훅

- **QueryProvider**: `shared/providers/QueryProvider.tsx` (구 `components/providers/QueryProvider.tsx` — re-export shim 유지). `{ retry: 0, staleTime: 0, gcTime: 5min }`.
- **훅 파일 위치**: 도메인 훅 → `entities/{domain}/hooks/`. 범용 복합 훅 → `hooks/` 루트 (re-export shim만 남아있을 수 있음).

### 도메인별 훅 목록

| 도메인 | 파일 | 주요 훅 |
|---|---|---|
| account | `entities/account/hooks/useAccountMarginQuery.ts` | `useAccountMarginQuery`, `useAccountPricesQuery`, `useCreateAccountMutation`, `useTestKisConnectionMutation`, `useUpdateAccountMutation`, `useDeleteAccountMutation` |
| strategy | `entities/strategy/hooks/useStrategyQueries.ts` | `useCreateStrategyMutation`, `useUpdateStrategyMutation`, `usePauseStrategyMutation`, `useResumeStrategyMutation`, `useExecuteStrategyMutation` |
| order | `entities/order/hooks/useOrderQueries.ts` | `useNextOrderPreviewQuery`, `useCancelAllOrdersMutation`, `useCancelOneOrderMutation` |
| user | `entities/user/hooks/useUserQueries.ts` | `useReapplyMutation`, `useDeleteMeMutation`, `useUpdateTelegramMutation`, `useDeleteTelegramMutation`, `useApproveUserMutation`, `useRejectUserMutation`, `useChangeUserRoleMutation` |
| trade | `entities/trade/hooks/useCycleHistory.ts` | `useAccountCycleHistoryQuery`, `useStrategyCycleHistoryQuery` |
| trade | `entities/trade/hooks/useProfitStats.ts` | `useProfitStatsQuery` |
| market | `entities/market/hooks/useMarketQueries.ts` | `useMonthlyHolidaysQuery`, `useMarketSessionQuery` |
| privacy | `entities/privacy/hooks/usePrivacyQueries.ts` | `usePrivacyCurrentBaseQuery` |
| fcm | `entities/fcm/hooks/useFcmToken.ts` | `useFcmToken` |

### queryKey 목록

`['accounts']`, `['accountMargin', accountId]`, `['accountPrices', accountId, tickers]`, `['strategies', accountId]`, `['nextOrderPreview', accountId]`, `['previewMargin', accountId]`, `['holidays', year, month]`(공유 캐시), `['marketSession']`, `['accountCycleHistory', accountId, params]`, `['strategyCycleHistory', strategyId, params]`, `['profit', accountId, period]`, `['snapshots', accountId, period]`, `['privacyCurrentBase']`

- **SSR initialData 패턴**: `useMonthlyHolidaysQuery(year, month, holidays)` — `initialData` + `staleTime: 1h`로 마운트 시 재요청 방지
- **useMutation 패턴**: toast + invalidateQueries를 훅 내부 `onSuccess`/`onError`에 캡슐화. 호출부에서 추가 동작(onChanged 등)은 `mutation.mutate(data, { onSuccess: () => callback() })` 패턴 사용

## Promise.all 패턴

- **fail-fast 방지**: `Promise.all([a(), b()])` 중 하나 reject 시 `.then()` 실행 안됨 — 각 항목에 `.catch(() => null)` 필수. 모두 null일 때만 toast

## PRIVACY 기준가 API

- `getPrivacyCurrentBase()` → `entities/privacy/api/index.ts`, Route Handler `app/api/privacy-trades/[[...path]]/route.ts`, 응답 `{ ticker, currentCycleStart, tradeDate }`. 기준 매매표 없으면 404

## FCM

- **`entities/fcm/api/index.ts`**: `registerTokenToServer`/`unregisterTokenFromServer` → `clientFetch<void>` 사용 (raw fetch 금지 — 401 자동 로그아웃 누락)
- **다중 기기**: `fcm_device_tokens` 테이블은 사용자당 여러 토큰 허용. `FcmAdapter.send()` → `MulticastMessage`. `save()` 중복 토큰 자동 skip
- **발송 시점**: 매매 결산, 가입 승인, 가입 거절. 신규 가입·전략 변경 알림은 텔레그램만 (FCM no-op)

## 캐시 헬퍼

- `shared/lib/cache/cached-api.ts`: `getCachedAccounts`, `getCachedStrategies`, `getMe` — Server Component용 unstable_cache 래퍼. 5분 TTL. (`lib/cache/cached-api.ts`는 re-export shim)
- **`unstable_cache` 에러 핸들링**: `.catch()` 체인 금지 → `try { await getCachedX() } catch {}` 패턴
- **`revalidateTag` 2인자**: `revalidateTag(tag, 'max')` — 1인자만 쓰면 TS 에러
