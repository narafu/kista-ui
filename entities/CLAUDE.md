# entities/ — 도메인 모델 · API 함수 · React Query 훅

FSD 계층에서 가장 저수준 도메인 레이어. `shared/`만 import 가능. 동일 계층 cross-import 금지.

## 의존성 규칙

```
entities/{domain}  →  shared/
```

entities끼리 직접 참조 금지. 두 도메인을 조합해야 하면 `features/` 또는 `widgets/`에서 처리.

## 슬라이스 목록

| 슬라이스 | 역할 |
|---|---|
| `account` | 계좌 CRUD, KIS 연결 테스트, 증거금 조회 |
| `strategy` | 전략(TradingCycle) CRUD, 일시정지/재개 |
| `order` | 다음 주문 미리보기, 주문 취소 |
| `trade` | 거래 내역, 사이클 히스토리, 수익 통계, SSE 거래 알림 |
| `user` | 현재 사용자 조회, 로그아웃, 재신청, 회원 탈퇴, 설정 변경 |
| `market` | 시장 휴일, 마켓 세션 |
| `meta` | 전략 타입/종목 메타데이터 (MetaProvider 포함) |
| `fcm` | FCM 토큰 등록/해제 (FcmAutoRegister 포함) |
| `portfolio` | 포트폴리오 스냅샷, 손익 |
| `privacy` | PRIVACY 전략 기준 매매표 |
| `admin-stats` | 어드민 통계/감사로그/이상감지 |

## 슬라이스 내부 구조

```
entities/{domain}/
  api/index.ts       # apiFetch/clientFetch 기반 API 함수
  model/types.ts     # TypeScript 타입/인터페이스
  hooks/             # React Query useXxxQuery / useXxxMutation
  providers/         # Context Provider (meta, fcm, trade 한정)
  index.ts           # public re-export만 (내부 파일 직접 import 금지)
```

## 훅 작성 패턴

- **Server Component prop → initialData**: 서버가 내려준 prop을 `useXxxQuery(id, initialData)`로 연결 — 뮤테이션 후 `invalidateQueries`로 즉시 리페치. `AccountDetailTabs`/`AdminPendingList` 등이 이 패턴 사용.
- **삭제 후 페이지 이동**: `invalidateQueries` 대신 `removeQueries` 사용 — `invalidateQueries`는 캐시를 만료 표시만 해 이동 후 stale 데이터 잠깐 표시됨. `useDeleteAccountMutation` 참고.
- Query 훅: `useXxxQuery` — `queryKey`, `queryFn`, 필요 시 `initialData`/`staleTime`
- Mutation 훅: `useXxxMutation` — `onSuccess`에 `toast.success` + `queryClient.invalidateQueries`, `onError`에 `toast.error` **캡슐화 필수**
- 호출부에서 추가 동작이 필요하면 `mutation.mutate(data, { onSuccess: () => callback() })` 패턴 사용
- **SSR initialData 패턴**: `useMonthlyHolidaysQuery(year, month, holidays)` — `initialData` + `staleTime: 1h`로 마운트 시 재요청 방지

### queryKey 목록

`['accounts']`, `['accountMargin', accountId]`, `['accountPrices', accountId, tickers]`, `['strategies', accountId]`, `['nextOrderPreview', accountId]`, `['previewMargin', accountId]`(widgets 내부), `['holidays', year, month]`(공유 캐시), `['marketSession']`, `['accountCycleHistory', accountId, params]`, `['strategyCycleHistory', strategyId, params]`, `['profit', accountId, period]`, `['snapshots', accountId, period]`, `['privacyCurrentBase']`, `['me']`, `['adminUsers', filter]`

## index.ts 규칙

각 슬라이스 최상단 `index.ts`가 public API. 외부에서 내부 파일 직접 import 금지.

```ts
// ❌ 금지
import { deleteAccount } from '@entities/account/api'
// ✅ 허용
import { deleteAccount } from '@entities/account'
```

