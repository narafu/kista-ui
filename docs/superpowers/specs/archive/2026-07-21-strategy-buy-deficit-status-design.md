# 전략 매수 미접수/예수금 부족 상태 표시 개선

> 관련 선행 스펙: `2026-07-18-strategy-card-deficit-accuracy-design.md`(카드 예산부족 배지의 기원), `2026-07-21-direct-order-preview-cleanup-ui-design.md`(오늘 오전 `previewDeficit` 복원)

## 배경

사용자가 직접 화면을 확인하며 두 가지 부족한 점을 지적했다.

1. **장 개시 전(preview 모드)**: 전략 목록 카드에서 예수금 부족을 노랑으로만 표시 — 더 눈에 띄는 빨강을 원함.
2. **장 개시 후(executed 모드, 즉 오늘 주문이 이미 하나 이상 시도됨)**: `StrategyDetail`이 "매도 접수/매수 미접수"는 잘 구분하지만
   - 얼마가 부족한지 금액을 보여주지 않는다 (배지가 `mode==='preview'`일 때만 렌더링돼 executed 모드에서는 아예 안 보임).
   - 예수금을 채워 넣어도 화면 상태가 안 바뀐다 — 사실 백엔드(`TradingBuyCompetitionSimulator.simulate()`)의 `availableDeposit`는 매 preview 호출마다 브로커 라이브 조회라 이미 최신값인데, 프론트가 executed 모드에서 이 정보 자체를 숨기고 있었을 뿐이다.
   - 전략 목록 카드는 `marketSession`(DIRECT/BLOCKED)으로 색상을 정해, "매도만 접수되고 매수는 미접수"인데 예수금이 채워진 경우를 초록으로 잘못 표시한다 — session 값은애초에 "이 전략의 주문이 실제로 시도됐는지"를 모른다.

## 설계

### 데이터는 이미 있다 — API 변경 없음

`GET /api/trading-cycles/{id}/preview` 응답의 `todayOrders`(방향별 실제 접수 여부)와 `competition`(라이브 예산 판정)만으로 요구사항을 전부 충전할 수 있다. 단 하나, `competition.liveBalanceUnavailable` 필드가 API에는 있지만 **UI 타입에 매핑이 안 돼 있었다** — 이번에 추가한다.

### 발견한 엣지케이스: `liveBalanceUnavailable`

`TradingBuyCompetitionSimulator`는 브로커 라이브 예수금 조회 자체가 실패하면(`KisApiException`/`TossApiException`) `sufficientBudget=true`(fail-open)로 채우고 `liveBalanceUnavailable=true`를 반환한다(`BuyCompetitionPreview.unavailable()`). 이 필드를 무시하고 카드 3단계 색상을 만들면 "BUY 미접수 + `hasDeficit=false`(사실은 몰라서 fail-open)" 상황을 "예수금 충족됨, 안심"으로 **잘못 표시**하게 된다. 그래서 판정 시 "모르면 안전 쪽(경고 유지)"으로 처리한다.

### 1. 공용 판정 로직 — `entities/order/model/buy-readiness.ts` (신규)

카드/상세 두 곳이 각자 `hasDeficit` 등을 따로 계산해왔다. 판정이 3단계로 늘어나므로 순수 함수로 뽑아 공유한다.

```ts
import { toNum } from '@shared/lib/utils'
import type { NextOrderPreview } from './types'

export interface BuyReadiness {
  hasBuyOrders: boolean
  hasDeficit: boolean           // 라이브 예산 부족 (신뢰 가능한 경우만 true — liveBalanceUncertain이면 항상 false)
  buyUnplaced: boolean          // 계획엔 있는데 오늘 실제 미접수 (오늘 시도 자체가 없으면 false)
  sellUnplaced: boolean
  liveBalanceUncertain: boolean // 라이브 예수금 조회 자체 실패 — 부족/충족 판정 불가
  deficitUsd: number            // hasDeficit일 때만 의미 있음, 그 외 0
}

export function computeBuyReadiness(preview: NextOrderPreview | undefined): BuyReadiness {
  const orders = preview?.orders ?? []
  const todayOrders = preview?.todayOrders ?? []
  const competition = preview?.competition ?? null
  const hasTodayOrders = todayOrders.length > 0

  const plannedDirections = new Set(orders.map((o) => o.direction))
  const placedDirections = new Set(todayOrders.map((o) => o.direction))

  const hasBuyOrders = plannedDirections.has('BUY')
  const hasDeficit = hasBuyOrders && competition ? !competition.sufficientBudget : false
  const liveBalanceUncertain = competition?.liveBalanceUnavailable ?? false
  const deficitUsd = competition
    ? Math.max(0, toNum(competition.consumedByHigherPriority) + toNum(competition.requiredForThisStrategy) - toNum(competition.availableDeposit))
    : 0

  return {
    hasBuyOrders,
    hasDeficit,
    buyUnplaced: hasTodayOrders && plannedDirections.has('BUY') && !placedDirections.has('BUY'),
    sellUnplaced: hasTodayOrders && plannedDirections.has('SELL') && !placedDirections.has('SELL'),
    liveBalanceUncertain,
    deficitUsd,
  }
}
```

