# 코인 DCA(업비트 1차) UI 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 업비트 계좌 연결, 코인 DCA 등록·수정, 코인 계좌 상세(crypto-portfolio)와 키 만료 표시를 kista-ui에 추가한다. 업비트 계좌로 주식 전용 엔드포인트를 호출하지 않게 막는다.

**Architecture:** 계좌의 시장은 broker로 판정한다. 판정 함수는 `shared/lib/api-schema.ts`의 `isCryptoBroker`/`brokerCurrency` 정적 맵 하나다(Server Component에서도 쓴다). 계좌 객체가 없는 전략 위젯은 `meta.tickers[].market`으로 판정한다. DCA 폼은 `market` 값을 폼 값으로 갖고, `superRefine`이 시장별 규칙을 건다. 금액은 `fmtMoney(n, currency)`, 수량은 `fmtQuantity(n)`으로 표시한다.

**Tech Stack:** Next.js 16 App Router, TypeScript, React Query 5, react-hook-form + zod, Vitest + Testing Library, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-10-17-crypto-upbit-dca-design.md`. 끝부분 "api 계약 확정 내역"(A `0dc739c6`, B `8bbe3dc3`)이 본문보다 우선한다.

## Global Constraints

- 작업 위치는 워크트리 `/Users/phs/workspace/kista/kista-ui/.worktrees/crypto-upbit-dca`(브랜치 `feat/crypto-upbit-dca`)다. main 체크아웃은 건드리지 않는다.
- 포맷: 싱글 쿼트, 세미콜론 없음, import 중괄호 공백. 기존 파일 포맷을 일괄 변경하지 않는다.
- FSD 단방향 의존(`app -> widgets -> features -> entities -> shared`). 같은 계층 cross-import 금지. `features/account/create-account`와 `features/account/edit-account`는 서로 다른 슬라이스다.
- `any` 금지. 인라인 `style` 금지.
- 서버 상태를 `useState`에 복사하지 않는다. 오류 화면은 `isError && !data`일 때만 띄운다.
- 카피: 짧은 항목 설명은 명사구 + 마침표 없음. 완전한 문장은 "~습니다." 입력 안내·검증 오류는 "~하세요.", 시스템 실패 후 재시도는 "~해주세요." features/widgets의 인라인 토스트는 한 문장이면 마침표 없음. entities mutation 훅의 `onError` 토스트는 항상 마침표.
- `SelectTrigger`와 아이콘만 있는 버튼에는 `aria-label`을 단다.
- 업비트 최소 주문 금액은 5,000 KRW다. 코인 금액은 원 단위 정수다.
- `executionHour`는 0~23(KST)이고 기본값은 9다. 코인에서만 보내고 주식에서는 보내지 않는다.
- DCA 요청은 `amount`만 보낸다. `amountUsd`는 보내지 않는다(둘 다 다른 값으로 보내면 400).
- 코인 전략의 다음 실행일(`nextExecution`)은 표시하지 않는다. api 묶음 C 전까지 미국 거래일 기준이라 부정확하다.
- 1차 제외: 통계 통화 토글, 벤치마크·백테스트 코인 지원, 코인 전략 다음 실행일 표시.
- 테스트가 `vi.mock('@entities/account', () => ({ ... }))`나 `vi.mock('@entities/meta', ...)`처럼 모듈 전체를 mock하면, 컴포넌트가 새로 import하는 export(예: `brokerErrorMessage`, `findTicker`)를 mock factory에도 추가해야 한다. 순수 함수는 `async (importOriginal) => ({ ...(await importOriginal()), ... })`로 원본을 살린다.
- 검증 명령: 태스크 중에는 `npx vitest run <파일들>`과 `npm run typecheck`만 쓴다. `npm run lint`, `npm run knip`, 전체 `npm run test:run`은 Task 8에서 1회만 돌린다.
- 각 태스크의 커밋은 `git add`에 그 태스크 파일만 명시한다. 커밋 메시지는 한글, author `narafu <narafu@kakao.com>`. 괄호가 들어간 경로는 큰따옴표로 감싼다.
- api·infra 쪽 변경이 필요하면 직접 하지 않는다. "업비트 api" 세션(kista-api)이나 "업비트 infra" 세션에 메시지로 요청한다.

## Review Focus

1. **`executionHour: 0`(00시)**: `!v` 같은 truthy 검사를 쓰면 00시가 "미입력"으로 오판된다. 스키마는 `== null`로 판정해야 한다. Task 5에서 테스트로 고정한다.
2. **KRW 금액 경계**: 5000은 통과해야 하고, 4999와 5000.5는 거부해야 한다. 기존 입력은 `step="0.01"`, `inputMode="decimal"`이라 코인에서는 `step="1"`, `inputMode="numeric"`로 바꿔야 한다. Task 5에서 테스트로 고정한다.
3. **WEEKLY 요일**: 주식 계좌는 토·일을 고를 수 없어야 하고 고른 값이 있으면 스키마가 거부해야 한다. 코인 계좌는 7일이 모두 보여야 한다. Task 5에서 테스트로 고정한다.
4. **UPBIT 계좌번호 null**: `accountNoMasked`가 null이다. 계좌 요약의 계좌번호 KPI, 계좌 수정 화면의 계좌번호 입력, 확인 스텝의 계좌번호 행이 빈 값이나 크래시로 나오면 안 된다. Task 2·3·4에서 각각 테스트로 고정한다.
5. **현재가 null 보유 코인**: crypto-portfolio에서 `currentPrice: null`이면 "현재가 확인 불가"로 표시하고 평가금액을 0원으로 보여주지 않는다. Task 4에서 테스트로 고정한다.

추가로 볼 것: 기존 주식 DCA 전략 수정 화면이 `amount`가 없는 응답(`amountUsd`만 있는 응답)에서도 금액을 채워야 한다(normalizer가 `amount ?? amountUsd`). Task 5에서 테스트로 고정한다.

## 코인 계좌 쿼리 게이팅 판정표

B 확정 내역에 따르면 UPBIT 계좌로 `portfolio`·`margin`·`daily-trades`·`prices`·통계를 부르면 400이다. 소비처마다 api 소스(`kista-api-worktrees/crypto-upbit-dca` @8bbe3dc3)로 확인한 판정이다.

| 호출 | 소비처 | 판정 | 근거·처리 |
|---|---|---|---|
| `GET /api/accounts/{id}/portfolio` | `app/(main)/accounts/[id]/page.tsx:37` prefetch, `widgets/account-detail/AccountDetailContent.tsx:27` | **막음 (Task 4)** | `isMockBroker` 게이트를 `isMockBroker \|\| isCryptoBroker`로 넓힌다. SSR과 클라이언트를 같은 조건으로 맞춘다 |
| `GET /api/accounts/{id}/margin` | `features/strategy/create-strategy/model/useStrategyFormData.ts:23` | **막음 (Task 4)** | `StrategyForm`은 DCA로 분기하기 전에 `useStrategyForm`을 호출하므로 DCA 폼에서도 실행된다. `balanceCheckEnabled`에 `!isCrypto`를 더한다 |
| `GET /api/accounts/{id}/prices` | `useStrategyFormData.ts:29` | **막음 + 티커 필터 (Task 4)** | 코인 계좌는 `enabled: false`. 주식 계좌도 지금 `meta.tickers` 전체(BTC·ETH 포함 8개)를 보낸다. 로컬 확인 결과 KIS 계좌에 `BTC`를 보내면 400이 아니라 미국 상장 ETF `BTC`의 가격(36.03)이 온다. 의미가 틀리고 api 상한(10개)에도 다가가므로 `market !== 'CRYPTO_KRW'` 티커만 보낸다 |
| `GET /api/daily-trades` (유저 스코프) | `widgets/market-holiday-calendar/WeeklyMarketCalendar.tsx:216` | **400 아님 — 게이팅 불필요** | `AccountStatisticsService.getDailyTransactionsForUser`(:67-74)가 `US_STOCK` 체결만 거른다. 다만 `accountIds`가 "대기" 배지(:127)와 범례(:270)에도 쓰이므로 주식 계좌 id만 넘긴다(Task 4) |
| `GET /api/accounts/{id}/daily-trades` | 없음 | 해당 없음 | UI가 호출하지 않는다 |
| 통계 summary·equity-curve | `app/(main)/stats/page.tsx:27`, `StatsOverview` | **400 아님** | 유저 스코프이고 DCA는 통계 집계에서 빠진다(spec "통계"). 변경 없음 |
| 통계 cycles(`accountId` 필터) | `widgets/stats-overview/CyclePerformanceList.tsx:41-62` | **400 아님, 선택지에서 숨김 (Task 4)** | DB 조회라 오류는 없지만 코인 계좌는 항상 비어 있다. 계좌 선택지에서 뺀다 |
| `GET /api/accounts/{id}/trading-cycles/previews` | `page.tsx:35` | **400 아님** | `TradingPreviewService.previewBatch`(:82)가 DCA 전략을 거른다. 코인 계좌는 DCA만 있으므로 빈 맵 |
| `GET /api/accounts/{id}/cycle-history` | `widgets/account-detail/TradesTab.tsx` | **400 아님, 코인 계좌에서 숨김 (Task 4)** | DB 조회지만 DCA는 사이클 포지션 이력을 쓰지 않는다. 표가 USD 예수금 열을 가지므로 코인 계좌에서는 렌더하지 않는다 |
| 벤치마크 전략 목록 | `widgets/benchmark-comparison/model/useBenchmarkStrategyOptions.ts:21` | **숨김 (Task 4)** | MOCK 필터 옆에 코인 계좌 필터를 더한다 |
| 백테스트 티커 | `features/backtest/run-backtest/model/useBacktestForm.ts:36` | **변경 불필요** | `BacktestType = 'INFINITE' \| 'PRIVACY' \| 'VR'`이고 이 타입들의 `availableTickers`에 코인이 없다 |

DCA skip 사유 3종(`BELOW_MIN_ORDER_AMOUNT`, `EXCHANGE_API_ERROR`, `API_KEY_EXPIRED`) 라벨: 코드 변경 없음. 라벨은 meta `dcaSkipReasons`가 SSOT이고(`labelOf('dcaSkipReasons', ...)` — `DcaExecutionHistory.tsx:59`, `DcaStrategyCard.tsx:26`), 로컬 api의 meta가 이미 세 코드의 한글 라벨을 내려준다.

주식 DCA의 `executionHour`: api가 null로 준다(`V9__dca_amount_execution_hour.sql` "주식은 NULL", `DcaResponse.java:22`). 그래서 `formatDcaSchedule`이 값이 있을 때만 시각을 붙여도 주식 카드에 "09시"가 붙지 않는다.

대시보드 USD 합산 지점: 없다. `widgets/dashboard/DashboardContent.tsx`는 계좌 목록으로 빈 상태만 분기하고, `DashboardOverview.tsx`는 시장 지표만 그린다. 금액 합산은 `WeeklyMarketCalendar`의 일별 체결 요약뿐이고 서버가 주식만 넘긴다. 그래서 spec ④ "대시보드"는 이번에 할 일이 없다.

## 파일 구조

| 파일 | 책임 | 태스크 |
|---|---|---|
| `openapi.json`, `shared/lib/api-types.ts` | 재생성 결과 커밋 | 1 |
| `shared/lib/api-schema.ts` | `TradingMarket`, `Currency`, `isCryptoBroker`, `brokerCurrency`, `isCryptoMarket`, `BROKER_LABEL.UPBIT` | 1 |
| `shared/lib/api-schema.test.ts` (신규) | 위 판정 함수 테스트 | 1 |
| `shared/lib/format/index.ts` (+test) | `fmtMoney`, `fmtQuantity` | 1 |
| `entities/account/model/types.ts` | `accountNoMasked: string \| null`, `apiKeyExpiresAt` | 1 |
| `entities/meta/model/types.ts` | `TickerMeta.market` | 1 |
| `entities/runtime-config/model/types.ts` | `brokers[*].allowedIp` | 1 |
| `entities/account/model/brokerCredentials.ts` (신규, +test) | 브로커별 키 라벨, 자격증명 오류 문구, `brokerErrorMessage` | 2 |
| `features/account/create-account/**` | UPBIT 흐름, IP 안내, 오류 매핑 | 1(컴파일), 2 |
| `entities/account/api`, `hooks` | `updateCredentials`, `useUpdateCredentialsMutation`, `useAccountPricesQuery` options | 3, 4 |
| `entities/trade/api`, `model` | `getCryptoPortfolio`, `tradeKeys.cryptoPortfolio`, `cryptoPortfolioQueryOptions` (체결 SSE 무효화 대상 `tradeKeys.all` 아래) | 4 |
| `entities/account/model/apiKeyExpiry.ts` (신규, +test) | 만료 상태 판정 | 3 |
| `features/account/edit-account/EditAccountForm.tsx` | 키 재등록 섹션, UPBIT 계좌번호 숨김 | 3 |
| `widgets/account-card/AccountCard.tsx`, `widgets/account-detail/*` | 만료 배지, 코인 포트폴리오, 게이팅 | 3, 4 |
| `features/strategy/create-strategy/**` | 게이팅·티커 필터(4), 코인 DCA 폼(5) | 4, 5 |
| `entities/strategy/model/*`, `entities/strategy/api/index.ts` | DCA 타입·normalizer·요일·스케줄 포맷 | 5 |
| `widgets/strategy-card/DcaStrategyCard.tsx`, `widgets/strategy-detail/Dca*`, 수량 표시처, `widgets/admin-trade-list/AdminTradesTable.tsx` | 통화·수량 표시 | 6 |

---

### Task 1: 계약 동기화와 공통 기반

`npm run gen:types` 결과를 커밋하고, 타입 변경으로 깨진 컴파일을 고친다. 이후 태스크가 쓸 판정 함수와 포맷 함수를 만든다.

**Files:**
- Commit (이미 재생성됨): `openapi.json`, `shared/lib/api-types.ts`
- Modify: `shared/lib/api-schema.ts`
- Create: `shared/lib/api-schema.test.ts`
- Modify: `shared/lib/format/index.ts`, `shared/lib/format/index.test.ts`
- Modify: `entities/account/model/types.ts`
- Modify: `entities/meta/model/types.ts`
- Modify: `entities/runtime-config/model/types.ts`
- Modify: `features/account/create-account/steps/ApiStep.tsx:17-40,72-73`
- Modify: `features/account/create-account/steps/AccountInfoStep.tsx:55-58`
- Modify: `features/account/edit-account/EditAccountForm.tsx:100`
- Modify: `features/admin/settings/ui/AdminSettingsForm.tsx:33`
- Modify (fixture): `features/admin/settings/model/validateAdminSettings.test.ts:7`, `features/admin/settings/ui/AdminSettingsForm.lifecycle.test.tsx:49`, `features/admin/settings/ui/AdminSettingsForm.test.tsx:41`

**Interfaces:**
- Produces:
  - `type TradingMarket = 'US_STOCK' | 'CRYPTO_KRW'`
  - `type Currency = 'USD' | 'KRW'`
  - `isCryptoBroker(broker: string | null | undefined): boolean`
  - `brokerCurrency(broker: string | null | undefined): Currency` (모르는 broker는 `'USD'`)
  - `isCryptoMarket(market: string | null | undefined): boolean`
  - `fmtMoney(n: number, currency: Currency): string` — USD `"$1,234.50"`, KRW `"1,234원"`
  - `fmtQuantity(n: number): string` — 정수 그대로, 소수는 최대 8자리에서 끝 0 제거
  - `Account.accountNoMasked: string | null`, `Account.accountNo?: string | null`, `Account.apiKeyExpiresAt?: string | null`
  - `TickerMeta.market?: string`
  - `RuntimeConfig.brokers: Record<RuntimeBrokerCode, { enabled: boolean; allowedIp?: string }>`

- [ ] **Step 1: 재생성 상태 확인**

Run: `git status --short && npm run typecheck 2>&1 | grep -c "error TS"`
Expected: `openapi.json`, `shared/lib/api-types.ts`만 변경됨. 오류 5건(ApiStep 1, AccountInfoStep 1, admin settings 테스트 fixture 3). 다르면 멈추고 보고한다. 로컬 kista-api가 떠 있다면 `npm run fetch:spec && npm run gen:types`로 다시 만들어 diff가 같은지 본다.

- [ ] **Step 2: 판정 함수 테스트 작성**

Create `shared/lib/api-schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { brokerCurrency, formatBrokerLabel, isCryptoBroker, isCryptoMarket } from './api-schema'

describe('isCryptoBroker', () => {
  it('업비트만 코인 거래소로 본다', () => {
    expect(isCryptoBroker('UPBIT')).toBe(true)
    expect(isCryptoBroker('KIS')).toBe(false)
    expect(isCryptoBroker('TOSS')).toBe(false)
    expect(isCryptoBroker('MOCK')).toBe(false)
  })

  it('빈 값과 모르는 broker는 코인이 아니다', () => {
    expect(isCryptoBroker(undefined)).toBe(false)
    expect(isCryptoBroker(null)).toBe(false)
    expect(isCryptoBroker('')).toBe(false)
    expect(isCryptoBroker('BITHUMB')).toBe(false)
  })
})

describe('brokerCurrency', () => {
  it('업비트는 KRW, 주식 broker는 USD다', () => {
    expect(brokerCurrency('UPBIT')).toBe('KRW')
    expect(brokerCurrency('KIS')).toBe('USD')
    expect(brokerCurrency('MOCK')).toBe('USD')
  })

  it('모르는 broker는 USD로 둔다', () => {
    expect(brokerCurrency(undefined)).toBe('USD')
  })
})

describe('isCryptoMarket', () => {
  it('CRYPTO_KRW만 코인 시장이다', () => {
    expect(isCryptoMarket('CRYPTO_KRW')).toBe(true)
    expect(isCryptoMarket('US_STOCK')).toBe(false)
    // 1h 메타 캐시로 market이 빠진 티커는 주식으로 본다
    expect(isCryptoMarket(undefined)).toBe(false)
  })
})

describe('formatBrokerLabel', () => {
  it('업비트 라벨을 갖는다', () => {
    expect(formatBrokerLabel('UPBIT')).toBe('업비트')
  })
})
```

- [ ] **Step 3: 포맷 테스트 작성**

`shared/lib/format/index.test.ts`의 import 줄에 `fmtMoney, fmtQuantity`를 더하고 파일 끝에 추가:

```ts
describe('fmtMoney', () => {
  it('USD는 $와 소수 둘째 자리로 표시한다', () => {
    expect(fmtMoney(1234.5, 'USD')).toBe('$1,234.50')
  })

  it('KRW는 원 단위로 표시한다', () => {
    expect(fmtMoney(1234567, 'KRW')).toBe('1,234,567원')
  })
})

describe('fmtQuantity', () => {
  it('정수는 그대로 표시한다', () => {
    expect(fmtQuantity(12)).toBe('12')
    expect(fmtQuantity(0)).toBe('0')
  })

  it('소수는 최대 8자리에서 끝의 0을 지운다', () => {
    expect(fmtQuantity(0.000123)).toBe('0.000123')
    expect(fmtQuantity(1.5)).toBe('1.5')
    expect(fmtQuantity(0.123456789)).toBe('0.12345679')
  })

  it('8자리 아래로 내려가는 값은 0으로 표시한다', () => {
    expect(fmtQuantity(0.000000001)).toBe('0')
  })
})
```

- [ ] **Step 4: 테스트 실패 확인**

Run: `npx vitest run shared/lib/api-schema.test.ts shared/lib/format/index.test.ts`
Expected: FAIL. `isCryptoBroker`, `fmtMoney`, `fmtQuantity`가 export되지 않았다.

- [ ] **Step 5: `shared/lib/api-schema.ts` 구현**

`BROKER_LABEL`에 `UPBIT: '업비트',`를 추가한다. `isMockBroker` 아래에 추가:

```ts
export type TradingMarket = 'US_STOCK' | 'CRYPTO_KRW'
export type Currency = 'USD' | 'KRW'

// meta.brokers[].market과 같은 값이다. Server Component(계좌 상세 prefetch)에서도 판정해야 해서 정적 맵으로 둔다.
// Record<BrokerCode, …>라 gen:types로 broker가 추가되면 typecheck가 여기서 깨진다.
const BROKER_MARKET: Record<BrokerCode, TradingMarket> = {
  KIS: 'US_STOCK',
  TOSS: 'US_STOCK',
  MOCK: 'US_STOCK',
  UPBIT: 'CRYPTO_KRW',
}

const MARKET_CURRENCY: Record<TradingMarket, Currency> = {
  US_STOCK: 'USD',
  CRYPTO_KRW: 'KRW',
}

function brokerMarket(broker: string | null | undefined): TradingMarket {
  return (broker && BROKER_MARKET[broker as BrokerCode]) || 'US_STOCK'
}

// 코인 거래소 계좌 — 주식 시세·잔고 엔드포인트(portfolio/margin/prices)를 부르면 400이라 쿼리를 막는 기준
export function isCryptoBroker(broker: string | null | undefined): boolean {
  return brokerMarket(broker) === 'CRYPTO_KRW'
}

// 계좌에 귀속된 금액의 표시 통화. 통화 간 환산은 하지 않는다
export function brokerCurrency(broker: string | null | undefined): Currency {
  return MARKET_CURRENCY[brokerMarket(broker)]
}

// 티커 시장(meta.tickers[].market) 판정 — 1h 메타 캐시로 market이 빠진 응답은 주식으로 본다
export function isCryptoMarket(market: string | null | undefined): boolean {
  return market === 'CRYPTO_KRW'
}
```

- [ ] **Step 6: `shared/lib/format/index.ts` 구현**

파일 상단 import에 `import type { Currency } from '@shared/lib/api-schema'`를 추가하고, `fmtSignedKrw` 아래에 추가:

```ts
/** 계좌 통화 금액 — USD는 "$1,234.50", KRW는 "1,234원" */
export function fmtMoney(n: number, currency: Currency): string {
  return currency === 'KRW' ? fmtKrw(n) : `$${fmtUsd(n)}`
}

