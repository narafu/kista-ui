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
| `admin` | 관리자 사용자 목록 조회, 승인/반려, 역할 변경, 강제 탈퇴 |
| `runtime-config` | 가입 승인, 증권사, 전략 등록 필드의 런타임 허용값/기본값 조회 |
| `admin-settings` | 관리자 런타임 설정 전체 조회·갱신 및 저장 후 관련 캐시 무효화 |
| `fcm` | FCM 토큰 등록/해제 (FcmAutoRegister 포함) |
| `privacy` | PRIVACY 전략 P 매매표 |
| `stats` | 전략 수익 통계 요약, 자산 곡선(벤치마크 포함), 사이클 성과 페이지 조회 |

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

`['accountMargin', accountId]`, `['accountPrices', accountId, tickers]`, `['strategies', accountId]`, `['strategies', 'all']`, `['strategySeedPreview', accountId, type, ticker, divisionCount]`, `['order-preview', 'strategy', strategyId]`, `['strategy-orders', strategyId, from, to]`, `['holidays', year, month]`, `['candles', ticker, count]`, `['fearGreed', days]`, `['marketSession']`, `['accountCycleHistory', accountId, params]`, `['strategyCycleHistory', strategyId, params]`, `['dailyTradesRange', accountIds.join(','), from, to]`, `['runtime-config']`, `['admin-settings']`, `['me']`, `['adminUsers', filter]`, `['statsSummary']`, `['equityCurve', from, to, benchmark]`, `['statsCycles', type ?? 'ALL']`

**캐시 공유 패턴**: 서로 다른 위젯이 동일 서버 데이터를 소비할 때, 훅 호출 파라미터를 일치시켜 queryKey를 맞추면 React Query 캐시를 공유해 중복 fetch를 피한다.

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
- `AdminAnomalies`: 현재 필드 `pausedAccounts`, `inactiveAccounts`
- API 함수명은 `listAccounts(token?)`

## 주요 도메인별 quirk

- **account**: `accountNo`는 8자리만. `kisAccountType`은 항상 `"01"`. `AccountRequest` 필드명은 `appKey`, `secretKey`
- **strategy**: 백엔드 이름은 `TradingCycle`. pause/resume은 strategyId 기준. capability는 `StrategyTypeMeta` 필드를 직접 소비하고, 최소 시드는 `useStrategySeedPreviewQuery`를 사용한다. `seedBadgeClass()`를 재사용한다
- **meta**: `MetaProvider`는 `(main)/layout.tsx`에서만 제공 — `(main)` 밖에서 `useMeta()` 호출 불가. Client는 `useMeta()`의 `findStrategyType(code)`/`findTicker(code)`/`labelOf(category, code)` 사용. `TickerMeta.targetProfitRate`는 `string` 타입
- **runtime-config**: `useRuntimeConfigQuery()`는 `cache: 'no-store'`, `staleTime: 0`, window focus refetch로 서버 설정을 최신화한다. 신규 계좌는 활성 증권사만, 신규 전략은 활성 타입과 각 필드의 `allowedValues`/`defaultValue`/`customizable`을 사용한다. 수정 화면의 기존 값은 런타임 허용 목록으로 덮어쓰지 않는다
- **admin-settings**: `GET/PUT /api/admin/settings`는 관리자 프록시를 사용한다. 저장은 optimistic update 없이 처리하고 성공 후 `admin-settings`와 `runtime-config`를 모두 무효화한다
- **trade/providers**: `TradeNotificationProvider`는 SSE `/api/trades/stream` 구독용
- **privacy**: 관리자 전용 — Server Component에서 apiFetch로 `/api/admin/privacy-trade-bases` 직접 호출 (Route Handler 없음)
- **fcm**: `registerTokenToServer`는 `clientFetch<void>` 사용 (토큰 해제 API는 클라이언트 미구현 — `app/api/fcm/tokens/[token]` DELETE 라우트만 존재)
- **stats**: `GET /api/stats/summary|equity-curve|cycles` 소비. `byType[].winRate`/`avgReturnRate`/`avgDurationDays`와 `CyclePerformance`의 `pnl`/`returnRate`/`durationDays`/`endDate`/`endAmount`는 미종료 사이클에서 `null` 가능 — 렌더링 시 null 가드 필수. `getStatsCycles`의 `nextCursor`는 없으면 응답에서 필드 자체가 생략되므로 옵셔널 처리

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