`entities/order/index.ts`에 `computeBuyReadiness`, `BuyReadiness` export 추가.

### 2. UI 타입에 `liveBalanceUnavailable` 추가

`entities/order/model/types.ts`:
```ts
export interface BuyCompetitionSummary {
  sufficientBudget: boolean
  availableDeposit: string
  requiredForThisStrategy: string
  consumedByHigherPriority: string
  blockedByHigherPriority: CompetingStrategy[]
  uncertainStrategyIds: string[]
  liveBalanceUnavailable: boolean   // 신규
}
```

`entities/order/api/index.ts`의 `normalizeCompetition()`:
```ts
return {
  sufficientBudget: Boolean(r.sufficientBudget),
  availableDeposit: String(r.availableDeposit ?? '0'),
  requiredForThisStrategy: String(r.requiredForThisStrategy ?? '0'),
  consumedByHigherPriority: String(r.consumedByHigherPriority ?? '0'),
  blockedByHigherPriority: ((r.blockedByHigherPriority as unknown[]) ?? []).map(normalizeCompetingStrategy),
  uncertainStrategyIds: ((r.uncertainStrategyIds as unknown[]) ?? []).map(String),
  liveBalanceUnavailable: Boolean(r.liveBalanceUnavailable),   // 신규
}
```

### 3. `StrategyCard.tsx` — 색상 로직을 order 상태 기준으로 전면 교체

```ts
// BEFORE
import { useMarketSessionQuery } from '@entities/market'
...
const previewOrders = preview?.orders ?? []
const hasBuyOrders = previewOrders.some((o) => o.direction === 'BUY')
const { data: marketSession } = useMarketSessionQuery()
...
const hasPlannedOrder = (preview?.todayOrders ?? []).some((o) => o.status === 'PLANNED')
const competition = preview?.competition ?? null
const hasDeficit = hasBuyOrders && competition ? !competition.sufficientBudget : false
const orderBorderColor = hasDeficit
  ? (marketSession?.session === 'DIRECT' ? 'var(--status-error)' : 'var(--warn)')
  : hasPlannedOrder
    ? 'var(--status-ok)'
    : null

// AFTER
import { computeBuyReadiness } from '@entities/order'
...
const readiness = computeBuyReadiness(preview)
const hasTodayOrders = (preview?.todayOrders ?? []).length > 0
// 부족 최우선, 그 다음 "미접수인데 안전 확인 불가"도 부족과 동일 취급(모르면 경고 유지) — SELL만 성공해도 이 상태면 안심 색을 보여주지 않는다
const orderBorderColor = readiness.hasDeficit || (readiness.buyUnplaced && readiness.liveBalanceUncertain)
  ? 'var(--status-error)'
  : readiness.buyUnplaced
    ? 'var(--warn)'
    : hasTodayOrders
      ? 'var(--status-ok)'
      : null
```

`useMarketSessionQuery`·`marketSession` 관련 코드는 전부 제거한다. (`@entities/market`의 `useMarketSessionQuery`는 다른 화면에서도 쓰이므로 훅 자체는 그대로 유지 — `StrategyCard.tsx`에서의 사용만 제거.)

### 4. `StrategyDetail.tsx`

로컬 `hasDeficit`/`previewDeficit` 계산을 `computeBuyReadiness()` 호출로 교체하고, `unplacedDirections`의 Set 기반 계산도 `readiness.buyUnplaced`/`readiness.sellUnplaced`로 대체(중복 로직 제거).

```ts
// BEFORE
const hasBuyOrders = orders.some((o) => o.direction === 'BUY')
const competition = preview?.competition ?? null
const hasDeficit = hasBuyOrders && competition ? !competition.sufficientBudget : false
const previewDeficit = competition
  ? Math.max(0, toNum(competition.consumedByHigherPriority) + toNum(competition.requiredForThisStrategy) - toNum(competition.availableDeposit))
  : 0

const plannedDirections = new Set(orders.map((o) => o.direction as 'BUY' | 'SELL'))
const placedDirections = new Set(placedOrders.map((o) => o.direction))
const unplacedDirections = mode === 'executed'
  ? [...plannedDirections].filter((d) => !placedDirections.has(d))
  : []

// AFTER
const readiness = computeBuyReadiness(preview)
const unplacedDirections: Array<'BUY' | 'SELL'> = mode === 'executed'
  ? [...(readiness.buyUnplaced ? (['BUY'] as const) : []), ...(readiness.sellUnplaced ? (['SELL'] as const) : [])]
  : []
```

`toNum`이 이 파일에서 더 이상 필요 없어지면(포지션 KPI 카드 등 다른 곳에서 계속 쓰이는지 확인 후) import 정리.