/** 수량 — 주식은 정수 그대로, 코인은 최대 8자리 소수에서 끝의 0을 지운다 */
export function fmtQuantity(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(8).replace(/\.?0+$/, '')
}
```

`fmtSignedMoney`는 만들지 않는다. spec이 쓰는 곳으로 든 통계가 1차 제외라 소비처가 없다(knip이 잡는다).

- [ ] **Step 7: 테스트 통과 확인**

Run: `npx vitest run shared/lib/api-schema.test.ts shared/lib/format/index.test.ts`
Expected: PASS

- [ ] **Step 8: 수기 타입 갱신**

`entities/account/model/types.ts`:

```ts
export interface Account {
  id: string
  nickname: string
  accountNoMasked: string | null // 업비트는 계좌번호가 없어 null
  accountNo?: string | null
  broker: BrokerCode
  apiKeyExpiresAt?: string | null // 업비트 API 키 만료 시각(ISO). 만료일을 모르는 broker는 null
}
```

`currency` 필드는 두지 않는다. 금액 통화는 `brokerCurrency(account.broker)`로 얻는다.

`entities/meta/model/types.ts`의 `TickerMeta`에 추가:

```ts
  market?: string // 'US_STOCK' | 'CRYPTO_KRW' — 1h 메타 캐시로 빠질 수 있어 optional, isCryptoMarket으로 판정
```

`entities/runtime-config/model/types.ts`:

```ts
  brokers: Record<RuntimeBrokerCode, { enabled: boolean; allowedIp?: string }> // allowedIp: 업비트 허용 IP 안내용 서버 공인 IP
```

- [ ] **Step 9: 컴파일 오류 수정**

`features/account/create-account/steps/AccountInfoStep.tsx:55-58`을 "계좌번호 설정이 없는 broker는 별칭만 받는다"로 일반화한다. `ACCOUNT_CONFIG` 위에 타입을 두고 조회를 바꾼다:

```ts
type AccountNoConfig = (typeof ACCOUNT_CONFIG)[keyof typeof ACCOUNT_CONFIG]
```

```ts
  const broker = (data.broker || 'KIS') as BrokerCode
  const isMock = isMockBroker(broker)
  // 계좌번호 설정이 없는 broker(MOCK, UPBIT)는 별칭만 받는다
  const config: AccountNoConfig | null = (ACCOUNT_CONFIG as Partial<Record<BrokerCode, AccountNoConfig>>)[broker] ?? null
```

같은 파일에서 `isMock`로 계좌번호를 분기하던 곳을 `config`로 바꾼다. 문구 분기(`isMock ? '계좌 별칭' : ...`)는 Task 2에서 고친다. 바꿀 곳:
- `const accountNoValid = !config || config.pattern.test(accountNo)`
- `const showAccountNoError = !!config && touchedAccountNo && accountNo.length > 0 && !accountNoValid`
- `onNext({ nickname: nickname.trim(), accountNo: config ? accountNo : '' })`

`features/account/create-account/steps/ApiStep.tsx`의 `BROKER_CONFIG`에 UPBIT를 추가하고, 이분법 조회를 config 조회로 바꾼다:

```ts
  UPBIT: {
    title: '업비트 API 키 입력',
    desc: '업비트 Open API 키를 입력하세요.',
    keyLabel: 'Access Key',
    secretLabel: 'Secret Key',
    linkHref: 'https://upbit.com/mypage/open_api_management',
    linkLabel: '업비트 Open API 키 발급',
    needsTest: true,
    hint: '로그인 후 마이페이지 [Open API 관리]에서 API 키를 발급받을 수 있습니다.',
    minLen: 10,
  },
```

```ts
  // MOCK은 이 스텝을 렌더하지 않는다(CreateAccountStepper가 건너뜀)
  const broker = data.broker as Exclude<BrokerCode, 'MOCK'>
  const config = BROKER_CONFIG[broker]
```

`linkHref`는 커밋 전에 `curl -sI https://upbit.com/mypage/open_api_management | head -1`로 응답을 확인한다. 404면 `https://upbit.com/service_center/open_api_guide`로 바꾼다.

`features/account/edit-account/EditAccountForm.tsx:100`: `defaultValue={account.accountNoMasked ?? ''}`. 필드 숨김은 Task 3에서 한다.

admin settings 테스트 fixture 3곳의 `brokers` 객체에 `UPBIT: { enabled: true },`를 추가한다.

`features/admin/settings/ui/AdminSettingsForm.tsx:33`:

```ts
const DCA_TICKER_SUGGESTIONS = ['UPRO', 'QLD', 'BTC', 'ETH']
```

- [ ] **Step 10: 검증**

Run: `npm run typecheck && npx vitest run shared/lib features/account/create-account features/account/edit-account features/admin/settings`
Expected: typecheck 오류 0, 테스트 PASS.

- [ ] **Step 11: 커밋**

```bash
git add openapi.json shared/lib/api-types.ts shared/lib/api-schema.ts shared/lib/api-schema.test.ts \
  shared/lib/format/index.ts shared/lib/format/index.test.ts \
  entities/account/model/types.ts entities/meta/model/types.ts entities/runtime-config/model/types.ts \
  features/account/create-account/steps/ApiStep.tsx features/account/create-account/steps/AccountInfoStep.tsx \
  features/account/edit-account/EditAccountForm.tsx features/admin/settings
git commit -m "feat: 업비트 api 계약 타입을 반영하고 시장·통화 판정과 금액·수량 포맷을 추가한다"
```

---

### Task 2: 업비트 계좌 연결 흐름

**Files:**
- Create: `entities/account/model/brokerCredentials.ts`, `entities/account/model/brokerCredentials.test.ts`
- Modify: `entities/account/index.ts`
- Modify: `features/account/create-account/CreateAccountStepper.tsx`
- Modify: `features/account/create-account/steps/BrokerStep.tsx:14-18`
- Modify: `features/account/create-account/steps/ApiStep.tsx`
- Modify: `features/account/create-account/steps/ApiStepParts.tsx` (`ConnectionTest`, 신규 `UpbitKeyGuide`)
- Modify: `features/account/create-account/steps/AccountInfoStep.tsx`
- Modify: `features/account/create-account/steps/ConfirmStep.tsx`
- Test: `CreateAccountStepper.test.tsx`, `steps/BrokerStep.test.tsx`, `steps/ApiStep.test.tsx`, `steps/AccountInfoStep.test.tsx`, `steps/ConfirmStep.test.tsx`

**Interfaces:**
- Consumes: Task 1의 `RuntimeConfig.brokers.UPBIT.allowedIp`, `BROKER_CONFIG.UPBIT`
- Produces (`@entities/account`에서 export):
  - `type CredentialBroker = Exclude<BrokerCode, 'MOCK'>`
  - `BROKER_CREDENTIAL: Record<CredentialBroker, { keyLabel: string; secretLabel: string; invalidMessage: string }>`
  - `brokerErrorMessage(err: unknown, credentialInvalidMessage: string, fallback: string): string`

- [ ] **Step 1: 오류 매핑 테스트 작성**

Create `entities/account/model/brokerCredentials.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { ApiError } from '@shared/lib/api-client'
import { brokerErrorMessage } from './brokerCredentials'

function apiError(status: number, code: string, detail = '서버 메시지') {
  return new ApiError(status, { code, detail })
}

describe('brokerErrorMessage', () => {
  it('자격증명 오류는 호출부가 넘긴 broker별 문구를 쓴다', () => {
    expect(brokerErrorMessage(apiError(422, 'BROKER_CREDENTIAL_INVALID'), '키를 확인하세요.', '실패'))
      .toBe('키를 확인하세요.')
  })

  it('IP 미허용·권한 부족·호출 제한은 고정 문구로 구분한다', () => {
    expect(brokerErrorMessage(apiError(422, 'BROKER_IP_NOT_ALLOWED'), 'x', '실패')).toContain('허용 IP')
    expect(brokerErrorMessage(apiError(422, 'BROKER_PERMISSION_DENIED'), 'x', '실패')).toContain('권한')
    expect(brokerErrorMessage(apiError(429, 'BROKER_RATE_LIMITED'), 'x', '실패')).toContain('잠시 후')
  })

  it('그 외 코드는 서버 detail을 쓰고, detail이 없으면 fallback을 쓴다', () => {
    expect(brokerErrorMessage(apiError(409, 'DUPLICATE_ACCOUNT', '이미 등록된 계좌입니다.'), 'x', '실패'))
      .toBe('이미 등록된 계좌입니다.')
    expect(brokerErrorMessage(new Error('network'), 'x', '실패')).toBe('실패')
  })
})
```

`ApiError` 생성자 시그니처는 `shared/lib/api-client`에서 확인하고 맞춘다(필요하면 `entities/account/api/index.test.ts`의 사용례를 따른다).

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run entities/account/model/brokerCredentials.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현**

Create `entities/account/model/brokerCredentials.ts`:

```ts
import { apiErrorCode, apiMsg } from '@shared/lib/api-client'
import type { ErrorCode } from '@shared/lib/api-schema'
import type { BrokerCode } from './types'

export type CredentialBroker = Exclude<BrokerCode, 'MOCK'>

// 계좌 등록 확인 스텝·키 재등록에서 자격증명 오류(BROKER_CREDENTIAL_INVALID)일 때 짚어줄 입력 항목
export const BROKER_CREDENTIAL: Record<CredentialBroker, { keyLabel: string; secretLabel: string; invalidMessage: string }> = {
  KIS: { keyLabel: 'App Key', secretLabel: 'App Secret', invalidMessage: 'App Key, App Secret 또는 계좌번호를 다시 확인하세요.' },
  TOSS: { keyLabel: 'Client ID', secretLabel: 'Client Secret', invalidMessage: 'Toss 자격증명 인증에 실패했습니다. Client ID와 Client Secret을 확인하세요.' },
  UPBIT: { keyLabel: 'Access Key', secretLabel: 'Secret Key', invalidMessage: 'Access Key와 Secret Key를 다시 확인하세요. 만료된 키는 업비트에서 새로 발급받으세요.' },
}

const BROKER_ERROR_MESSAGE: Partial<Record<ErrorCode, string>> = {
  BROKER_IP_NOT_ALLOWED: '허용 IP가 등록되지 않았습니다. 거래소 API 키 설정에 안내된 IP를 추가하세요.',
  BROKER_PERMISSION_DENIED: 'API 키 권한이 부족합니다. 자산 조회, 주문 조회, 주문하기 권한을 켜세요.',
  BROKER_RATE_LIMITED: '요청이 많아 잠시 제한되었습니다. 잠시 후 다시 시도해주세요.',
}

// 연결 테스트·계좌 등록·키 재등록 실패 문구. 자격증명 오류만 broker별 입력 항목을 짚고, 나머지는 서버 detail을 쓴다
export function brokerErrorMessage(err: unknown, credentialInvalidMessage: string, fallback: string): string {
  const code = apiErrorCode(err)
  if (code === 'BROKER_CREDENTIAL_INVALID') return credentialInvalidMessage
  return (code && BROKER_ERROR_MESSAGE[code]) || apiMsg(err, fallback)
}
```

