# entities/ — 도메인 모델 · API 함수 · React Query 훅

FSD 계층에서 가장 저수준 도메인 레이어. `shared/`만 import 가능. 동일 계층 cross-import 금지.

## 의존성 규칙

```text
entities/{domain}  ->  shared/
```

entities끼리 직접 참조 금지. 두 도메인을 조합해야 하면 `features/` 또는 `widgets/`에서 처리.

## 슬라이스 목록

| 슬라이스 | 역할 |
|---|---|
| `account` | 계좌 CRUD, KIS 연결 테스트, 증거금 조회 |
| `strategy` | 전략(TradingCycle) CRUD, 일시정지/재개 |
| `order` | 다음 주문 미리보기, 주문 취소, 전략별 주문 내역 조회 |
| `trade` | 거래 내역, 사이클 히스토리, 수익 통계, SSE 거래 알림 |
| `user` | 현재 사용자 조회, 로그아웃, 재신청, 회원 탈퇴, 설정 변경 |
| `market` | 시장 휴일, 마켓 세션 |
| `meta` | 전략 타입/종목 메타데이터 (MetaProvider 포함) |
| `fcm` | FCM 토큰 등록/해제 (FcmAutoRegister 포함) |
| `privacy` | PRIVACY 전략 기준 매매표 |

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

- **Server Component prop → initialData**: 서버가 내려준 prop을 `useXxxQuery(id, initialData)`로 연결 — 뮤테이션 후 `invalidateQueries`로 즉시 리페치. `AccountDetailTabs`/`AdminPendingList` 등이 이 패턴 사용.
- **삭제 후 페이지 이동**: `invalidateQueries` 대신 `removeQueries` 사용 — `invalidateQueries`는 캐시를 만료 표시만 해 이동 후 stale 데이터 잠깐 표시됨. `useDeleteAccountMutation` 참고.
- Query 훅: `useXxxQuery` — `queryKey`, `queryFn`, 필요 시 `initialData`/`staleTime`
- Mutation 훅: `useXxxMutation` — `onSuccess`에 `toast.success` + `queryClient.invalidateQueries`, `onError`에 `toast.error` 캡슐화 필수
- 호출부에서 추가 동작이 필요하면 `mutation.mutate(data, { onSuccess: () => callback() })` 패턴 사용
- **SSR initialData 패턴**: `useMonthlyHolidaysQuery(year, month, holidays)` — `initialData` + `staleTime: 1h`로 마운트 시 재요청 방지

### queryKey 목록

`['accounts']`, `['accountMargin', accountId]`, `['accountPrices', accountId, tickers]`, `['strategies', accountId]`, `['strategies', 'all']`, `['nextOrderPreview', accountId]`, `['previewMargin', accountId]`, `['holidays', year, month]`, `['marketSession']`, `['accountCycleHistory', accountId, params]`, `['strategyCycleHistory', strategyId, params]`, `['profit', accountId, period]`, `['me']`, `['adminUsers', filter]`, `['strategy-orders', strategyId, from, to]`

## index.ts 규칙

각 슬라이스 최상단 `index.ts`가 public API. 외부에서 내부 파일 직접 import 금지.

```ts
import { deleteAccount } from '@entities/account'
```

## kista-api DTO 필드

- `UserResponse`: `{ id, nickname, status, hasTelegram, role, telegramBotUsername }`
- `AccountResponse`: `{ id, nickname, accountNoMasked, broker }`
- `TradingCycleResponse`: `{ id, accountId, type, status, ticker, cycleSeedType, initialUsdDeposit, divisionCount, isReverseMode, currentRound, currentHoldings, vr }`
- **TradingCycleResponse 필드 추가 시**: `entities/strategy/model/types.ts` + `entities/strategy/api/index.ts`의 `normalizeStrategy()`를 함께 수정
- **`divisionCount`**: INFINITE 전략 전용 분할 수 (20/30/40). VR/PRIVACY는 `undefined`로 정규화된다
- **`vr`**: VR 전략 전용 요약 `{ value, bandWidth, intervalWeeks, recurringAmount, poolLimit, gradient }`. 비VR은 없음
- **`isReverseMode`**: 리버스모드 활성 여부. `StrategyRequest`에는 없음
- **`StrategyRequest`**: VR 등록 시 `initialUsdDeposit`, `initialValue`, `intervalWeeks`, `bandWidth`, `recurringAmount`를 포함한다. 적립식 VR은 `initialUsdDeposit=0`, `initialValue=0` payload를 허용한다
- `PortfolioSnapshot`: `snapshotDate` 필드 제거됨 — 날짜는 `createdAt` 사용
- `AdminAnomalies`: 현재 필드 `pausedAccounts`, `inactiveAccounts`
- API 함수명은 `listAccounts(token?)`

## 주요 도메인별 quirk

- **account**: `accountNo`는 8자리만. `kisAccountType`은 항상 `"01"`. `AccountRequest` 필드명은 `appKey`, `secretKey`
- **strategy**: 백엔드 이름은 `TradingCycle`. pause/resume은 strategyId 기준. capability는 `StrategyTypeMeta` 필드를 직접 소비하고, 최소 시드는 `useStrategySeedPreviewQuery`를 사용한다. `seedBadgeClass()`를 재사용한다
- **meta**: `MetaProvider`는 `(main)/layout.tsx`에서만 제공. `TickerMeta.targetProfitRate`는 `string` 타입
- **trade/providers**: `TradeNotificationProvider`는 SSE `/api/trades/stream` 구독용
- **privacy**: Route Handler는 `app/api/privacy-trades/[[...path]]/route.ts`
- **fcm**: `registerTokenToServer`/`unregisterTokenFromServer`는 `clientFetch<void>` 사용

## KIS live API quirk

- **OVRS_EXCG_CD**: 거래소 코드는 `ticker.exchangeCode()` 사용
- **TTTC2101R 외화증거금**: `itgr_ord_psbl_amt`(통합주문가능금액) 사용 — 원화 자동 환전 포함. `frcr_dncl_amt_2`(환전 외화만) 사용 금지
- **`getPrices` 쿼리 직렬화**: 반복 파라미터만 허용
- **MultiPriceResponse**: 응답 `{ prices: [{ticker, price}] }`를 `PriceMap`으로 정규화해야 함
- **통화 주의**: `positions[].evalAmountUsd`는 USD, `summary.totalAssetUsd`/`totalEvalProfit`은 KRW
- **StatisticsController 응답 형식**: 신규 엔드포인트 추가 시 필드명 대조 필수
- **`GET /api/accounts/{id}/profit`**: 일부 필드는 서버 미전송이므로 `?? 0` 가드 필요

## OpenAPI 타입 생성

`shared/lib/api-types.ts`는 `openapi.json`에서 자동 생성된 타입 파일이다. 직접 수정하지 않는다.

```bash
npm run gen:types
```

새 enum 타입이 필요하면 `openapi.json` → `api-types.ts` → `api-schema.ts` 순으로 추가한다.

## API 날짜 파라미터

- `getAccountProfit` 등: `{ from, to }`
- `getAccountCycleHistory`: `{ from?, to? }`
- `getStrategyCycleHistory`: `{}` 전달 시 서버 기본값 `30d`
- `getDailyTransactions(accountId, {from, to}, token?)`
- `GET /api/trades`: `id, tradeDate, ticker, orderType, direction, quantity, price, status, kisOrderId`
- `GET /api/accounts/{id}/trades`: `Execution[] { tradeDate, ticker, direction, quantity, price, kisOrderId }`