미접수 안내 문구를 상태별로 3분기 — BUY 방향에만 적용, SELL 문구는 그대로:
```ts
function buyUnplacedMessage(r: BuyReadiness): string {
  if (r.liveBalanceUncertain) return '예수금 확인 실패로 매수 미접수 — 잠시 후 다시 확인해주세요'
  if (r.hasDeficit) return '예수금 부족으로 매수 미접수'
  return '예수금 충족됨 — 마감 시 매수 재시도 예정'
}
```

```jsx
{unplacedDirections.map((d) => (
  <p key={d} className="text-sm lg:text-base text-warn">
    {d === 'BUY' ? buyUnplacedMessage(readiness) : '판매가능수량 부족으로 매도 미접수'}
  </p>
))}
```

예수금 부족 배지 — 기존 `mode==='preview'` 블록(휴장일/바로주문 버튼)은 그대로 두고, **`mode==='executed'` 전용 배지를 새로 추가**(최소 diff, 기존 preview 블록의 휴장일-우선 표시 순서는 건드리지 않음):

```jsx
{canExecute && mode === 'preview' && (
  <div className="flex items-center gap-2">
    {(isHoliday || readiness.hasDeficit) && (
      <Badge tone="warn" size="sm">
        {isHoliday ? '휴장일' : `예수금 부족 ($${fmtUsd(readiness.deficitUsd)} 부족)`}
      </Badge>
    )}
    <button ...>바로 주문</button>
  </div>
)}
{canExecute && mode === 'executed' && readiness.hasDeficit && (
  <Badge tone="warn" size="sm">{`예수금 부족 ($${fmtUsd(readiness.deficitUsd)} 부족)`}</Badge>
)}
```

executed 모드에서 예수금이 채워지면 다음 preview refetch(재방문/포커스 또는 60초 staleTime 경과) 시 `competition.sufficientBudget`이 true로 갱신 → `readiness.hasDeficit`가 false가 되어 배지가 자동으로 사라진다. `unplacedDirections`의 BUY 문구는 `buyUnplacedMessage()`가 이 시점에 "예수금 충족됨 — 마감 시 매수 재시도 예정"으로 자동 전환된다 — 별도 상태 관리 불필요, 기존 `useStrategyOrderPreviewQuery` 재조회만으로 반영.

### 5. 재조회 지연

기존 `staleTime: 60_000` 그대로 유지 — 변경 없음.

## 테스트 계획

- `entities/order/model/buy-readiness.test.ts` (신규): 순수 함수 단위 테스트. preview 미존재/orders 없음/todayOrders 없음(아직 미시도)/BUY만 미접수/SELL만 미접수/양쪽 다 접수/`liveBalanceUnavailable=true`+미접수 각 케이스에서 `BuyReadiness` 필드 값 검증.
- `StrategyCard.test.tsx`:
  - 기존 "장 개시 전 노랑(orange)" 테스트 → "예수금 부족 → 빨강"으로 교체, `marketSessionState` mock 및 `@entities/market` mock 제거(더 이상 import 안 하므로)
  - 신규: `todayOrders`에 SELL만 PLACED + `competition.sufficientBudget: true` + `orders`에 BUY 계획 존재 → 노랑(`var(--warn)`)
  - 신규: `todayOrders`에 BUY·SELL 모두 PLACED → 초록(`var(--status-ok)`)
  - 신규: `todayOrders`에 SELL만 PLACED + `competition.liveBalanceUnavailable: true` → 빨강 (모르면 경고 유지)
- `StrategyDetail.test.tsx`:
  - executed 모드 + `hasDeficit` → 배지에 정확한 금액 문자열 렌더 검증(기존 preview 모드 배지 테스트와 동일한 계산식 재사용)
  - executed 모드 + BUY unplaced + 예수금 충족(sufficientBudget: true) → 배지 없음 + 문구가 "예수금 충족됨 — 마감 시 매수 재시도 예정"로 렌더
  - executed 모드 + BUY unplaced + `liveBalanceUnavailable: true` → 배지 없음 + 문구가 "예수금 확인 실패로 매수 미접수 — 잠시 후 다시 확인해주세요"로 렌더
  - 기존 preview 모드 배지/버튼 동작 회귀 테스트 그대로 통과 확인
- `npx tsc --noEmit`, `npx vitest run`

## 구현 범위 요약

- 신규: `entities/order/model/buy-readiness.ts`, `entities/order/model/buy-readiness.test.ts`
- 수정: `entities/order/model/types.ts`(`liveBalanceUnavailable` 필드), `entities/order/api/index.ts`(normalize 추가), `entities/order/index.ts`(export 추가), `widgets/strategy-card/StrategyCard.tsx`(색상 로직 교체, `useMarketSessionQuery` 제거), `widgets/strategy-detail/StrategyDetail.tsx`(readiness 훅 사용, executed 배지 추가, 문구 3분기)
- 수정(테스트): `StrategyCard.test.tsx`, `StrategyDetail.test.tsx`
- 무변경: kista-api(모든 필요 데이터가 이미 응답에 존재 — `liveBalanceUnavailable`만 UI 매핑 누락이었음), `useStrategyOrderPreviewQuery`의 `staleTime`