`entities/account/index.ts`에 추가:

```ts
export { BROKER_CREDENTIAL, brokerErrorMessage } from './model/brokerCredentials'
export type { CredentialBroker } from './model/brokerCredentials'
```

Run: `npx vitest run entities/account/model/brokerCredentials.test.ts` → PASS

- [ ] **Step 4: 흐름 테스트 작성**

`CreateAccountStepper.test.tsx`에 UPBIT 흐름 테스트를 추가한다. 기존 MOCK 테스트(`:33-34`)의 mock 구성을 그대로 쓰고, runtime-config mock의 `brokers`에 `UPBIT: { enabled: true, allowedIp: '168.107.63.152' }`를, meta mock의 `brokers`에 `{ code: 'UPBIT', label: '업비트' }`를 더한다:

```tsx
it('업비트는 증권사 → API 키 → 계좌 별칭 → 확인 4단계다', async () => {
  const user = userEvent.setup()
  render(<CreateAccountStepper />)
  await user.click(screen.getByRole('button', { name: /업비트/ }))
  expect(screen.getByText('계좌 별칭')).toBeInTheDocument() // 스텝퍼 3번째 라벨
  expect(screen.getByRole('heading', { name: '업비트 API 키 입력' })).toBeInTheDocument()
})
```

`steps/ApiStep.test.tsx`: runtime-config mock을 추가하고(`vi.mock('@entities/runtime-config', () => ({ useRuntimeConfigQuery: () => ({ data: { brokers: { UPBIT: { enabled: true, allowedIp: '168.107.63.152' } } } }) }))`), `@entities/account` mock factory에 `brokerErrorMessage`를 원본으로 살린다(Global Constraints 참고). 테스트 추가:

```tsx
it('업비트는 허용 IP와 필요한 권한을 안내하고 출금 권한을 켜지 말라고 강조한다', () => {
  render(<ApiStep data={{ ...baseData, broker: 'UPBIT' }} onNext={vi.fn()} onBack={vi.fn()} />)
  expect(screen.getByText('168.107.63.152')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '허용 IP 복사' })).toBeInTheDocument()
  expect(screen.getByText(/자산 조회, 주문 조회, 주문하기/)).toBeInTheDocument()
  expect(screen.getByText(/출금하기 권한은 켜지 마세요/)).toBeInTheDocument()
})

it('업비트도 연결 테스트를 통과해야 다음으로 넘어간다', async () => {
  mockState = { isPending: false, isSuccess: false, isError: false }
  const user = userEvent.setup()
  render(<ApiStep data={{ ...baseData, broker: 'UPBIT' }} onNext={vi.fn()} onBack={vi.fn()} />)
  await user.type(screen.getByLabelText(/Access Key/), 'access-key-1234')
  await user.type(screen.getByLabelText(/Secret Key/), 'secret-key-1234')
  expect(screen.getByRole('button', { name: '다음' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: '연결 테스트' }))
  expect(testMutateMock).toHaveBeenCalledWith({ appKey: 'access-key-1234', appSecret: 'secret-key-1234', broker: 'UPBIT' })
})

it('연결 테스트가 IP 미허용으로 실패하면 IP 안내 문구를 보여준다', () => {
  mockState = { isPending: false, isSuccess: false, isError: true }
  mockError = new ApiError(422, { code: 'BROKER_IP_NOT_ALLOWED', detail: 'x' })
  render(<ApiStep data={{ ...baseData, broker: 'UPBIT', apiKey: 'access-key-1234', apiSecret: 'secret-key-1234' }} onNext={vi.fn()} onBack={vi.fn()} />)
  expect(screen.getByText(/허용 IP가 등록되지 않았습니다/)).toBeInTheDocument()
})
```

mock 상태에 `error`를 넣으려면 `let mockError: unknown = null`을 두고 mock 반환값에 `error: mockError`를 추가한다.

`steps/AccountInfoStep.test.tsx`:

```tsx
it('업비트는 계좌번호 없이 별칭만 받는다', async () => {
  const onNext = vi.fn()
  const user = userEvent.setup()
  render(<AccountInfoStep data={{ ...baseData, broker: 'UPBIT' }} onNext={onNext} onBack={vi.fn()} />)
  expect(screen.queryByLabelText(/계좌번호/)).not.toBeInTheDocument()
  expect(screen.getByRole('heading', { name: '계좌 별칭' })).toBeInTheDocument()
  await user.type(screen.getByLabelText(/계좌 별칭/), '코인 계좌')
  await user.click(screen.getByRole('button', { name: '다음' }))
  expect(onNext).toHaveBeenCalledWith({ nickname: '코인 계좌', accountNo: '' })
})
```

`steps/ConfirmStep.test.tsx`:

```tsx
it('업비트는 계좌번호 없이 키만 보낸다', async () => {
  const user = userEvent.setup()
  render(<ConfirmStep data={{ broker: 'UPBIT', apiKey: 'access-key-1234', apiSecret: 'secret-key-1234', accountNo: '', nickname: '코인' }} onBack={vi.fn()} />)
  expect(screen.queryByText('계좌번호')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '계좌 연결' }))
  expect(mutateMock).toHaveBeenCalledWith(
    { nickname: '코인', appKey: 'access-key-1234', secretKey: 'secret-key-1234', broker: 'UPBIT' },
    expect.anything(),
  )
})

it('업비트 자격증명 오류는 Access Key·Secret Key를 짚는다', () => {
  mockState = { ...mockState, isError: true, error: new ApiError(422, { code: 'BROKER_CREDENTIAL_INVALID' }) }
  render(<ConfirmStep data={{ broker: 'UPBIT', apiKey: 'k', apiSecret: 's', accountNo: '', nickname: '코인' }} onBack={vi.fn()} />)
  expect(screen.getByText(/Access Key와 Secret Key를 다시 확인하세요/)).toBeInTheDocument()
})
```

mock 변수 이름(`mutateMock`, `mockState`)은 기존 테스트 파일에 맞춘다. `toHaveBeenCalledWith`의 첫 인자는 `accountNo` 키가 없어야 한다(`toEqual`은 `undefined` 값 키를 무시하므로 요청 객체에 `accountNo`를 아예 만들지 않는다).

- [ ] **Step 5: 실패 확인**

Run: `npx vitest run features/account/create-account`
Expected: 새 테스트 FAIL

- [ ] **Step 6: Stepper 흐름 일반화**

`CreateAccountStepper.tsx`:

```ts
const STEPS = ['증권사', 'API 키', '계좌 정보', '확인']
const KEY_ONLY_STEPS = ['증권사', 'API 키', '계좌 별칭', '확인']
const MOCK_STEPS = ['증권사', '계좌 별칭', '확인']
```

```ts
  const flow = isMock ? MOCK_FLOW : DEFAULT_FLOW
  // 계좌번호가 없는 거래소(업비트)는 흐름은 같고 3번째 스텝이 별칭만 받는다
  const steps = isMock ? MOCK_STEPS : isCryptoBroker(data.broker) ? KEY_ONLY_STEPS : STEPS
```

`<Stepper steps={steps} current={step} />`. import에 `isCryptoBroker`를 더한다.

- [ ] **Step 7: BrokerStep UI 추가**

`BrokerStep.tsx:14-18`의 `BROKER_UI`에 추가하고 import에 `Bitcoin`을 더한다:

```ts
  UPBIT: { description: 'Access Key / Secret Key 방식', Icon: Bitcoin },
```

- [ ] **Step 8: ApiStep에 IP 안내와 오류 매핑 추가**

`ApiStepParts.tsx`의 `ConnectionTest` props에 `error: unknown`을 추가하고 오류 문구를 바꾼다:

```tsx
      {isError && (
        <div className="flex items-center gap-1.5 text-sm text-[var(--status-error)]">
          <XCircle className="size-4 shrink-0" />
          {brokerErrorMessage(error, `증권사 API 인증에 실패했습니다. ${keyLabel} 또는 ${secretLabel}을 확인하세요.`, '연결 테스트에 실패했습니다. 잠시 후 다시 시도해주세요.')}
        </div>
      )}
```

같은 파일에 `UpbitKeyGuide`를 추가한다. 복사는 `features/finance/manage-group/InviteDialog.tsx:59-69` 패턴을 따른다:

```tsx
export function UpbitKeyGuide({ allowedIp }: { allowedIp: string | undefined }) {
  async function handleCopy() {
    if (!allowedIp) return
    try {
      await navigator.clipboard.writeText(allowedIp)
      toast.success('허용 IP를 복사했습니다')
    } catch {
      toast.error('복사에 실패했습니다. IP를 직접 선택해 복사해주세요.')
    }
  }

  return (
    <div className="space-y-2 rounded-[var(--r-sm)] border border-border bg-muted px-4 py-3 text-sm">
      <p className="font-semibold">API 키 발급 시 설정</p>
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground">허용 IP</span>
        {allowedIp ? (
          <span className="flex items-center gap-1">
            <span className="font-mono font-semibold">{allowedIp}</span>
            <IconButton aria-label="허용 IP 복사" onClick={handleCopy}>
              <Copy className="size-4" />
            </IconButton>
          </span>
        ) : (
          <span className="text-muted-foreground">불러오지 못했습니다.</span>
        )}
      </div>
      <p className="text-muted-foreground">권한은 자산 조회, 주문 조회, 주문하기만 켜세요.</p>
      <p className="font-semibold text-[var(--warn)]">출금하기 권한은 켜지 마세요. 키가 유출돼도 출금은 막힙니다.</p>
    </div>
  )
}
```

`IconButton`은 `@shared/ui/IconButton`(44px 히트영역, `aria-label` 필수), `toast`는 `sonner`, `Copy`는 `lucide-react`에서 import한다.

`ApiStep.tsx`에서:
- `const { data: runtimeConfig } = useRuntimeConfigQuery()` 추가
- 입력 필드 아래, 연결 테스트 위에 `{broker === 'UPBIT' && <UpbitKeyGuide allowedIp={runtimeConfig?.brokers.UPBIT?.allowedIp} />}`
- `ConnectionTest`에 `error={testMutation.error}` 전달

- [ ] **Step 9: AccountInfoStep 문구 일반화**

`isMock` 대신 "계좌번호를 받는가"(`config`)로 제목·설명·placeholder를 고른다. MOCK 안내 박스는 `isMock`으로 유지한다:

```tsx
        <h2 className="text-lg font-bold mb-1">{config ? '계좌 정보' : '계좌 별칭'}</h2>
        <p className="text-sm text-muted-foreground">
          {config ? '계좌 별칭과 계좌번호를 입력하세요.' : isMock ? '모의계좌의 별칭을 입력하세요.' : '계좌 별칭을 입력하세요.'}
        </p>
```

placeholder: `isMock ? '예: 모의 계좌' : config ? '예: 메인 계좌' : '예: 코인 계좌'`.

- [ ] **Step 10: ConfirmStep 정리**

`ConfirmStep.tsx`의 요청 구성, 오류 문구, 표시 행을 broker 설정 기반으로 바꾼다:

```ts
  const broker = (data.broker || 'KIS') as BrokerCode
  const isMock = isMockBroker(broker)
  const hasAccountNo = !isMock && !isCryptoBroker(broker)

  function handleSubmit() {
    const req: AccountRequest = isMock
      ? { nickname: data.nickname, broker }
      : {
        nickname: data.nickname,
        appKey: data.apiKey,
        secretKey: data.apiSecret,
        ...(hasAccountNo ? { accountNo: data.accountNo } : {}),
        broker,
      }
    ...
  }

  // 자격증명 오류만 broker별 입력 항목을 짚고, 나머지(중복 계좌·호출 한도 등)는 서버 detail을 그대로 노출한다
  const errorMessage = isMock
    ? apiMsg(error, '계좌 연결에 실패했습니다')
    : brokerErrorMessage(error, BROKER_CREDENTIAL[broker as CredentialBroker].invalidMessage, '계좌 연결에 실패했습니다')
```

표시 행: `{!isMock && (...)}` 블록 안의 계좌번호 행을 `{hasAccountNo && (...)}`로 감싸고, API Key 행은 `!isMock`에 그대로 둔다.

- [ ] **Step 11: 검증**

Run: `npx vitest run features/account/create-account entities/account && npm run typecheck`
Expected: PASS, 오류 0

- [ ] **Step 12: 커밋**

```bash
git add entities/account/model/brokerCredentials.ts entities/account/model/brokerCredentials.test.ts entities/account/index.ts features/account/create-account
git commit -m "feat: 업비트 계좌 연결 흐름과 허용 IP 안내, 거래소 오류 문구를 추가한다"
```

---

### Task 3: API 키 재등록과 만료 표시

**Files:**
- Create: `entities/account/model/apiKeyExpiry.ts`, `entities/account/model/apiKeyExpiry.test.ts`
- Modify: `entities/account/api/index.ts` (`updateCredentials`), `entities/account/hooks/useAccountMarginQuery.ts` (`useUpdateCredentialsMutation`), `entities/account/index.ts`
- Test: `entities/account/hooks/useAccountMarginQuery.test.tsx`
- Modify: `features/account/edit-account/EditAccountForm.tsx`, `EditAccountForm.test.tsx`
- Modify: `widgets/account-card/AccountCard.tsx`, `AccountCard.test.tsx`

`AccountSummaryCard`의 만료 배지는 같은 파일을 고치는 Task 4에서 함께 한다.

**Interfaces:**
- Consumes: Task 2의 `BROKER_CREDENTIAL`, `brokerErrorMessage`, `CredentialBroker`
- Produces:
  - `type ApiKeyExpiryState = 'EXPIRED' | 'EXPIRING' | null`
  - `apiKeyExpiryState(expiresAt: string | null | undefined, now?: Date): ApiKeyExpiryState`
  - `API_KEY_EXPIRY_LABEL: Record<'EXPIRED' | 'EXPIRING', string>`
  - `updateCredentials(id: string, body: { appKey: string; secretKey: string }): Promise<Account>`
  - `useUpdateCredentialsMutation(accountId: string)` — `useMutation<Account, Error, { appKey: string; secretKey: string }>`

- [ ] **Step 1: 만료 판정 테스트 작성**

Create `entities/account/model/apiKeyExpiry.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { apiKeyExpiryState } from './apiKeyExpiry'

const now = new Date('2026-10-18T00:00:00+09:00')

describe('apiKeyExpiryState', () => {
  it('만료일이 없으면 표시하지 않는다', () => {
    expect(apiKeyExpiryState(null, now)).toBeNull()
    expect(apiKeyExpiryState(undefined, now)).toBeNull()
    expect(apiKeyExpiryState('not-a-date', now)).toBeNull()
  })

  it('만료 시각이 지났으면 EXPIRED다', () => {
    expect(apiKeyExpiryState('2026-10-17T23:59:59+09:00', now)).toBe('EXPIRED')
    expect(apiKeyExpiryState('2026-10-18T00:00:00+09:00', now)).toBe('EXPIRED')
  })

  it('30일 이내면 EXPIRING, 그보다 멀면 null이다', () => {
    expect(apiKeyExpiryState('2026-11-17T00:00:00+09:00', now)).toBe('EXPIRING')
    expect(apiKeyExpiryState('2026-11-17T00:00:01+09:00', now)).toBeNull()
  })
})
```

