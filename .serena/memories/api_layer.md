# API 계층 상세

## fetch 래퍼 구분
- `apiFetch(path, opts, token)` — Server Component 전용, kista-api 직접 호출
- `clientFetch<T>(path, opts?)` — Client Component 전용, Route Handler 경유, 401 시 자동 로그아웃
- 204 응답: `clientFetch<void>` (`res.json()` 금지)

## Route Handler 목록
- catch-all: `/api/auth/*`, `/api/accounts/[[...path]]`, `/api/trading-cycles/[[...path]]`, `/api/portfolio/[[...path]]`, `/api/meta/[[...path]]`, `/api/privacy-trades/[[...path]]`, `/api/admin/[[...path]]`
- 전용: `auth/reapply-done`, `settings/telegram`, `auth/status-stream`(SSE), `trades/stream`(SSE)

## kista-api 주요 DTO 필드
- `UserResponse`: `id, nickname, status, hasTelegram, role, telegramBotUsername`
- `AccountResponse`: `id, nickname, accountNoMasked, broker` (strategyType/ticker 없음 — V35 이후)
- `TradingCycleResponse`: `id, accountId, type, status, ticker, cycleSeedType, initialUsdDeposit` (`multiple` 제거됨)

## React Query 캐시 키
`['profit', accountId, period]` / `['snapshots', accountId, period]` / `['accountMargin', accountId]` / `['accountCycleHistory', accountId, params]` / `['strategyCycleHistory', strategyId, params]` / `['nextOrderPreview', accountId]` / `['holidays', year, month]` / `['marketSession']`

## unstable_cache (Server Component 캐싱)
- TTL 5분, 태그: `lib/cache/tags.ts`(JWT suffix)
- 대상: listAccounts, listStrategies, getMe — KIS 실시간 제외
- `revalidateTag(tag, 'max')` — 2인자 필수
- 에러 핸들링: `try { await getCachedX() } catch {}` (`.catch()` 체인 금지)

## KIS live API quirk
- `getPrices` 쿼리: `?tickers=TQQQ&tickers=SOXL` 반복 파라미터 (콤마 금지)
- `MultiPriceResponse`: `{ prices: [{ticker, price}] }` → `getPrices()`에서 `PriceMap`으로 변환 필수
- KIS portfolio summary (`totalEvalProfit` 등): **KRW** (필드명에 Usd 있어도 KRW) → `ProfitDisplay currency="KRW"`

## MetaProvider
- `(main)/layout.tsx`에서 `GET /api/meta` prefetch → `<MetaProvider meta={meta}>`
- Client: `useMeta()` → `findStrategyType(code)`, `findTicker(code)`, `labelOf(category, code)`
- `(main)` 밖에서 `useMeta()` 호출 불가

## 날짜 파라미터 컨벤션
- `{ from, to }` ISO date string — `startDate/endDate` 금지
- `getPortfolioSnapshots`/`getAccountCycleHistory`: `{ from?, to? }` optional (`{}` 전달 시 전체 기간)

## PRIVACY 기준가
- `getPrivacyCurrentBase()` → `lib/api/privacy.ts`, 없으면 404