## kista-api DTO 필드

- `UserResponse`: `{ id, nickname, status, hasTelegram, role, telegramBotUsername }`
- `AccountResponse`: `{ id, nickname, accountNoMasked, broker }` — strategyType/ticker/hasTelegram 없음 (V35 이후)
- `TradingCycleResponse`: `{ id, accountId, type, status, ticker, cycleSeedType, initialUsdDeposit }` — `multiple` 필드 제거됨(커밋 `e63cdfb2`)
- **TradingCycleResponse 필드 추가 시**: `entities/strategy/model/types.ts` + `entities/strategy/api/index.ts`의 `normalizeStrategy()` **두 곳 동시 업데이트 필수**. BigDecimal → `toNum()` 사용. 한 곳만 수정 시 런타임 `undefined`
- `PortfolioSnapshot`: `snapshotDate` 필드 제거됨 — 날짜는 `createdAt` 사용. `currentPrice`는 `number | null` → null 가드 필수
- `AdminAnomalies`: 현재 필드 `pausedAccounts`, `inactiveAccounts` — `failedTrades` 제거됨
- API 함수명은 `listAccounts(token?)` (`getAccounts` 아님) — token 생략 시 Route Handler 경유, 전달은 Server Component 전용

## 주요 도메인별 quirk

- **account**: `accountNo`는 8자리만(표시 형식 `74420614-01`). `kisAccountType`은 항상 `"01"`. `AccountRequest` 필드명: `kisAppKey`(≠apiKey), `kisSecretKey`(≠apiSecret). `AccountResponse`에 strategyType 없음.
- **strategy**: 백엔드 이름은 `TradingCycle`. 목록 `/api/accounts/{id}/trading-cycles`, 개별 `/api/trading-cycles/{id}`. pause/resume은 **strategyId 기준**(구 accountId 아님). `normalizeStrategy()`로 DTO → Strategy 변환. `cycleSeedType`: `NONE`(자동실행 off)/`MAX`(시드 MAX)/`MAINTAIN`(시드 유지) — `?? 'NONE'` 기본값.
  - **최소 시드**: INFINITE = `basePrice * 20 * 2 * 1.1`, PRIVACY = `currentCycleStart / 2`. 미달 시 등록 버튼 비활성화 (`StrategyForm`).
  - **INFINITE vs PRIVACY 판별**: 리터럴 직접 사용 금지. `typeMeta?.availableTickers?.length > 1` = INFINITE. API 인자도 `meta.tickers.map(t => t.code)` 사용 (하드코딩 금지).
- **meta**: `MetaProvider`는 `(main)/layout.tsx`에서만 제공 → `(main)` 밖 `useMeta()` 호출 불가. `useMeta()` → `findStrategyType(code)`, `findTicker(code)`, `labelOf(category, code)`. `TickerMeta.targetProfitRate`는 `string` 타입 — 사용 시 `parseFloat()` 변환 필요. `StrategyTypeMeta`에 `availableTickers` 포함(`defaultTicker`/`defaultMultiple` 없음) — UI 초기화는 `availableTickers[0]` + 상수 `"1"`.
- **trade/providers**: `TradeNotificationProvider` — SSE `/api/trades/stream` 구독, 체결 toast 표시. `(main)/layout.tsx`에 마운트.
- **privacy**: `getPrivacyCurrentBase()` 응답 `{ ticker, currentCycleStart, tradeDate }`, Route Handler `app/api/privacy-trades/[[...path]]/route.ts`. 기준 매매표 없으면 404.
- **fcm**: `registerTokenToServer`/`unregisterTokenFromServer` → `clientFetch<void>` 사용(raw fetch 금지 — 401 자동 로그아웃 누락). `fcm_device_tokens`은 사용자당 여러 토큰 허용, `save()` 중복 토큰 자동 skip. 발송 시점: 매매 결산·가입 승인·가입 거절(신규 가입·전략 변경은 텔레그램만).

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