- [ ] **Step 2: 실패 확인 후 구현**

Run: `npx vitest run entities/account/model/apiKeyExpiry.test.ts` → FAIL

Create `entities/account/model/apiKeyExpiry.ts`:

```ts
export type ApiKeyExpiryState = 'EXPIRED' | 'EXPIRING' | null

const EXPIRING_WINDOW_MS = 30 * 24 * 60 * 60 * 1000 // api 만료 알림(D-30)과 같은 기준

export const API_KEY_EXPIRY_LABEL: Record<Exclude<ApiKeyExpiryState, null>, string> = {
  EXPIRED: 'API 키 재등록 필요',
  EXPIRING: 'API 키 만료 임박',
}

export function apiKeyExpiryState(expiresAt: string | null | undefined, now = new Date()): ApiKeyExpiryState {
  if (!expiresAt) return null
  const remainMs = new Date(expiresAt).getTime() - now.getTime()
  if (Number.isNaN(remainMs)) return null
  if (remainMs <= 0) return 'EXPIRED'
  return remainMs <= EXPIRING_WINDOW_MS ? 'EXPIRING' : null
}
```

Run → PASS

- [ ] **Step 3: 키 교체 API·훅 테스트 작성**

`useAccountMarginQuery.test.tsx`에 추가한다. 기존 파일이 api 모듈을 mock하는 방식(`vi.mock('../api', ...)`)을 따르고 `updateCredentials`를 mock에 더한다:

```tsx
describe('useUpdateCredentialsMutation', () => {
  it('키를 교체하면 응답 계좌로 상세 캐시를 갱신한다', async () => {
    const saved = { ...account, apiKeyExpiresAt: '2027-10-18T00:00:00+09:00' }
    vi.mocked(updateCredentials).mockResolvedValue(saved)
    const { result, queryClient } = renderMutationHook(() => useUpdateCredentialsMutation(account.id))
    await act(() => result.current.mutateAsync({ appKey: 'new-key-1234', secretKey: 'new-secret-1234' }))
    expect(updateCredentials).toHaveBeenCalledWith(account.id, { appKey: 'new-key-1234', secretKey: 'new-secret-1234' })
    expect(queryClient.getQueryData(accountKeys.detail(account.id))).toEqual(saved)
  })
})
```

`renderMutationHook`, `account` 같은 헬퍼 이름은 기존 파일에 있는 것으로 바꾼다. 없으면 같은 파일의 `useUpdateAccountMutation` 테스트 구성을 복제한다.

- [ ] **Step 4: 구현**

`entities/account/api/index.ts`:

```ts
// 응답은 갱신된 계좌(apiKeyExpiresAt 포함). 서버가 연결 테스트를 통과해야 저장한다
export async function updateCredentials(id: string, body: { appKey: string; secretKey: string }): Promise<Account> {
  return clientFetch<Account>(`/api/accounts/${id}/credentials`, jsonBody('PUT', body))
}
```

`entities/account/hooks/useAccountMarginQuery.ts`:

```ts
// 실패 문구는 EditAccountForm이 거래소 오류 코드별로 인라인 표시한다 — 토스트를 두면 같은 피드백이 두 번 나온다
export function useUpdateCredentialsMutation(accountId: string) {
  const queryClient = useQueryClient()
  return useMutation<Account, Error, { appKey: string; secretKey: string }>({
    mutationFn: (body) => updateCredentials(accountId, body),
    onSuccess: async (saved) => {
      queryClient.setQueryData(accountKeys.detail(accountId), saved)
      await synchronizeAccountList(queryClient, (accounts) => upsertById(accounts, saved))
    },
  })
}
```

`entities/account/index.ts`에 `useUpdateCredentialsMutation`, `apiKeyExpiryState`, `API_KEY_EXPIRY_LABEL`, `type ApiKeyExpiryState`를 export한다.

Run: `npx vitest run entities/account` → PASS

- [ ] **Step 5: EditAccountForm 테스트 작성**

`EditAccountForm.test.tsx`의 `@entities/account` mock에 `useUpdateCredentialsMutation`(mutate·isPending·isError·error 반환)과 원본 `BROKER_CREDENTIAL`·`brokerErrorMessage`를 더한다. 추가:

```tsx
const upbitAccount = { id: 'u1', nickname: '코인', accountNoMasked: null, broker: 'UPBIT' as const, apiKeyExpiresAt: null }

it('업비트 계좌는 계좌번호 입력을 보여주지 않는다', () => {
  render(<EditAccountForm account={upbitAccount} />)
  expect(screen.queryByLabelText('계좌번호')).not.toBeInTheDocument()
})

it('키 재등록은 새 Access Key·Secret Key를 보낸다', async () => {
  const user = userEvent.setup()
  render(<EditAccountForm account={upbitAccount} />)
  await user.type(screen.getByLabelText('Access Key'), 'new-key-1234')
  await user.type(screen.getByLabelText('Secret Key'), 'new-secret-1234')
  await user.click(screen.getByRole('button', { name: 'API 키 재등록' }))
  expect(credentialsMutateMock).toHaveBeenCalledWith({ appKey: 'new-key-1234', secretKey: 'new-secret-1234' }, expect.anything())
})

it('키 재등록 실패는 거래소 오류 코드별 문구로 보여준다', () => {
  credentialsState = { isPending: false, isError: true, error: new ApiError(422, { code: 'BROKER_IP_NOT_ALLOWED' }) }
  render(<EditAccountForm account={upbitAccount} />)
  expect(screen.getByText(/허용 IP가 등록되지 않았습니다/)).toBeInTheDocument()
})

it('모의계좌는 키 재등록 섹션이 없다', () => {
  render(<EditAccountForm account={{ ...upbitAccount, broker: 'MOCK', accountNoMasked: '****1234' }} />)
  expect(screen.queryByRole('button', { name: 'API 키 재등록' })).not.toBeInTheDocument()
})
```

- [ ] **Step 6: EditAccountForm 구현**

- 계좌번호 블록(`:97-105`)을 `{account.accountNoMasked != null && (...)}`로 감싼다(Step 9의 `?? ''`는 이제 필요 없으면 지운다).
- 별칭 카드와 위험 구역 사이에 키 재등록 카드를 둔다. 별칭 `<form>`과 섞이지 않게 별도 `<form>`으로 만든다. 지금 컴포넌트 전체가 `<form onSubmit={handleSubmit}>`로 감싸여 있으면 최상위를 `<div>`로 바꾸고 별칭 카드만 `<form>`으로 감싼다(중첩 form 금지).
- 입력 상태(`appKey`, `secretKey`)는 로컬 `useState`다(서버 상태 아님).

```tsx
function CredentialsCard({ account }: { account: Account }) {
  const [appKey, setAppKey] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const mutation = useUpdateCredentialsMutation(account.id)
  const { keyLabel, secretLabel, invalidMessage } = BROKER_CREDENTIAL[account.broker as CredentialBroker]
  const canSubmit = appKey.trim().length > 0 && secretKey.trim().length > 0 && !mutation.isPending

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    mutation.mutate({ appKey: appKey.trim(), secretKey: secretKey.trim() }, {
      onSuccess: () => {
        setAppKey('')
        setSecretKey('')
        toast.success('API 키가 재등록되었습니다')
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className={cn(CARD_CLASS, 'space-y-4')}>
      <div>
        <h2 className="text-sm font-semibold mb-1">API 키 재등록</h2>
        <p className="text-sm text-muted-foreground">새 키로 연결 테스트를 통과하면 교체합니다.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="credential-key">{keyLabel}</Label>
        <Input id="credential-key" className="h-12" value={appKey} onChange={(e) => setAppKey(e.target.value)} disabled={mutation.isPending} maxLength={256} autoComplete="off" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="credential-secret">{secretLabel}</Label>
        <Input id="credential-secret" type="password" className="h-12" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} disabled={mutation.isPending} maxLength={512} autoComplete="off" />
      </div>
      {mutation.isError && (
        <p className="text-sm text-[var(--status-error)]">{brokerErrorMessage(mutation.error, invalidMessage, 'API 키 재등록에 실패했습니다.')}</p>
      )}
      <Button type="submit" size="form" className="w-full" disabled={!canSubmit}>
        {mutation.isPending ? <><Spinner size={16} /> 연결 확인 중...</> : 'API 키 재등록'}
      </Button>
    </form>
  )
}
```

`cardClass` 상수는 컴포넌트 밖 `CARD_CLASS`로 올려 두 카드가 같이 쓴다. 렌더: `{!isMockBroker(account.broker) && <CredentialsCard account={account} />}`. 업비트 연결 테스트 게이트는 서버가 PUT 안에서 수행한다(B 확정 내역). 그래서 UI에 별도 테스트 버튼을 두지 않는다.

- [ ] **Step 7: AccountCard 만료 배지**

`AccountCard.test.tsx`:

```tsx
it('API 키 만료가 30일 이내면 만료 임박 배지를 보여준다', () => {
  vi.setSystemTime(new Date('2026-10-18T00:00:00+09:00'))
  renderCard({ ...account, broker: 'UPBIT', accountNoMasked: null, apiKeyExpiresAt: '2026-11-01T00:00:00+09:00' })
  expect(screen.getAllByText('API 키 만료 임박').length).toBeGreaterThan(0)
})

it('만료된 키는 재등록 필요 배지를 보여준다', () => {
  vi.setSystemTime(new Date('2026-10-18T00:00:00+09:00'))
  renderCard({ ...account, apiKeyExpiresAt: '2026-10-01T00:00:00+09:00' })
  expect(screen.getAllByText('API 키 재등록 필요').length).toBeGreaterThan(0)
})
```

`vi.useFakeTimers({ toFake: ['Date'] })`와 `afterEach(() => vi.useRealTimers())`를 함께 쓴다. `renderCard`는 기존 파일의 렌더 헬퍼 이름으로 바꾼다.

`AccountCard.tsx`: 브로커 배지 옆(모바일 1행 `:56-58`, PC 헤더 `:93-95`)에 배지를 둔다:

```tsx
  const expiry = apiKeyExpiryState(account.apiKeyExpiresAt)
```

```tsx
            {expiry && (
              <Badge tone={expiry === 'EXPIRED' ? 'error' : 'warn'} size="sm">{API_KEY_EXPIRY_LABEL[expiry]}</Badge>
            )}
```

`Badge`는 `@shared/ui/Badge`의 `tone="warn"`(`bg-warn-bg text-warn`)과 `tone="error"`를 쓴다. 기존 tone이라 대비는 이미 맞춰져 있다.

- [ ] **Step 8: 검증**

Run: `npx vitest run entities/account features/account/edit-account widgets/account-card && npm run typecheck`
Expected: PASS, 오류 0

- [ ] **Step 9: 커밋**

```bash
git add entities/account features/account/edit-account widgets/account-card
git commit -m "feat: 계좌 API 키 재등록과 키 만료 임박·만료 표시를 추가한다"
```

---

### Task 4: 코인 계좌 쿼리 게이팅과 코인 포트폴리오

**Files:**
- Modify: `entities/trade/api/index.ts` (`getCryptoPortfolio`), `entities/trade/model/types.ts`, `entities/trade/model/queryKeys.ts`, `entities/trade/model/queryOptions.ts`, `entities/trade/index.ts`
- Test: `entities/trade/api/index.test.ts`
- Modify: `entities/account/hooks/useAccountMarginQuery.ts` (`useAccountPricesQuery` options)
- Modify: `app/(main)/accounts/[id]/page.tsx`
- Modify: `widgets/account-detail/AccountDetailContent.tsx`, `AccountDetailTabs.tsx`, `AccountSummaryCard.tsx`
- Create: `widgets/account-detail/CryptoHoldingsCard.tsx`
- Test: `widgets/account-detail/AccountDetailContent.test.tsx`, `AccountDetailTabs.test.tsx`, `AccountSummaryCard.test.tsx`, `CryptoHoldingsCard.test.tsx` (신규)
- Modify: `features/strategy/create-strategy/model/useStrategyFormData.ts`
- Test: 신규 `features/strategy/create-strategy/model/useStrategyFormData.test.ts`
- Modify: `widgets/market-holiday-calendar/WeeklyMarketCalendar.tsx:176-178`
- Modify: `widgets/stats-overview/CyclePerformanceList.tsx:50-53`
- Modify: `widgets/benchmark-comparison/model/useBenchmarkStrategyOptions.ts:21`

**Interfaces:**
- Consumes: Task 1의 `isCryptoBroker`, `isCryptoMarket`, `fmtMoney`, `fmtQuantity`, `TickerMeta.market`. Task 3의 `apiKeyExpiryState`, `API_KEY_EXPIRY_LABEL`
- Produces:
  - `interface CryptoHolding { ticker: string; quantity: number; avgBuyPrice: number; currentPrice: number | null; evalAmountKrw: number }`
  - `interface CryptoPortfolio { krwCash: number; totalAssetKrw: number; holdings: CryptoHolding[] }`
  - `getCryptoPortfolio(accountId: string, token?: string): Promise<CryptoPortfolio>`
  - `tradeKeys.cryptoPortfolio(accountId)`, `cryptoPortfolioQueryOptions(accountId: string, token?: string)` — 모두 `@entities/trade`에서 export. 주식 `portfolio`와 같이 `tradeKeys.all` 아래에 둬서 체결 SSE(`TradeNotificationBridge`)의 prefix 무효화에 자동으로 걸린다
  - `useAccountPricesQuery(accountId: string, tickers: string[], options?: { enabled?: boolean })`
  - `AccountSummaryCard` props: `{ account: Account; usdDeposit: number; posEvalUsd: number; cryptoPortfolio?: CryptoPortfolio }`

- [ ] **Step 1: crypto-portfolio normalizer 테스트**

`entities/trade/api/index.test.ts`에 추가(기존 `getAccountPortfolio` 테스트의 fetch mock 방식을 따른다):

```ts
describe('getCryptoPortfolio', () => {
  it('금액·수량을 숫자로 바꾸고 현재가 null을 유지한다', async () => {
    mockFetchJson({
      krwCash: '120000', totalAssetKrw: 1520000,
      holdings: [
        { ticker: 'BTC', quantity: '0.01234567', avgBuyPrice: '100000000', currentPrice: 110000000, evalAmountKrw: 1358024 },
        { ticker: 'ETH', quantity: 0.5, avgBuyPrice: 5000000, currentPrice: null, evalAmountKrw: 0 },
      ],
    })
    const result = await getCryptoPortfolio('a1')
    expect(result.krwCash).toBe(120000)
    expect(result.holdings[0]).toEqual({ ticker: 'BTC', quantity: 0.01234567, avgBuyPrice: 100000000, currentPrice: 110000000, evalAmountKrw: 1358024 })
    expect(result.holdings[1].currentPrice).toBeNull()
  })
})
```

`mockFetchJson`은 기존 파일의 fetch mock 헬퍼 이름으로 바꾼다.

- [ ] **Step 2: 구현**

`entities/trade/model/types.ts`에 타입을 두고 `entities/trade/index.ts`의 `export type { ... }`에 더한다:

```ts
export interface CryptoHolding {
  ticker: string
  quantity: number
  avgBuyPrice: number
  currentPrice: number | null // 현재가 조회 실패 — 이때 evalAmountKrw는 0이라 화면에서 0원으로 보여주지 않는다
  evalAmountKrw: number
}

export interface CryptoPortfolio {
  krwCash: number
  totalAssetKrw: number
  holdings: CryptoHolding[]
}

```

`entities/trade/api/index.ts`:

```ts
interface CryptoPortfolioRaw {
  krwCash: number | string
  totalAssetKrw: number | string
  holdings?: Array<{ ticker: string; quantity: number | string; avgBuyPrice: number | string; currentPrice: number | string | null; evalAmountKrw: number | string }>
}

export async function getCryptoPortfolio(accountId: string, token?: string): Promise<CryptoPortfolio> {
  const raw = await fetchEither<CryptoPortfolioRaw>(`/api/accounts/${accountId}/crypto-portfolio`, { method: 'GET' }, token)
  return {
    krwCash: toNum(raw.krwCash),
    totalAssetKrw: toNum(raw.totalAssetKrw),
    holdings: (raw.holdings ?? []).map((h) => ({
      ticker: h.ticker,
      quantity: toNum(h.quantity),
      avgBuyPrice: toNum(h.avgBuyPrice),
      currentPrice: h.currentPrice == null ? null : toNum(h.currentPrice),
      evalAmountKrw: toNum(h.evalAmountKrw),
    })),
  }
}
```

`entities/account/hooks/useAccountMarginQuery.ts`의 `useAccountPricesQuery`에 `options?: { enabled?: boolean }`를 더하고 `enabled: options?.enabled !== false && !!accountId && tickers.length > 0`로 바꾼다.

`entities/trade/model/queryKeys.ts`:

```ts
  // 코인 계좌 잔고 — 체결로 바뀌므로 portfolio와 같이 tradeKeys.all prefix 무효화에 걸리게 둔다
  cryptoPortfolio: (accountId: string) => [...tradeKeys.all, 'crypto-portfolio', accountId] as const,
```

`entities/trade/model/queryOptions.ts`:

```ts
export function cryptoPortfolioQueryOptions(accountId: string, token?: string) {
  return queryOptions<CryptoPortfolio>({
    queryKey: tradeKeys.cryptoPortfolio(accountId),
    queryFn: () => getCryptoPortfolio(accountId, token),
  })
}
```

`entities/trade/index.ts`에 `cryptoPortfolioQueryOptions`를 export한다. 계좌 삭제 시 `EditAccountForm`이 이미 `tradeKeys.all`을 무효화하므로 삭제 처리는 더하지 않는다.

Run: `npx vitest run entities/trade entities/account` → PASS

- [ ] **Step 3: 계좌 상세 테스트 작성**

`AccountDetailContent.test.tsx`: 기존 MOCK 스킵 테스트를 본떠 추가한다.

```tsx
it('업비트 계좌는 주식 포트폴리오를 부르지 않고 코인 포트폴리오를 부른다', async () => {
  renderContent({ ...account, broker: 'UPBIT', accountNoMasked: null })
  await waitFor(() => expect(getCryptoPortfolio).toHaveBeenCalledWith('a1', undefined))
  expect(getAccountPortfolio).not.toHaveBeenCalled()
})
```

`CryptoHoldingsCard.test.tsx` (신규):

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CryptoHoldingsCard } from './CryptoHoldingsCard'

const portfolio = {
  krwCash: 120000,
  totalAssetKrw: 1478024,
  holdings: [
    { ticker: 'BTC', quantity: 0.01234567, avgBuyPrice: 100000000, currentPrice: 110000000, evalAmountKrw: 1358024 },
    { ticker: 'ETH', quantity: 0.5, avgBuyPrice: 5000000, currentPrice: null, evalAmountKrw: 0 },
  ],
}

describe('CryptoHoldingsCard', () => {
  it('보유 코인의 수량·평단·현재가·평가금액을 원화로 보여준다', () => {
    render(<CryptoHoldingsCard portfolio={portfolio} isError={false} />)
    expect(screen.getByText('0.01234567')).toBeInTheDocument()
    expect(screen.getByText('110,000,000원')).toBeInTheDocument()
    expect(screen.getByText('1,358,024원')).toBeInTheDocument()
  })

  it('현재가를 못 받은 코인은 확인 불가로 표시하고 0원을 보여주지 않는다', () => {
    render(<CryptoHoldingsCard portfolio={portfolio} isError={false} />)
    expect(screen.getAllByText('현재가 확인 불가').length).toBeGreaterThan(0)
    expect(screen.queryByText('0원')).not.toBeInTheDocument()
  })

  it('보유 코인이 없으면 빈 상태 문구를 보여준다', () => {
    render(<CryptoHoldingsCard portfolio={{ ...portfolio, holdings: [] }} isError={false} />)
    expect(screen.getByText('보유한 코인이 없습니다.')).toBeInTheDocument()
  })

  it('데이터 없이 실패하면 오류 문구를 보여준다', () => {
    render(<CryptoHoldingsCard portfolio={undefined} isError />)
    expect(screen.getByText('보유 코인을 불러오지 못했습니다.')).toBeInTheDocument()
  })
})
```

`AccountSummaryCard.test.tsx`:

```tsx
it('업비트 계좌는 계좌번호 대신 원화 예수금·총자산을 보여준다', () => {
  render(<AccountSummaryCard account={{ ...account, broker: 'UPBIT', accountNoMasked: null }} usdDeposit={0} posEvalUsd={0}
    cryptoPortfolio={{ krwCash: 120000, totalAssetKrw: 1478024, holdings: [] }} />)
  expect(screen.queryByText('계좌번호')).not.toBeInTheDocument()
  expect(screen.getByText('120,000원')).toBeInTheDocument()
  expect(screen.getByText('1,478,024원')).toBeInTheDocument()
  expect(screen.queryByText(/\$/)).not.toBeInTheDocument()
})

it('키가 만료됐으면 재등록 필요를 보여준다', () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-18T00:00:00+09:00'))
  render(<AccountSummaryCard account={{ ...account, broker: 'UPBIT', accountNoMasked: null, apiKeyExpiresAt: '2026-10-01T00:00:00+09:00' }} usdDeposit={0} posEvalUsd={0} />)
  expect(screen.getByText('API 키 재등록 필요')).toBeInTheDocument()
  vi.useRealTimers()
})
```

`AccountDetailTabs.test.tsx`: 업비트 계좌면 `TradesTab`(사이클 이력)을 렌더하지 않고 `CryptoHoldingsCard`를 렌더하는지 확인한다(기존 mock 구조에 맞춰 `screen.queryByTestId` 또는 mock 컴포넌트 텍스트로 확인).

- [ ] **Step 4: 실패 확인**

Run: `npx vitest run widgets/account-detail`
Expected: 새 테스트 FAIL

- [ ] **Step 5: 계좌 상세 구현**

`app/(main)/accounts/[id]/page.tsx`:

```ts
  // MOCK은 KIS-live 포트폴리오 대상이 아니고, 코인 계좌는 주식 포트폴리오를 부르면 400이라 코인 포트폴리오를 대신 채운다
  const portfolioPromise = isMockBroker(account.broker)
    ? undefined
    : isCryptoBroker(account.broker)
      ? queryClient.prefetchQuery(cryptoPortfolioQueryOptions(id, token)).catch(() => undefined)
      : queryClient.prefetchQuery(accountPortfolioQueryOptions(id, token)).catch(() => undefined)
```

`AccountDetailContent.tsx`:

```ts
  const isCrypto = !!account && isCryptoBroker(account.broker)
  // MOCK·코인 계좌는 주식 포트폴리오 대상이 아니라 서버 prefetch와 같은 조건으로 스킵
  const { data: portfolio } = useQuery({
    ...accountPortfolioQueryOptions(accountId),
    enabled: !!account && !isMockBroker(account.broker) && !isCrypto,
  })
  const cryptoQuery = useQuery({ ...cryptoPortfolioQueryOptions(accountId), enabled: isCrypto })
```

`AccountDetailTabs`에 `cryptoPortfolio={cryptoQuery.data}`와 `cryptoPortfolioError={cryptoQuery.isError && !cryptoQuery.data}`를 넘긴다.

`AccountDetailTabs.tsx`: 새 props `cryptoPortfolio?: CryptoPortfolio`, `cryptoPortfolioError?: boolean`을 받는다. `AccountSummaryCard`에 `cryptoPortfolio`를 넘긴다. `TradesTab`이 렌더되는 두 곳(모바일 요약 탭, PC 오른쪽 열)을 아래로 바꾼다:

```tsx
{isCryptoBroker(account.broker)
  ? <CryptoHoldingsCard portfolio={cryptoPortfolio} isError={cryptoPortfolioError ?? false} />
  : <TradesTab ... />}
```

Create `widgets/account-detail/CryptoHoldingsCard.tsx`:

```tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@shared/ui/EmptyState'
import { LoadingRow } from '@shared/ui/LoadingRow'
import { fmtKrw, fmtQuantity } from '@shared/lib/format'
import type { CryptoPortfolio } from '@entities/trade'

interface Props {
  portfolio: CryptoPortfolio | undefined
  isError: boolean // 호출부가 isError && !data로 계산해 넘긴다
}

const UNAVAILABLE = '현재가 확인 불가'

export function CryptoHoldingsCard({ portfolio, isError }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle role="heading" aria-level={2} className="text-base">보유 코인</CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        {isError ? (
          <EmptyState variant="text" message="보유 코인을 불러오지 못했습니다." />
        ) : !portfolio ? (
          <LoadingRow />
        ) : portfolio.holdings.length === 0 ? (
          <EmptyState variant="text" message="보유한 코인이 없습니다." />
        ) : (
          <div role="region" aria-label="보유 코인 목록" tabIndex={0} className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">종목</th>
                  <th className="py-2 pr-4 font-medium text-right">수량</th>
                  <th className="py-2 pr-4 font-medium text-right">평단가</th>
                  <th className="py-2 pr-4 font-medium text-right">현재가</th>
                  <th className="py-2 font-medium text-right">평가금액</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.holdings.map((h) => (
                  <tr key={h.ticker} className="border-t border-border">
                    <td className="py-2 pr-4 font-semibold">{h.ticker}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{fmtQuantity(h.quantity)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums whitespace-nowrap">{fmtKrw(h.avgBuyPrice)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums whitespace-nowrap">{h.currentPrice == null ? UNAVAILABLE : fmtKrw(h.currentPrice)}</td>
                    <td className="py-2 text-right tabular-nums whitespace-nowrap">{h.currentPrice == null ? UNAVAILABLE : fmtKrw(h.evalAmountKrw)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

`EmptyState`·`LoadingRow` import 경로와 props는 `widgets/strategy-list/StrategyList.tsx`와 같다.

`AccountSummaryCard.tsx`:
- 계좌번호 `KpiCard`를 `{account.accountNoMasked != null && (...)}`로 감싼다.
- 카드 제목 옆에 만료 배지를 둔다: `const expiry = apiKeyExpiryState(account.apiKeyExpiresAt)` → `{expiry && <Badge tone={expiry === 'EXPIRED' ? 'error' : 'warn'} size="sm">{API_KEY_EXPIRY_LABEL[expiry]}</Badge>}`. Task 3의 `AccountCard`와 같은 표현이다.
- 예수금·평가금 블록:

```tsx
          {isCryptoBroker(account.broker) ? (
            <>
              <KpiCard label="원화 예수금" value={cryptoPortfolio ? fmtKrw(cryptoPortfolio.krwCash) : '-'} />
              <KpiCard label="총자산(원화 환산)" value={cryptoPortfolio ? fmtKrw(cryptoPortfolio.totalAssetKrw) : '-'} />
            </>
          ) : !isMock && (
            <>
              <KpiCard label="예수금(실계좌기준)" value={`$${fmtUsd(usdDeposit)}`} />
              <KpiCard label="평가금(실계좌기준)" value={`$${fmtUsd(posEvalUsd)}`} />
            </>
          )}
```

`totalAssetKrw`에 현재가를 못 받은 코인이 0으로 들어가 있을 수 있다. 그런 코인이 있으면 총자산 KPI 아래에 "일부 코인은 현재가 확인 불가로 총자산에서 빠졌습니다." 캡션을 단다(`cryptoPortfolio.holdings.some((h) => h.currentPrice == null)`). 이 동작도 `AccountSummaryCard.test.tsx`에 테스트를 하나 더해 고정한다.

- [ ] **Step 6: 전략 폼 쿼리 게이팅 테스트**

Create `features/strategy/create-strategy/model/useStrategyFormData.test.ts`:

```ts
import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAccountMarginQuery, useAccountPricesQuery } from '@entities/account'
import { useStrategyFormData } from './useStrategyFormData'

vi.mock('@entities/account', () => ({
  useAccountMarginQuery: vi.fn(() => ({ items: [], isLoading: false, isError: false })),
  useAccountPricesQuery: vi.fn(() => ({ data: undefined, isError: false })),
}))
vi.mock('@entities/user', () => ({ useMeQuery: () => ({ data: { balanceCheckEnabled: true } }) }))
vi.mock('@entities/runtime-config', () => ({ useRuntimeConfigQuery: () => ({ data: { strategies: {} } }) }))
vi.mock('@entities/meta', () => ({
  useMeta: () => ({
    meta: {
      strategyTypes: [],
      tickers: [
        { code: 'TQQQ', market: 'US_STOCK' },
        { code: 'SOXL' },
        { code: 'BTC', market: 'CRYPTO_KRW' },
      ],
    },
    findStrategyType: vi.fn(),
  }),
}))

describe('useStrategyFormData', () => {
  beforeEach(() => vi.clearAllMocks())

  it('주식 계좌는 코인 티커를 빼고 시세를 조회한다', () => {
    renderHook(() => useStrategyFormData('a1', 'KIS'))
    expect(useAccountPricesQuery).toHaveBeenCalledWith('a1', ['TQQQ', 'SOXL'], { enabled: true })
    expect(useAccountMarginQuery).toHaveBeenCalledWith('a1', { enabled: true })
  })

  it('업비트 계좌는 예수금·시세 조회를 막는다', () => {
    renderHook(() => useStrategyFormData('a1', 'UPBIT'))
    expect(useAccountMarginQuery).toHaveBeenCalledWith('a1', { enabled: false })
    expect(useAccountPricesQuery).toHaveBeenCalledWith('a1', expect.any(Array), { enabled: false })
  })
})
```

Run → FAIL

- [ ] **Step 7: useStrategyFormData 구현**

```ts
export function useStrategyFormData(accountId: string, broker: BrokerCode | undefined) {
  const isMock = isMockBroker(broker)
  // 코인 계좌로 주식 margin/prices를 부르면 400 — StrategyForm은 DCA 분기 전에 이 훅을 부르므로 여기서 막는다
  const isCrypto = isCryptoBroker(broker)
  ...
  const balanceCheckEnabled = (meData?.balanceCheckEnabled ?? true) && !isMock && !isCrypto
  ...
  // 티커 선택 버튼의 가격 표시용 — 주식 시세 api라 코인 티커는 뺀다(api 상한 10개)
  const allTickerCodes = useMemo(
    () => meta.tickers.filter((t) => !isCryptoMarket(t.market)).map((t) => t.code),
    [meta.tickers],
  )
  const { data: pricesData, isError: pricesError } = useAccountPricesQuery(accountId, allTickerCodes, { enabled: !isCrypto })
```

반환값에 `isCrypto`를 추가한다(Task 5가 쓴다).

Run: `npx vitest run features/strategy/create-strategy` → PASS

- [ ] **Step 8: 대시보드·통계·벤치마크 정리**

`WeeklyMarketCalendar.tsx:176-178`:

```ts
  // 일별 체결은 서버가 주식만 집계한다 — "대기" 배지·범례도 주식 계좌 기준으로 맞춘다
  const accountIds = accounts?.filter((account) => !isCryptoBroker(account.broker)).map((account) => account.id) ?? []
```

`CyclePerformanceList.tsx:50-53`의 `accountOptions`:

```ts
    () => [{ value: ALL, label: '전체 계좌' }, ...(accountsQuery.data ?? [])
      // 코인 계좌는 DCA만 있어 사이클 성과가 없다
      .filter((account) => !isCryptoBroker(account.broker))
      .map((account) => ({ value: account.id, label: account.nickname }))],
```

`useBenchmarkStrategyOptions.ts:21`:

```ts
      ? strategiesQuery.data.filter((strategy) => {
        const broker = accountsById.get(strategy.accountId)?.broker
        // 모의계좌는 실제 투자 성과가 아니고, 코인 계좌는 1차 벤치마크 대상이 아니다
        return broker !== 'MOCK' && !isCryptoBroker(broker)
      })
```

각 파일의 기존 테스트에 코인 계좌 한 건씩을 fixture로 더해 빠지는지 확인한다(`WeeklyMarketCalendar.test.tsx`는 `useDailyTradesRangeQuery`에 넘긴 `accountIds`, `CyclePerformanceList.test.tsx`는 계좌 선택지, `useBenchmarkStrategyOptions` 테스트는 `strategies`).

- [ ] **Step 9: 검증**

Run: `npx vitest run entities/account entities/trade widgets/account-detail features/strategy/create-strategy widgets/market-holiday-calendar widgets/stats-overview widgets/benchmark-comparison "app/(main)/accounts" && npm run typecheck`
Expected: PASS, 오류 0

- [ ] **Step 10: 커밋**

```bash
git add entities/account entities/trade widgets/account-detail "app/(main)/accounts/[id]/page.tsx" \
  features/strategy/create-strategy/model/useStrategyFormData.ts features/strategy/create-strategy/model/useStrategyFormData.test.ts \
  widgets/market-holiday-calendar widgets/stats-overview widgets/benchmark-comparison
git commit -m "feat: 코인 계좌에서 주식 전용 조회를 막고 계좌 상세에 원화 예수금과 보유 코인을 표시한다"
```

---

### Task 5: 코인 DCA 등록·수정 폼

**Files:**
- Modify: `entities/strategy/model/types.ts:26-37`, `entities/strategy/model/dcaFormat.ts`, `entities/strategy/api/index.ts:44-65`
- Test: `entities/strategy/api/index.test.ts`, `entities/strategy/model/dcaFormat.test.ts`(없으면 신규)
- Modify: `features/strategy/create-strategy/model/dcaFormSchema.ts`, `buildDcaPayload.ts`
- Modify: `features/strategy/create-strategy/sections/DcaSettingsSection.tsx`, `DcaConditionsSection.tsx`
- Modify: `features/strategy/create-strategy/DcaStrategyForm.tsx`, `StrategyForm.tsx`, `model/useStrategyForm.ts`(반환값 전달만)
- Modify: `features/strategy/create-strategy/model/strategyFormHelpers.ts` (`deriveRuntimeFields` 티커 필터)
- Test: `dcaFormSchema.test.ts`, `buildDcaPayload.test.ts`, `DcaSettingsSection.test.tsx`, `DcaConditionsSection.test.tsx`, `DcaStrategyForm.test.tsx`, `StrategyForm.test.tsx`, `strategyFormHelpers.test.ts`, `sections/__fixtures__/dcaTestMeta.ts`
- Modify (amountUsd 참조 정리): `widgets/strategy-card/DcaStrategyCard.tsx:23`, `widgets/strategy-detail/DcaStrategyDetail.tsx:52` — 필드 이름만 `amount`로 바꾼다. 통화 표시는 Task 6

**Interfaces:**
- Consumes: Task 1의 `TradingMarket`, `isCryptoMarket`. Task 4의 `useStrategyFormData().isCrypto`
- Produces:
  - `DcaOrderType = 'MOO' | 'MOC' | 'MARKET'`
  - `DcaWeekday`에 `'SATURDAY' | 'SUNDAY'` 추가, `WEEKDAY_LABEL`에 토·일 추가, `STOCK_WEEKDAYS: DcaWeekday[]`(월~금)
  - `DcaConfigRequest { direction; amount: number; orderType; frequency; dayOfWeek; dayOfMonth; executionHour?: number; conditions }`
  - `StrategyDcaSummary`는 `DcaConfigRequest` 확장 + `executionHour: number | null`(응답 정규화 값)
  - `formatDcaSchedule(dca, frequencyLabel)`가 `executionHour`가 있으면 ` 09시`를 붙인다
  - `DcaFormValues`에 `market: TradingMarket`, `amount: number | null`, `executionHour: number | null`
  - `buildDcaFormDefaults(initial: Strategy | undefined, defaultTicker: string, market: TradingMarket): DcaFormValues`
  - `DcaStrategyForm` props에 `market: TradingMarket`
  - `MIN_CRYPTO_ORDER_KRW = 5000`

- [ ] **Step 1: normalizer·스케줄 테스트**

`entities/strategy/api/index.test.ts`에 추가:

```ts
it('DCA 금액은 amount를 쓰고, 구 응답은 amountUsd로 채운다', async () => {
  // 기존 normalizeDca 테스트의 fixture 구성을 따른다
  expect(normalizeStrategyFixture({ dca: { ...dcaRaw, amount: 50000, amountUsd: undefined } }).dca?.amount).toBe(50000)
  expect(normalizeStrategyFixture({ dca: { ...dcaRaw, amount: undefined, amountUsd: 300 } }).dca?.amount).toBe(300)
})

it('executionHour 0은 null이 아니라 0으로 유지한다', async () => {
  expect(normalizeStrategyFixture({ dca: { ...dcaRaw, executionHour: 0 } }).dca?.executionHour).toBe(0)
  expect(normalizeStrategyFixture({ dca: { ...dcaRaw, executionHour: undefined } }).dca?.executionHour).toBeNull()
})

it('주말 요일과 MARKET 주문 유형을 받는다', async () => {
  const dca = normalizeStrategyFixture({ dca: { ...dcaRaw, frequency: 'WEEKLY', dayOfWeek: 'SUNDAY', orderType: 'MARKET' } }).dca
  expect(dca?.dayOfWeek).toBe('SUNDAY')
  expect(dca?.orderType).toBe('MARKET')
})
```

`normalizeStrategyFixture`, `dcaRaw`는 기존 파일(`:88-126`)의 테스트 구성으로 바꾼다.

`dcaFormat.test.ts`:

```ts
it('실행 시각이 있으면 스케줄 뒤에 시를 붙인다', () => {
  expect(formatDcaSchedule({ frequency: 'DAILY', dayOfWeek: null, dayOfMonth: null, executionHour: 9 }, '매일')).toBe('매일 09시')
  expect(formatDcaSchedule({ frequency: 'WEEKLY', dayOfWeek: 'SUNDAY', dayOfMonth: null, executionHour: 0 }, '매주')).toBe('매주 일요일 00시')
  expect(formatDcaSchedule({ frequency: 'MONTHLY', dayOfWeek: null, dayOfMonth: null }, '매월')).toBe('매월 말일')
})
```

- [ ] **Step 2: 실패 확인 후 entities 구현**

Run: `npx vitest run entities/strategy` → FAIL

`entities/strategy/model/types.ts`:

```ts
export type DcaOrderType = 'MOO' | 'MOC' | 'MARKET' // MARKET: 코인 시장가(업비트), MOO/MOC: 주식
export type DcaWeekday = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'
export interface DcaConfigRequest {
  direction: DcaDirection
  amount: number // 계좌 통화 단위(주식 USD, 코인 원 단위 정수)
  orderType: DcaOrderType
  frequency: DcaFrequency
  dayOfWeek: DcaWeekday | null
  dayOfMonth: number | null
  executionHour?: number // 코인 전용 실행 시각(KST 0~23). 주식은 보내지 않는다
  conditions: DcaCondition[]
}
export interface StrategyDcaSummary extends Omit<DcaConfigRequest, 'executionHour'> {
  executionHour: number | null
  nextExecution: { usSessionDate: string; kstTradeDate: string } | null
  lastExecution: { kstTradeDate: string; status: string; skipReason: string | null } | null
}
```

`dcaFormat.ts`:

```ts
export const WEEKDAY_LABEL: Record<DcaWeekday, string> = {
  MONDAY: '월요일',
  TUESDAY: '화요일',
  WEDNESDAY: '수요일',
  THURSDAY: '목요일',
  FRIDAY: '금요일',
  SATURDAY: '토요일',
  SUNDAY: '일요일',
}

// 주식은 미국 거래일 기준이라 주말 실행을 고를 수 없다. 코인은 24/7이라 7일 모두 고른다
export const STOCK_WEEKDAYS: DcaWeekday[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']

export function formatExecutionHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}시`
}

export function formatDcaSchedule(
  dca: Pick<DcaConfigRequest, 'frequency' | 'dayOfWeek' | 'dayOfMonth'> & { executionHour?: number | null },
  frequencyLabel: string,
): string {
  const day = dca.frequency === 'WEEKLY' && dca.dayOfWeek
    ? `${frequencyLabel} ${WEEKDAY_LABEL[dca.dayOfWeek]}`
    : dca.frequency === 'MONTHLY'
      ? `${frequencyLabel} ${dca.dayOfMonth == null ? '말일' : `${dca.dayOfMonth}일`}`
      : frequencyLabel
  return dca.executionHour == null ? day : `${day} ${formatExecutionHour(dca.executionHour)}`
}
```

`entities/strategy/index.ts`에서 `STOCK_WEEKDAYS`, `formatExecutionHour`를 export한다.

`entities/strategy/api/index.ts`의 `normalizeDca`:

```ts
    amount: toNum(d.amount ?? d.amountUsd), // A 계약 전환기 — 구 응답은 amountUsd만 준다
    orderType: String(d.orderType) as DcaOrderType,
    ...
    executionHour: d.executionHour != null ? Number(d.executionHour) : null,
```

Run: `npx vitest run entities/strategy` → PASS

- [ ] **Step 3: 스키마·payload 테스트 작성**

`dcaFormSchema.test.ts`의 `base` fixture를 `amountUsd` → `amount`로, `market: 'US_STOCK'`, `executionHour: null`을 더하도록 바꾸고 추가:

```ts
const crypto = { ...base, ticker: 'BTC', market: 'CRYPTO_KRW' as const, orderType: 'MARKET' as const, amount: 5000, executionHour: 9 }

describe('dcaFormSchema — 코인', () => {
  it('최소 주문 금액 5,000원은 통과한다', () => {
    expect(dcaFormSchema.safeParse(crypto).success).toBe(true)
  })

  it('5,000원 미만과 소수 금액은 거부한다', () => {
    expect(issueAt(dcaFormSchema.safeParse({ ...crypto, amount: 4999 }), 'amount')).toBe('최소 주문 금액은 5,000원입니다.')
    expect(issueAt(dcaFormSchema.safeParse({ ...crypto, amount: 5000.5 }), 'amount')).toBe('원 단위 정수로 입력하세요.')
  })

  it('실행 시각 00시는 유효하고, 비어 있으면 거부한다', () => {
    expect(dcaFormSchema.safeParse({ ...crypto, executionHour: 0 }).success).toBe(true)
    expect(issueAt(dcaFormSchema.safeParse({ ...crypto, executionHour: null }), 'executionHour')).toBe('실행 시각을 선택하세요.')
  })

  it('코인은 시장가 주문만 허용한다', () => {
    expect(issueAt(dcaFormSchema.safeParse({ ...crypto, orderType: 'MOC' }), 'orderType')).toBe('코인은 시장가 주문만 지원합니다.')
  })

  it('코인은 주말 요일을 고를 수 있다', () => {
    expect(dcaFormSchema.safeParse({ ...crypto, frequency: 'WEEKLY', dayOfWeek: 'SUNDAY' }).success).toBe(true)
  })
})

describe('dcaFormSchema — 주식', () => {
  it('주식은 MARKET 주문을 거부한다', () => {
    expect(issueAt(dcaFormSchema.safeParse({ ...base, orderType: 'MARKET' }), 'orderType')).toBe('주문 방식을 선택하세요.')
  })

  it('주식은 주말 요일을 거부한다', () => {
    expect(issueAt(dcaFormSchema.safeParse({ ...base, frequency: 'WEEKLY', dayOfWeek: 'SATURDAY' }), 'dayOfWeek')).toBe('평일을 선택하세요.')
  })

  it('주식 금액은 소수 둘째 자리 USD를 허용하고 최소 금액 규칙을 걸지 않는다', () => {
    expect(dcaFormSchema.safeParse({ ...base, amount: 0.5 }).success).toBe(true)
  })
})

describe('buildDcaFormDefaults', () => {
  it('코인 등록 기본값은 시장가·09시다', () => {
    const d = buildDcaFormDefaults(undefined, 'BTC', 'CRYPTO_KRW')
    expect(d).toMatchObject({ market: 'CRYPTO_KRW', orderType: 'MARKET', executionHour: 9, amount: null })
  })

  it('주식 등록 기본값은 MOC이고 실행 시각이 없다', () => {
    expect(buildDcaFormDefaults(undefined, 'UPRO', 'US_STOCK')).toMatchObject({ orderType: 'MOC', executionHour: null })
  })

  it('수정 기본값은 응답의 금액·실행 시각을 채운다', () => {
    const d = buildDcaFormDefaults(cryptoStrategy, 'BTC', 'CRYPTO_KRW') // cryptoStrategy.dca: amount 10000, executionHour 0
    expect(d).toMatchObject({ amount: 10000, executionHour: 0 })
  })
})
```

`issueAt(result, path)`는 파일에 이미 있는 헬퍼 이름을 쓰고, 없으면 `result.success ? undefined : result.error.issues.find((i) => i.path.join('.') === path)?.message`로 파일 상단에 만든다. `cryptoStrategy` fixture는 기존 수정 기본값 테스트의 `Strategy` fixture를 복사해 만든다.

`buildDcaPayload.test.ts`의 fixture도 `amount`/`market`/`executionHour`로 바꾸고 추가:

```ts
it('코인은 amount와 executionHour를 보낸다', () => {
  expect(buildDcaConfig({ ...cryptoValues, executionHour: 0 })).toMatchObject({ amount: 5000, orderType: 'MARKET', executionHour: 0 })
})

it('주식은 executionHour를 보내지 않고 amountUsd 키도 만들지 않는다', () => {
  const config = buildDcaConfig(stockValues)
  expect(config).not.toHaveProperty('executionHour')
  expect(config).not.toHaveProperty('amountUsd')
  expect(config.amount).toBe(300)
})
```

- [ ] **Step 4: 실패 확인 후 스키마·payload 구현**

Run: `npx vitest run features/strategy/create-strategy/model` → FAIL

`dcaFormSchema.ts`:

```ts
import type { TradingMarket } from '@shared/lib/api-schema'
import { STOCK_WEEKDAYS } from '@entities/strategy'

export const MIN_CRYPTO_ORDER_KRW = 5000 // 업비트 최소 주문 금액
export const DEFAULT_EXECUTION_HOUR = 9 // 업비트 일봉 마감(09:00 KST) 직후
```

`z.object` 필드:

```ts
  market: z.enum(['US_STOCK', 'CRYPTO_KRW']), // 계좌 broker에서 정해지는 값 — 입력 필드가 아니다
  ticker: z.string().min(1, '종목을 선택하세요'),
  direction: z.enum(['BUY', 'SELL']),
  amount: z.number().positive('금액은 0보다 커야 합니다.').nullable()
    .refine((v): boolean => v != null, '금액을 입력하세요.'),
  orderType: z.enum(['MOO', 'MOC', 'MARKET']),
  executionHour: z.number().int().min(0).max(23).nullable(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']).nullable(),
```

`superRefine` 끝에 추가:

```ts
  if (v.market === 'CRYPTO_KRW') {
    if (v.orderType !== 'MARKET') ctx.addIssue({ code: 'custom', path: ['orderType'], message: '코인은 시장가 주문만 지원합니다.' })
    // 00시가 유효값이라 == null로 판정한다(truthy 검사 금지)
    if (v.executionHour == null) ctx.addIssue({ code: 'custom', path: ['executionHour'], message: '실행 시각을 선택하세요.' })
    if (v.amount != null && !Number.isInteger(v.amount)) {
      ctx.addIssue({ code: 'custom', path: ['amount'], message: '원 단위 정수로 입력하세요.' })
    } else if (v.amount != null && v.amount < MIN_CRYPTO_ORDER_KRW) {
      ctx.addIssue({ code: 'custom', path: ['amount'], message: '최소 주문 금액은 5,000원입니다.' })
    }
  } else {
    if (v.orderType === 'MARKET') ctx.addIssue({ code: 'custom', path: ['orderType'], message: '주문 방식을 선택하세요.' })
    if (v.frequency === 'WEEKLY' && v.dayOfWeek && !STOCK_WEEKDAYS.includes(v.dayOfWeek)) {
      ctx.addIssue({ code: 'custom', path: ['dayOfWeek'], message: '평일을 선택하세요.' })
    }
  }
```

`buildDcaFormDefaults(initial, defaultTicker, market)`:

```ts
  if (!initial || !d) {
    const isCrypto = market === 'CRYPTO_KRW'
    return {
      market, ticker: defaultTicker, direction: 'BUY', amount: null,
      orderType: isCrypto ? 'MARKET' : 'MOC', executionHour: isCrypto ? DEFAULT_EXECUTION_HOUR : null,
      frequency: 'MONTHLY', dayOfWeek: null, dayOfMonth: LAST_DAY, scheduledStartDate: todayKst(), conditions: [],
    }
  }
  return {
    market,
    ticker: initial.ticker,
    direction: d.direction,
    amount: d.amount,
    orderType: d.orderType,
    executionHour: d.executionHour ?? (market === 'CRYPTO_KRW' ? DEFAULT_EXECUTION_HOUR : null),
    ...
  }
```

`buildDcaPayload.ts`의 `buildDcaConfig`:

```ts
  // 스키마가 null을 거부하므로 도달 불가 — 0 폴백으로 조용히 0원 주문을 보내지 않도록 실패시킨다
  if (v.amount == null) throw new Error('amount는 스키마 검증을 통과한 값이어야 합니다')
  return {
    direction: v.direction,
    amount: v.amount,
    orderType: v.orderType,
    frequency: v.frequency,
    dayOfWeek: v.frequency === 'WEEKLY' ? v.dayOfWeek : null,
    dayOfMonth: v.frequency === 'MONTHLY' && v.dayOfMonth && v.dayOfMonth !== LAST_DAY ? Number(v.dayOfMonth) : null,
    // 코인만 실행 시각을 보낸다 — 주식은 서버가 무시하지만 키 자체를 만들지 않는다
    ...(v.market === 'CRYPTO_KRW' && v.executionHour != null ? { executionHour: v.executionHour } : {}),
    conditions: v.conditions.map(toCondition),
  }
```

Run → PASS

- [ ] **Step 5: 섹션 테스트 작성**

`sections/__fixtures__/dcaTestMeta.ts`의 `orderTypes`에 `{ code: 'MARKET', label: 'MARKET' }`을 더한다.

`DcaSettingsSection.test.tsx` (기존 렌더 헬퍼에 `market`을 받도록 확장):

```tsx
it('코인은 금액을 원 단위로 받고 주문 방식 대신 실행 시각을 보여준다', () => {
  renderSection({ market: 'CRYPTO_KRW' })
  expect(screen.getByLabelText('회차당 금액 (원)')).toHaveAttribute('step', '1')
  expect(screen.queryByText('주문 방식')).not.toBeInTheDocument()
  expect(screen.getByRole('combobox', { name: '실행 시각' })).toBeInTheDocument()
  expect(screen.queryByText(/휴장일이면/)).not.toBeInTheDocument()
})

it('코인 WEEKLY는 토·일을 포함한 7일을 보여준다', async () => {
  const user = userEvent.setup()
  renderSection({ market: 'CRYPTO_KRW' })
  await user.click(screen.getByText('매주'))
  await user.click(screen.getByRole('combobox', { name: '실행 요일' }))
  expect(screen.getByRole('option', { name: '일요일' })).toBeInTheDocument()
})

it('주식 WEEKLY는 평일만 보여준다', async () => {
  const user = userEvent.setup()
  renderSection({ market: 'US_STOCK' })
  await user.click(screen.getByText('매주'))
  await user.click(screen.getByRole('combobox', { name: '실행 요일' }))
  expect(screen.queryByRole('option', { name: '토요일' })).not.toBeInTheDocument()
  expect(screen.getByLabelText('회차당 금액 (USD)')).toHaveAttribute('step', '0.01')
})
```

라벨 텍스트 `'매주'`는 fixture의 `dcaFrequencies` 라벨에 맞춘다.

`DcaConditionsSection.test.tsx`:

```tsx
it('코인은 공포탐욕지수 출처를 Crypto로, 종가 기준을 업비트 일봉으로 안내한다', async () => {
  renderSection({ market: 'CRYPTO_KRW', conditions: [{ indicator: 'FEAR_GREED', operator: 'LTE', threshold: 20, smaPeriod: null }] })
  expect(screen.getByText(/Crypto Fear & Greed/)).toBeInTheDocument()
})

it('코인 SMA 설명은 직전 일봉 종가 기준이다', () => {
  renderSection({ market: 'CRYPTO_KRW', conditions: [{ indicator: 'SMA', operator: 'LTE', threshold: null, smaPeriod: 20 }] })
  expect(screen.getByText('직전 일봉 종가가 20일 이동평균 이하일 때 주문')).toBeInTheDocument()
  expect(screen.getByText(/업비트 일봉\(09:00 KST 마감\) 기준/)).toBeInTheDocument()
})
```

`operatorLabel` 텍스트("이하")는 fixture의 `dcaOperators` 라벨에 맞춘다.

`StrategyForm.test.tsx`:

```tsx
it('업비트 계좌는 DCA 외 전략 유형을 보여주지 않고 코인 티커만 고를 수 있다', () => {
  // meta: INFINITE availableTickers ['TQQQ'], DCA availableTickers ['UPRO','BTC'], tickers에 market 지정
  // runtime: DCA ticker allowedValues ['UPRO','QLD','BTC','ETH'], defaultValue 'UPRO'
  renderForm({ broker: 'UPBIT' })
  expect(screen.queryByText('무한매수법')).not.toBeInTheDocument()
  // DCA를 고르면 기본 티커가 UPRO가 아니라 BTC다
})
```

기존 파일의 mock 구성을 따라 구체적인 assertion을 채운다: 코인 계좌에서 유형 카드에 DCA만 있는지, `DcaStrategyForm`에 넘긴 `availableTickers`가 `['BTC', 'ETH']`이고 `defaultTicker`가 `'BTC'`인지, `market`이 `'CRYPTO_KRW'`인지. 주식 계좌에서는 DCA `availableTickers`에서 `BTC`·`ETH`가 빠지는지도 확인한다.

- [ ] **Step 6: 실패 확인**

Run: `npx vitest run features/strategy/create-strategy`
Expected: 새 테스트 FAIL

- [ ] **Step 7: 폼 구현**

`strategyFormHelpers.ts`의 `deriveRuntimeFields`에 시장 필터를 넣는다. 시그니처: `deriveRuntimeFields(initial, runtimeStrategy, isTickerAllowed: (code: string) => boolean)`.

```ts
  const availableTickers = initial
    ? [initial.ticker]
    : (runtimeStrategy?.fields.ticker.allowedValues ?? []).filter(isTickerAllowed)
```

`useStrategyForm.ts`에서 호출부를 고친다:

```ts
  const { isCrypto, meta } = data // useStrategyFormData 반환값
  const isTickerAllowed = (code: string) => isCryptoMarket(meta.tickers.find((t) => t.code === code)?.market) === isCrypto
```

`useStrategyForm`의 반환값에 `isCrypto`를 추가한다. 기존 `strategyFormHelpers.test.ts`의 `deriveRuntimeFields` 호출에 `() => true`를 넘기고, 필터 동작 테스트 하나를 더한다.

`StrategyForm.tsx`:

```ts
  // 코인 계좌는 코인 티커를 쓸 수 있는 유형만 보여준다(1차는 DCA만 해당) — 유형별 availableTickers가 SSOT
  const marketTypes = meta.strategyTypes.filter(({ availableTickers }) =>
    availableTickers.some((code) => isCryptoMarket(findTicker(code)?.market) === form.isCrypto))
  const strategyTypes = initial ? meta.strategyTypes : marketTypes.filter(({ code }) => enabledTypeSet.has(code))
```

`useMeta()`에서 `findTicker`도 꺼낸다. `DcaStrategyForm`에 `market={form.isCrypto ? 'CRYPTO_KRW' : 'US_STOCK'}`을 넘긴다. 수정 모드에서 기존 전략을 그대로 열 수 있도록 `initial`이 있으면 `meta.strategyTypes`를 그대로 쓴다(기존 동작 유지).

코인 계좌에서 등록 기본 유형: `useTypeDefaults`가 첫 활성 유형을 고른다면 `marketTypes` 기준으로 고르게 한다. 해당 훅이 `enabledStrategyTypes`를 받는다면 `useStrategyForm`에서 넘기기 전에 시장 필터를 건다. 코인 계좌에서 INFINITE가 기본 선택되어 숨겨진 유형으로 폼이 열리지 않는지를 `StrategyForm.test.tsx`에서 확인한다.

`DcaStrategyForm.tsx`:
- props에 `market: TradingMarket` 추가
- `defaultValues: buildDcaFormDefaults(initial, defaultTicker, market)`
- `DcaSettingsSection`, `DcaConditionsSection`에 `market` 전달
- `DcaSettingsSection`의 `orderTypes`는 시장별로 거른다: `orderTypes={(typeMeta?.orderTypes ?? []).filter((code) => (code === 'MARKET') === (market === 'CRYPTO_KRW'))}`

`DcaSettingsSection.tsx`:
- props에 `market: TradingMarket`
- `const isCrypto = market === 'CRYPTO_KRW'`
- 금액 입력:

```tsx
        <StrategyFieldLabel htmlFor={amountId}>{isCrypto ? '회차당 금액 (원)' : '회차당 금액 (USD)'}</StrategyFieldLabel>
        <Input id={amountId} type="number" inputMode={isCrypto ? 'numeric' : 'decimal'} min={0} step={isCrypto ? '1' : '0.01'}
          placeholder={isCrypto ? '5,000원 이상' : undefined}
          aria-invalid={!!errors.amount} aria-describedby={errors.amount ? `${amountId}-error` : undefined}
          {...register('amount', { setValueAs: (v) => (v === '' || v == null ? null : Number(v)) })}
          className="h-11 rounded-[var(--r-sm)] px-3" />
        {errors.amount && <p id={`${amountId}-error`} className="mt-1 text-sm text-[var(--status-error)]">{errors.amount.message}</p>}
```

- 주문 방식 블록은 `{!isCrypto && (...)}`로 감싼다(코인은 MARKET 고정, 기본값이 이미 MARKET).
- 코인이면 주기 블록 위에 실행 시각 Select:

```tsx
      {isCrypto && (
        <div className="py-[18px] border-b border-border">
          <StrategyFieldLabel>실행 시각</StrategyFieldLabel>
          <Controller control={form.control} name="executionHour" render={({ field }) => (
            <Select items={HOUR_OPTIONS.map((h) => ({ value: String(h), label: formatExecutionHour(h) }))}
              value={field.value == null ? '' : String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
              <SelectTrigger aria-label="실행 시각" aria-invalid={!!errors.executionHour} className="h-11 w-full"><SelectValue placeholder="시각 선택" /></SelectTrigger>
              <SelectContent>
                {HOUR_OPTIONS.map((h) => (
                  <SelectItem key={h} value={String(h)}>{formatExecutionHour(h)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )} />
          {errors.executionHour && <p className="mt-1 text-sm text-[var(--status-error)]">{errors.executionHour.message}</p>}
          <Caption>한국 시간 기준, 시장가로 주문</Caption>
        </div>
      )}
```

`const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => h)`를 컴포넌트 밖에 둔다. `Select`의 `items` prop 사용법은 같은 파일의 요일 Select를 그대로 따른다.

- 요일 Select의 목록: `const weekdays = isCrypto ? (Object.keys(WEEKDAY_LABEL) as DcaWeekday[]) : STOCK_WEEKDAYS`로 바꾸고 두 곳(`items`, `SelectItem` map)에 쓴다.
- `<Caption>휴장일이면 같은 주·월 안의 다음 거래일에 실행</Caption>`은 `{!isCrypto && ...}`로 감싼다.
- 수정 모드 잠금 정책은 그대로다. 실행 시각은 수정 모드에서도 바꿀 수 있다.

`DcaConditionsSection.tsx`:
- props에 `market: TradingMarket`
- `describeCondition(c, operatorLabel, isCrypto)`로 바꾸고, 코인이면 종가 문구와 RSI 기준을 바꾼다:

```ts
  const close = isCrypto ? '직전 일봉 종가' : '전일 종가'
  const rsiBase = isCrypto ? '직전 일봉' : '직전 거래일'
```

  AVG_PRICE·SMA 문장의 `전일 종가`를 `close`로, RSI 문장의 `직전 거래일`을 `rsiBase`로 바꾼다. FEAR_GREED는 코인이면 `주문 시점 Crypto Fear & Greed 지수가 ${t} ${operatorLabel}일 때 주문`, 비어 있으면 `주문 시점 Crypto Fear & Greed 지수와 비교, 0~100 입력`.
- 지표 선택지 라벨: meta 라벨이 `'공포탐욕지수(CNN)'`이라 코인에서는 덮어쓴다. 컴포넌트 밖에:

```ts
// meta 라벨에 CNN 출처가 박혀 있다 — 코인 계좌는 alternative.me 지수를 쓰므로 라벨을 덮어쓴다
const CRYPTO_INDICATOR_LABEL: Partial<Record<DcaIndicator, string>> = { FEAR_GREED: '공포탐욕지수(Crypto)' }
```

  지표 라벨을 그리는 곳에서 `(isCrypto && CRYPTO_INDICATOR_LABEL[code]) || labelOf('dcaIndicators', code)`를 쓴다.
- 코인일 때 기존 캡션 목록 아래에 `<p className="mt-1 text-sm text-muted-foreground">이동평균·RSI는 업비트 일봉(09:00 KST 마감) 기준</p>`을 더한다.

**api 요청(선택):** meta `dcaIndicators.FEAR_GREED.label`을 `'공포탐욕지수'`로 중립화해 달라고 "업비트 api" 세션에 요청하면 위 덮어쓰기 대신 주식에 `(CNN)`을 붙이는 쪽으로 단순해진다. 이 태스크는 요청 없이도 동작하게 만든다. 요청 여부는 컨트롤러가 사용자에게 묻는다.

- [ ] **Step 8: amountUsd 참조 정리**

`grep -rn "amountUsd" --include='*.ts' --include='*.tsx' . | grep -v node_modules | grep -v shared/lib/api-types.ts`로 남은 참조를 찾는다. 위젯 두 곳(`DcaStrategyCard.tsx:23`, `DcaStrategyDetail.tsx:52`)은 `dca.amount`로 이름만 바꾼다. 테스트 fixture(`DcaStrategyCard.test.tsx:27`, `StrategyCard.test.tsx:476`, `DcaStrategyDetail.test.tsx:28`, `useStrategyQueries.test.tsx:308`, `entities/strategy/api/index.test.ts`, `DcaStrategyForm.test.tsx`)도 `amount`로 바꾼다. normalizer 전환기 테스트의 `amountUsd` raw 입력만 남긴다.

- [ ] **Step 9: 검증**

Run: `npx vitest run entities/strategy features/strategy widgets/strategy-card widgets/strategy-detail && npm run typecheck`
Expected: PASS, 오류 0

- [ ] **Step 10: 커밋**

```bash
git add entities/strategy features/strategy/create-strategy widgets/strategy-card widgets/strategy-detail
git commit -m "feat: DCA 폼에 코인 시장가·실행 시각·원화 금액 규칙을 추가하고 금액 필드를 amount로 바꾼다"
```

---

### Task 6: DCA 표시와 수량·금액 포맷

**Files:**
- Modify: `widgets/strategy-card/DcaStrategyCard.tsx`, `DcaStrategyCard.test.tsx`
- Modify: `widgets/strategy-detail/DcaStrategyDetail.tsx`, `DcaStrategyDetail.test.tsx`
- Modify: `widgets/strategy-detail/DcaExecutionHistory.tsx`, `DcaExecutionHistory.test.tsx`(없으면 `DcaStrategyDetail.test.tsx`에서 확인)
- Modify: `widgets/strategy-detail/OrderRows.tsx:56,99`, `widgets/strategy-detail/StrategyOrderHistory.tsx:121,124`
- Modify: `widgets/admin-trade-list/AdminTradesTable.tsx:55-56`, `AdminTradesTable.test.tsx`

**Interfaces:**
- Consumes: Task 1의 `fmtMoney`, `fmtQuantity`, `isCryptoMarket`, `Currency`. Task 5의 `StrategyDcaSummary.amount`, `executionHour`, `formatDcaSchedule`

전략 위젯은 계좌 객체를 받지 않는다. 통화는 티커 시장으로 정한다:

```ts
const { findTicker } = useMeta()
const isCrypto = isCryptoMarket(findTicker(strategy.ticker)?.market)
const currency: Currency = isCrypto ? 'KRW' : 'USD'
```

`useMeta`를 mock하는 테스트는 mock에 `findTicker`를 더한다.

- [ ] **Step 1: 테스트 작성**

`DcaStrategyCard.test.tsx`:

```tsx
it('코인 DCA는 원화 금액·실행 시각을 보여주고 다음 판정일을 숨긴다', () => {
  renderCard({ ...dcaStrategy, ticker: 'BTC', dca: { ...dcaStrategy.dca!, amount: 50000, orderType: 'MARKET', frequency: 'DAILY', executionHour: 9, nextExecution: { usSessionDate: '2026-10-18', kstTradeDate: '2026-10-19' } } })
  expect(screen.getByText(/50,000원/)).toBeInTheDocument()
  expect(screen.getByText(/09시/)).toBeInTheDocument()
  expect(screen.queryByText(/다음 판정일/)).not.toBeInTheDocument()
})

it('주식 DCA는 달러 금액과 다음 판정일을 그대로 보여준다', () => {
  renderCard(dcaStrategy) // ticker UPRO, amount 300
  expect(screen.getByText(/\$300\.00/)).toBeInTheDocument()
  expect(screen.getByText(/다음 판정일/)).toBeInTheDocument()
})
```

meta mock의 `findTicker`가 `BTC`에 `{ code: 'BTC', market: 'CRYPTO_KRW' }`를 돌려주게 한다.

`DcaStrategyDetail.test.tsx`:

```tsx
it('코인 DCA 상세는 원화 금액·실행 시각·소수 수량을 보여주고 다음 판정일 행이 없다', () => {
  renderDetail({ ...dcaStrategy, ticker: 'BTC', currentHoldings: 0.01234567, dca: { ...dcaStrategy.dca!, amount: 50000, executionHour: 0 } })
  expect(screen.getByText('50,000원')).toBeInTheDocument()
  expect(screen.getByText(/00시/)).toBeInTheDocument()
  expect(screen.getByText('0.01234567 BTC')).toBeInTheDocument()
  expect(screen.queryByText('다음 판정일')).not.toBeInTheDocument()
})
```

실행 이력(`DcaExecutionHistory`)은 실행 이력 쿼리 mock에 코인 행(`referencePrice: 145000000`, `quantity: 0.00034482`, `order.filledPrice: 145100000`, `skipReason: 'BELOW_MIN_ORDER_AMOUNT'`)을 넣고 `145,000,000원`, `0.00034482`, `145,100,000원`이 보이는지 확인한다. `DcaExecutionHistory`는 `strategyId`만 받으므로 `ticker` prop을 추가한다(`DcaStrategyDetail.tsx:77`에서 `ticker={strategy.ticker}` 전달).

`AdminTradesTable.test.tsx`:

```tsx
it('코인 체결은 소수 수량과 원화 가격으로 보여준다', () => {
  renderTable([{ ...trade, ticker: 'BTC', quantity: 0.0005, price: 145000000 }])
  expect(screen.getByText('0.0005')).toBeInTheDocument()
  expect(screen.getByText('145,000,000원')).toBeInTheDocument()
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run widgets/strategy-card widgets/strategy-detail widgets/admin-trade-list`
Expected: 새 테스트 FAIL

- [ ] **Step 3: 구현**

`DcaStrategyCard.tsx`:

```ts
  const { labelOf, findTicker } = useMeta()
  const isCrypto = isCryptoMarket(findTicker(strategy.ticker)?.market)
  const summary = dca && `${formatDcaSchedule(dca, labelOf('dcaFrequencies', dca.frequency))} · ${fmtMoney(dca.amount, isCrypto ? 'KRW' : 'USD')} · ${labelOf('orderTypes', dca.orderType)}`
```

다음 판정일 줄:

```tsx
              {/* 코인 전략의 nextExecution은 api C 전까지 미국 거래일 기준이라 부정확하다 — 표시하지 않는다 */}
              {(!isCrypto || lastLabel) && (
                <p className="text-xs text-muted-foreground">
                  {!isCrypto && `다음 판정일 ${dca.nextExecution ? fmtDate(dca.nextExecution.kstTradeDate) : '미정'}`}
                  {lastLabel && `${isCrypto ? '' : ' · '}최근 ${lastLabel}`}
                </p>
              )}
```

`DcaStrategyDetail.tsx`:

```tsx
              <Row label="회차당 금액">{fmtMoney(dca.amount, currency)}</Row>
              <Row label="주문 방식">{labelOf('orderTypes', dca.orderType)}</Row>
              {!isCrypto && <Row label="다음 판정일">{dca.nextExecution ? fmtDate(dca.nextExecution.kstTradeDate) : '미정'}</Row>}
```

`주기` 행은 `formatDcaSchedule`이 이미 실행 시각을 붙인다. 보유 수량 행:

```tsx
          <Row label="보유 수량">{strategy.currentHoldings != null ? (isCrypto ? `${fmtQuantity(strategy.currentHoldings)} ${strategy.ticker}` : `${fmtQuantity(strategy.currentHoldings)}주`) : '-'}</Row>
```

`DcaExecutionHistory.tsx`: props에 `ticker: string`을 더하고 `currency`를 위 방식으로 구한다. `:62` `fmtMoney(r.referencePrice, currency)`, `:63` `r.quantity != null ? fmtQuantity(r.quantity) : '-'`, `:66` `` ` · ${fmtMoney(r.order.filledPrice, currency)}` ``.

`OrderRows.tsx:56,99`와 `StrategyOrderHistory.tsx:121,124`의 수량 표시를 `fmtQuantity(...)`로 감싼다. 이 두 파일의 가격은 무한매수·VR 등 주식 전략 화면이라 USD 그대로 둔다(코인은 DCA만 있다).

`AdminTradesTable.tsx:55-56`:

```tsx
                <TableDataCell className="whitespace-nowrap">{fmtQuantity(trade.quantity)}</TableDataCell>
                <TableDataCell className="font-mono text-xs whitespace-nowrap">{fmtMoney(trade.price, isCryptoMarket(findTicker(trade.ticker)?.market) ? 'KRW' : 'USD')}</TableDataCell>
```

`useMeta`에서 `findTicker`를 꺼낸다. 관리자 일괄 정정 폼(`AdminBatchOrderCorrectionForm`)은 주식 사이클 주문 정정 전용이라 바꾸지 않는다.

`CycleHistoryTable`은 코인 계좌에서 렌더하지 않으므로(Task 4) 바꾸지 않는다.

- [ ] **Step 4: 검증**

Run: `npx vitest run widgets/strategy-card widgets/strategy-detail widgets/admin-trade-list && npm run typecheck`
Expected: PASS, 오류 0

- [ ] **Step 5: 커밋**

```bash
git add widgets/strategy-card widgets/strategy-detail widgets/admin-trade-list
git commit -m "feat: 코인 DCA 금액·수량을 원화와 소수 수량으로 표시하고 코인 전략의 다음 판정일을 숨긴다"
```

---

### Task 7: 문서 드리프트

**Files:**
- Modify (해당 시): `README.md`, `docs/agents/entities.md`, `docs/agents/features.md`

- [ ] **Step 1: 드리프트 확인**

Run: `grep -nE "한국투자증권|토스증권|KIS|TOSS|브로커|증권사" README.md docs/agents/entities.md docs/agents/features.md | head -40`

README가 지원 증권사 목록이나 계좌 연결 흐름을 설명하면 업비트를 더한다. `docs/agents/entities.md`에 계좌·DCA 도메인 설명이 있으면 아래 두 줄을 해당 위치에 더한다.

- 시장 판정은 `shared/lib/api-schema.ts`의 `isCryptoBroker`/`brokerCurrency`(broker 기준)와 `isCryptoMarket`(티커 meta 기준)이다. 코인 계좌로 `portfolio`·`margin`·`prices`를 부르면 400이므로 새 계좌 단위 쿼리는 `isCryptoBroker`로 게이팅한다.
- DCA 금액 필드는 `amount`(계좌 통화)다. 코인은 `executionHour`(KST)를 함께 보낸다.

`../kista-api/README.md`는 이 레포 작업 범위가 아니다. 영향이 있으면 "업비트 api" 세션에 알린다.

- [ ] **Step 2: 커밋 (문서만 바뀐 경우 리뷰 생략 가능)**

```bash
git add README.md docs/agents
git commit -m "docs: 업비트 계좌와 코인 DCA를 문서에 반영한다"
```

---

### Task 8: 최종 검증

- [ ] **Step 1: 정적 검증과 전체 테스트 (1회)**

Run:

```bash
npm run typecheck && npm run lint 2>&1 | tail -5 && npm run knip 2>&1 | tail -10 && npm run test:run 2>&1 | grep -E "Test Files|Tests|FAIL" | head -20
```

Expected: typecheck 오류 0, lint error·warning 0, knip 0건, 테스트 전부 PASS. knip이 새 export(`formatExecutionHour` 등)를 미사용으로 잡으면 쓰는 곳이 있는지 보고, 없으면 지운다.

- [ ] **Step 2: 화면 확인 (dev 서버 + visual-diff 프록시)**

전제: 로컬 kista-api(8080·8081)가 떠 있어야 한다. 떠 있지 않으면 "업비트 api" 세션에 기동을 요청한다(직접 띄우지 않는다). 로컬 DB에는 UPBIT 계좌가 없고 runtime-config의 `UPBIT.enabled`가 false다. 로컬 DB 쓰기는 금지다.

`page.route`만으로는 안 된다. 계좌 상세·전략 등록·계좌 수정 화면은 Server Component가 계좌를 서버에서 직접 조회한다(`page.tsx`의 `fetchQuery(accountDetailQueryOptions)`, `loadAccountForNewStrategy`). 브라우저 요청만 가로채면 합성 계좌가 서버에 없어 `notFound()`가 된다. 그래서 trading(8081) 응답은 `scripts/visual-diff`의 GET 전용 프록시(`proxy.mjs`, :8181→8081, 쓰기 403)에서 합성한다.

1. `scripts/visual-diff/fixtures/trading.mjs`에 `crypto` 모드를 추가한다. 기존 모드(`deficit` 등)의 구조를 따른다. 합성 계좌 id는 16진수 UUID `00000000-0000-4000-8000-0000000c0170`이다.
   - `GET /api/accounts`: upstream 목록 끝에 `{ id, nickname: '코인 계좌', accountNoMasked: null, accountNo: null, broker: 'UPBIT', currency: 'KRW', apiKeyExpiresAt: <오늘+10일 ISO> }`를 붙인다.
   - `GET /api/accounts/<id>/crypto-portfolio`: `{ krwCash: 120000, totalAssetKrw: 1478024, holdings: [{ ticker: 'BTC', quantity: 0.01234567, avgBuyPrice: 100000000, currentPrice: 110000000, evalAmountKrw: 1358024 }, { ticker: 'ETH', quantity: 0.5, avgBuyPrice: 5000000, currentPrice: null, evalAmountKrw: 0 }] }`
   - 이 계좌의 전략 목록(경로는 `entities/strategy/api`의 계좌별 목록 함수에서 확인): 코인 DCA 1건(`ticker: 'BTC'`, `dca.amount: 50000`, `orderType: 'MARKET'`, `frequency: 'DAILY'`, `executionHour: 9`). DCA 실행 이력 경로는 빈 페이지로 응답한다.
   - 이 계좌의 previews는 `{}`, cycle-history는 빈 페이지다.
   - 이 계좌의 `portfolio`·`margin`·`prices`·`daily-trades` 요청이 오면 400을 돌려주고 `proxy.log`에 `CRYPTO_GATE_VIOLATION <path>`를 남긴다. 확인이 끝난 뒤 이 줄이 0건이어야 한다.
2. 프록시와 dev 서버를 띄운다. 띄우는 방식(포트, `API_BASE_URL`·trading base URL 환경변수, 모드 지정)은 `scripts/visual-diff/run.mjs`가 프록시와 `next dev`를 띄우는 코드를 그대로 따른다. dev 서버는 이 워크트리에서 1개만 띄운다.
3. 브라우저 요청 중 runtime-config만 Playwright `page.route('**/api/runtime-config', ...)`로 바꾼다(클라이언트가 Route Handler로 부르므로 가로챌 수 있다). `route.fetch()`로 실제 응답을 받아 `brokers.UPBIT.enabled`만 `true`로 바꿔 돌려준다. meta는 서버 layout이 실제 api에서 받으며 이미 UPBIT·BTC·ETH를 포함한다.
4. 인증은 dev-token(`POST localhost:8080/api/auth/dev-token`, 8080 직접 호출)으로 받는다. 쿠키 주입은 `scripts/visual-diff/shoot.mjs`의 로그인 처리를 그대로 쓴다.

확인할 화면과 스크린샷(1440×900, 390×844, 스크래치패드에 저장):
1. `/accounts/new`: 증권사 목록에 업비트 카드, 업비트 선택 후 API 키 스텝의 허용 IP 박스와 출금 경고
2. `/accounts/<코인 id>`: 원화 예수금·총자산 KPI, 만료 임박 배지, 보유 코인 표(ETH "현재가 확인 불가"), 사이클 이력 표 없음
3. `/accounts/<코인 id>/edit`: 계좌번호 입력 없음, API 키 재등록 카드
4. `/accounts/<코인 id>/strategies/new`: 유형에 DCA만, 티커 BTC/ETH, 금액 "(원)", 실행 시각 Select, 주문 방식 카드 없음, 휴장일 캡션 없음, WEEKLY 요일 7개
5. `/accounts/<코인 id>/strategies/<코인 전략 id>`: 원화 금액, "매일 09시", 다음 판정일 없음
6. 시드 KIS·MOCK 계좌의 `/strategies/new`에서 DCA: 티커에 BTC/ETH 없음, MOO/MOC 카드, 평일 5개, `/prices` 요청 쿼리에 BTC 없음
7. 시드 주식 DCA 전략 카드: "$" 금액, 시각 표시 없음(주식 `executionHour`는 api가 null로 준다 — `DcaResponse.java:22`, V9 마이그레이션 주석)

모든 화면을 본 뒤 `grep CRYPTO_GATE_VIOLATION proxy.log`가 0건인지 확인한다. 등록·수정·키 재등록 제출은 하지 않는다(쓰기). 실주문은 실계좌가 필요해 미검증으로 남긴다.

`fixtures/trading.mjs`의 `crypto` 모드는 다음 작업에서도 쓰도록 남기고 Task 8 커밋에 포함한다(`scripts/visual-diff/README.md`의 fixture 모드 목록에 한 줄 추가).

- [ ] **Step 3: 접근성 점검**

Run: `npm run a11y-check -- --url http://localhost:<dev 포트>` (Step 2의 route 합성 없이 확인 가능한 화면 범위). 새 Select(`실행 시각`)와 복사 버튼의 이름, 보유 코인 표의 region 이름을 확인한다.

- [ ] **Step 4: 후속 요청 정리**

사용자에게 보고할 후속 항목:
- UI 배포 뒤 "업비트 api" 세션에 `amountUsd` 제거를 요청한다(A 계약 전환기 종료).
- 관리자 계좌 목록의 UPBIT 계좌번호 "****" 표시는 api 후속 정리 대상이다(B 확정 내역).
- 운영에서 `brokers.UPBIT.enabled`를 켜고 DCA 허용 티커에 BTC/ETH를 추가하는 것은 관리자 화면 작업이다.
- api 묶음 C(코인 스케줄러, 키 만료 알림, 코인 `nextExecution`) 이후 코인 전략 다음 실행일 표시를 추가한다.
- 로컬 kista-api 종료는 사용자가 끝을 확정한 뒤 "업비트 api" 세션에 요청한다.

- [ ] **Step 5: 커밋 (fixture 모드, 검증 중 고친 것)**

```bash
git add scripts/visual-diff/fixtures/trading.mjs scripts/visual-diff/README.md
git commit -m "chore: visual-diff 프록시에 코인 계좌 fixture 모드를 추가한다"
```

검증 중 코드 결함을 고쳤다면 리뷰를 거친 뒤 해당 파일을 따로 커밋한다.
