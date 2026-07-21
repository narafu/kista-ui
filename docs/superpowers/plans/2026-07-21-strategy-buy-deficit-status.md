# 전략 매수 미접수/예수금 부족 상태 표시 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 전략 목록 카드의 색상 판정을 marketSession 기준에서 "오늘 계획된 주문 중 실제 미접수 방향" 기준으로 교체하고(빨강/노랑/초록 3단계), 전략 상세 페이지가 장 개시 후(executed 모드)에도 예수금 부족 금액과 문구를 정확히 보여주게 한다.

**Architecture:** kista-api 응답에는 이미 필요한 데이터(`todayOrders` 방향별 상태, `competition.liveBalanceUnavailable`)가 있다 — API 변경 없음. `entities/order`에 순수 함수 `computeBuyReadiness()`를 신설해 카드·상세 두 위젯이 공유하고, `liveBalanceUnavailable` 필드를 UI 타입에 새로 매핑한다.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest + Testing Library.

## Global Constraints

- API 응답 스키마·엔드포인트 변경 없음 — `entities/order`의 타입·정규화 함수와 두 위젯(`StrategyCard`, `StrategyDetail`)만 수정.
- 라이브 예수금 조회 자체가 실패한 경우(`competition.liveBalanceUnavailable === true`)는 "부족 여부를 모른다"는 뜻이다 — 이 경우 "충족됨"이라고 안심시키는 표시를 해서는 안 되며, 카드 색상은 경고(빨강)를 유지한다.
- `buyUnplaced`/`sellUnplaced`는 오늘 이미 하나 이상의 주문이 시도된 경우(`todayOrders.length > 0`)에만 의미가 있다 — 아직 아무 시도도 없는 상태(순수 preview)에서는 항상 `false`.
- 커밋 메시지는 한글, `feat:`/`refactor:`/`test:` 접두사.

---

### Task 1: `liveBalanceUnavailable` 필드를 UI 타입에 매핑

**Files:**
- Modify: `entities/order/model/types.ts`
- Modify: `entities/order/api/index.ts`
- Modify: `entities/order/api/index.test.ts`
- Modify: `widgets/strategy-detail/StrategyDetail.test.tsx` (필드 추가로 깨지는 기존 리터럴 목 2곳만 보정 — 아래 Step 5-1)

**Interfaces:**
- `BuyCompetitionSummary`에 `liveBalanceUnavailable: boolean` 필드 추가 — 이후 Task 2의 `computeBuyReadiness()`가 이 필드를 읽는다.

- [ ] **Step 1: 기존 테스트에 실패하는 기대값 추가 (RED)**

`entities/order/api/index.test.ts`의 `'normalizes a populated competition field including nested competing strategies'` 테스트를 아래로 교체:

```ts
  it('normalizes a populated competition field including nested competing strategies', async () => {
    const { getStrategyOrdersPreview } = await import('./index')
    clientFetchMock.mockResolvedValueOnce({
      tradeDate: '2026-07-18',
      position: null,
      orders: [],
      skipReason: null,
      todayOrders: [],
      otherStrategiesPlannedBuyUsd: '0',
      competition: {
        sufficientBudget: false,
        availableDeposit: 1000,
        requiredForThisStrategy: 200,
        consumedByHigherPriority: 900,
        blockedByHigherPriority: [
          { strategyId: 'vr-1', type: 'VR', ticker: 'TQQQ', requiredBuyUsd: 900, priority: 0 },
        ],
        uncertainStrategyIds: ['privacy-1'],
        liveBalanceUnavailable: true,
      },
    })

    const result = await getStrategyOrdersPreview('strategy-1')

    expect(result.competition).toEqual({
      sufficientBudget: false,
      availableDeposit: '1000',
      requiredForThisStrategy: '200',
      consumedByHigherPriority: '900',
      blockedByHigherPriority: [
        { strategyId: 'vr-1', type: 'VR', ticker: 'TQQQ', requiredBuyUsd: '900', priority: 0 },
      ],
      uncertainStrategyIds: ['privacy-1'],
      liveBalanceUnavailable: true,
    })
  })
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run entities/order/api/index.test.ts`
Expected: FAIL — `result.competition`에 `liveBalanceUnavailable` 키가 없어 `toEqual` 불일치.

- [ ] **Step 3: 타입에 필드 추가**

`entities/order/model/types.ts` 현재(35-42행):
```ts
export interface BuyCompetitionSummary {
  sufficientBudget: boolean
  availableDeposit: string
  requiredForThisStrategy: string
  consumedByHigherPriority: string
  blockedByHigherPriority: CompetingStrategy[]
  uncertainStrategyIds: string[]
}
```
변경 후:
```ts
export interface BuyCompetitionSummary {
  sufficientBudget: boolean
  availableDeposit: string
  requiredForThisStrategy: string
  consumedByHigherPriority: string
  blockedByHigherPriority: CompetingStrategy[]
  uncertainStrategyIds: string[]
  liveBalanceUnavailable: boolean   // 라이브 예수금 조회 자체 실패 시 true — sufficientBudget/availableDeposit 신뢰 불가
}
```

- [ ] **Step 4: 정규화 함수에 필드 추가**

`entities/order/api/index.ts`의 `normalizeCompetition()` 현재:
```ts
function normalizeCompetition(raw: unknown): BuyCompetitionSummary | null {
  if (raw == null) return null
  const r = raw as Record<string, unknown>
  return {
    sufficientBudget: Boolean(r.sufficientBudget),
    availableDeposit: String(r.availableDeposit ?? '0'),
    requiredForThisStrategy: String(r.requiredForThisStrategy ?? '0'),
    consumedByHigherPriority: String(r.consumedByHigherPriority ?? '0'),
    blockedByHigherPriority: ((r.blockedByHigherPriority as unknown[]) ?? []).map(normalizeCompetingStrategy),
    uncertainStrategyIds: ((r.uncertainStrategyIds as unknown[]) ?? []).map(String),
  }
}
```
변경 후:
```ts
function normalizeCompetition(raw: unknown): BuyCompetitionSummary | null {
  if (raw == null) return null
  const r = raw as Record<string, unknown>
  return {
    sufficientBudget: Boolean(r.sufficientBudget),
    availableDeposit: String(r.availableDeposit ?? '0'),
    requiredForThisStrategy: String(r.requiredForThisStrategy ?? '0'),
    consumedByHigherPriority: String(r.consumedByHigherPriority ?? '0'),
    blockedByHigherPriority: ((r.blockedByHigherPriority as unknown[]) ?? []).map(normalizeCompetingStrategy),
    uncertainStrategyIds: ((r.uncertainStrategyIds as unknown[]) ?? []).map(String),
    liveBalanceUnavailable: Boolean(r.liveBalanceUnavailable),
  }
}
```

- [ ] **Step 5: 통과 확인 (GREEN)**

Run: `npx vitest run entities/order/api/index.test.ts`
Expected: PASS, 그 파일의 다른 테스트(`'normalizes a null competition field to null'` 등)도 회귀 없이 통과.

- [ ] **Step 5-1: 필드 추가로 깨지는 기존 리터럴 목 보정**

`widgets/strategy-detail/StrategyDetail.test.tsx`는 `mockPreviewQuery`의 `data`를 `Partial<NextOrderPreview>`로 캐스팅해두고 있어, `competition` 필드를 채운 기존 목 리터럴 2곳이 `BuyCompetitionSummary`(이제 `liveBalanceUnavailable` 필수)와 구조적으로 검증된다. Step 3에서 타입에 필드를 추가하면 이 2곳이 `tsc` 오류를 낸다 — Task 4가 이 파일을 다시 손보기 전까지 빌드를 깨진 상태로 두지 않기 위해 여기서 최소 보정한다.

`'never renders the removed BuyCompetitionNotice component'` 테스트 (약 287-296행) 현재:
```ts
        competition: {
          sufficientBudget: false,
          availableDeposit: '1000',
          requiredForThisStrategy: '200',
          consumedByHigherPriority: '900',
          blockedByHigherPriority: [
            { strategyId: 'vr-1', type: 'VR', ticker: 'TQQQ', requiredBuyUsd: '900', priority: 0 },
          ],
          uncertainStrategyIds: [],
        },
```
변경 후:
```ts
        competition: {
          sufficientBudget: false,
          availableDeposit: '1000',
          requiredForThisStrategy: '200',
          consumedByHigherPriority: '900',
          blockedByHigherPriority: [
            { strategyId: 'vr-1', type: 'VR', ticker: 'TQQQ', requiredBuyUsd: '900', priority: 0 },
          ],
          uncertainStrategyIds: [],
          liveBalanceUnavailable: false,
        },
```

`'예수금 부족 배지에 부족 금액을 함께 보여준다'` 테스트 (약 355-362행) 현재:
```ts
        competition: {
          sufficientBudget: false,
          availableDeposit: '1000',
          requiredForThisStrategy: '200',
          consumedByHigherPriority: '900',
          blockedByHigherPriority: [],
          uncertainStrategyIds: [],
        },
```
변경 후:
```ts
        competition: {
          sufficientBudget: false,
          availableDeposit: '1000',
          requiredForThisStrategy: '200',
          consumedByHigherPriority: '900',
          blockedByHigherPriority: [],
          uncertainStrategyIds: [],
          liveBalanceUnavailable: false,
        },
```

- [ ] **Step 6: 타입 체크 + 전체 스위트 회귀 확인**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 오류 없음, 전체 스위트 회귀 없음(`StrategyDetail.test.tsx` 포함).

- [ ] **Step 7: Commit**

```bash
git add entities/order/model/types.ts entities/order/api/index.ts entities/order/api/index.test.ts widgets/strategy-detail/StrategyDetail.test.tsx
git commit -m "$(cat <<'EOF'
feat(order): BuyCompetitionSummary에 liveBalanceUnavailable 필드 매핑

API 응답엔 이미 있던 필드가 UI 타입/정규화에 누락돼 있었음 —
라이브 예수금 조회 실패 시 "충족됨"으로 오인할 수 있는 사각지대를
다음 태스크(computeBuyReadiness)가 참조할 수 있도록 선행 추가.
필드를 필수로 만들며 깨지는 기존 테스트 목 2곳도 함께 보정.
EOF
)"
```

---

### Task 2: 공용 판정 로직 `computeBuyReadiness` 신설

**Files:**
- Create: `entities/order/model/buy-readiness.ts`
- Create: `entities/order/model/buy-readiness.test.ts`
- Modify: `entities/order/index.ts`

**Interfaces:**
- Consumes: Task 1의 `NextOrderPreview`/`BuyCompetitionSummary` 타입 (`liveBalanceUnavailable` 포함)
- Produces: `computeBuyReadiness(preview: NextOrderPreview | undefined): BuyReadiness`, `interface BuyReadiness { hasBuyOrders: boolean; hasDeficit: boolean; buyUnplaced: boolean; sellUnplaced: boolean; liveBalanceUncertain: boolean; deficitUsd: number }` — Task 3(`StrategyCard`)·Task 4(`StrategyDetail`)가 이 시그니처로 호출한다.

- [ ] **Step 1: 실패하는 테스트 작성 (RED)**

Create `entities/order/model/buy-readiness.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { computeBuyReadiness } from './buy-readiness'
import type { NextOrderPreview } from './types'

function basePreview(overrides: Partial<NextOrderPreview>): NextOrderPreview {
  return {
    tradeDate: '2026-07-21',
    position: null,
    orders: [],
    skipReason: null,
    todayOrders: [],
    otherStrategiesPlannedBuyUsd: '0',
    competition: null,
    ...overrides,
  }
}

describe('computeBuyReadiness', () => {
  it('returns all-false defaults when preview is undefined', () => {
    const result = computeBuyReadiness(undefined)

    expect(result).toEqual({
      hasBuyOrders: false,
      hasDeficit: false,
      buyUnplaced: false,
      sellUnplaced: false,
      liveBalanceUncertain: false,
      deficitUsd: 0,
    })
  })

  it('does not mark buy as unplaced before any order has been attempted today', () => {
    const preview = basePreview({
      orders: [{ ticker: 'MAGX', orderType: 'LOC', direction: 'BUY', quantity: 1, price: '100' }],
      todayOrders: [],
      competition: {
        sufficientBudget: false, availableDeposit: '0', requiredForThisStrategy: '100',
        consumedByHigherPriority: '0', blockedByHigherPriority: [], uncertainStrategyIds: [],
        liveBalanceUnavailable: false,
      },
    })

    const result = computeBuyReadiness(preview)

    expect(result.hasBuyOrders).toBe(true)
    expect(result.hasDeficit).toBe(true)
    expect(result.buyUnplaced).toBe(false)
    expect(result.deficitUsd).toBe(100)
  })

  it('marks buy as unplaced when sell was placed but buy is still short on budget', () => {
    const preview = basePreview({
      orders: [
        { ticker: 'MAGX', orderType: 'LOC', direction: 'BUY', quantity: 1, price: '100' },
        { ticker: 'MAGX', orderType: 'LOC', direction: 'SELL', quantity: 1, price: '120' },
      ],
      todayOrders: [
        { id: 'o1', ticker: 'MAGX', direction: 'SELL', orderType: 'LOC', quantity: 1, price: '120', status: 'PLACED' },
      ],
      competition: {
        sufficientBudget: false, availableDeposit: '50', requiredForThisStrategy: '100',
        consumedByHigherPriority: '0', blockedByHigherPriority: [], uncertainStrategyIds: [],
        liveBalanceUnavailable: false,
      },
    })

    const result = computeBuyReadiness(preview)

    expect(result.buyUnplaced).toBe(true)
    expect(result.sellUnplaced).toBe(false)
    expect(result.hasDeficit).toBe(true)
    expect(result.deficitUsd).toBe(50)
  })

  it('clears the deficit once live budget becomes sufficient while buy is still unplaced', () => {
    const preview = basePreview({
      orders: [
        { ticker: 'MAGX', orderType: 'LOC', direction: 'BUY', quantity: 1, price: '100' },
        { ticker: 'MAGX', orderType: 'LOC', direction: 'SELL', quantity: 1, price: '120' },
      ],
      todayOrders: [
        { id: 'o1', ticker: 'MAGX', direction: 'SELL', orderType: 'LOC', quantity: 1, price: '120', status: 'PLACED' },
      ],
      competition: {
        sufficientBudget: true, availableDeposit: '500', requiredForThisStrategy: '100',
        consumedByHigherPriority: '0', blockedByHigherPriority: [], uncertainStrategyIds: [],
        liveBalanceUnavailable: false,
      },
    })

    const result = computeBuyReadiness(preview)

    expect(result.buyUnplaced).toBe(true)
    expect(result.hasDeficit).toBe(false)
    expect(result.liveBalanceUncertain).toBe(false)
  })

  it('flags live balance as uncertain instead of claiming the deficit is resolved', () => {
    const preview = basePreview({
      orders: [{ ticker: 'MAGX', orderType: 'LOC', direction: 'BUY', quantity: 1, price: '100' }],
      todayOrders: [
        { id: 'o1', ticker: 'MAGX', direction: 'SELL', orderType: 'LOC', quantity: 1, price: '120', status: 'PLACED' },
      ],
      competition: {
        sufficientBudget: true, availableDeposit: '0', requiredForThisStrategy: '100',
        consumedByHigherPriority: '0', blockedByHigherPriority: [], uncertainStrategyIds: [],
        liveBalanceUnavailable: true,
      },
    })

    const result = computeBuyReadiness(preview)

    expect(result.hasDeficit).toBe(false)
    expect(result.liveBalanceUncertain).toBe(true)
    expect(result.buyUnplaced).toBe(true)
  })

  it('marks both directions as not unplaced once both are placed', () => {
    const preview = basePreview({
      orders: [
        { ticker: 'MAGX', orderType: 'LOC', direction: 'BUY', quantity: 1, price: '100' },
        { ticker: 'MAGX', orderType: 'LOC', direction: 'SELL', quantity: 1, price: '120' },
      ],
      todayOrders: [
        { id: 'o1', ticker: 'MAGX', direction: 'BUY', orderType: 'LOC', quantity: 1, price: '100', status: 'PLACED' },
        { id: 'o2', ticker: 'MAGX', direction: 'SELL', orderType: 'LOC', quantity: 1, price: '120', status: 'PLACED' },
      ],
      competition: {
        sufficientBudget: true, availableDeposit: '500', requiredForThisStrategy: '100',
        consumedByHigherPriority: '0', blockedByHigherPriority: [], uncertainStrategyIds: [],
        liveBalanceUnavailable: false,
      },
    })

    const result = computeBuyReadiness(preview)

    expect(result.buyUnplaced).toBe(false)
    expect(result.sellUnplaced).toBe(false)
  })

  it('treats sell-unplaced independently of buy state', () => {
    const preview = basePreview({
      orders: [
        { ticker: 'MAGX', orderType: 'LOC', direction: 'BUY', quantity: 1, price: '100' },
        { ticker: 'MAGX', orderType: 'LOC', direction: 'SELL', quantity: 1, price: '120' },
      ],
      todayOrders: [
        { id: 'o1', ticker: 'MAGX', direction: 'BUY', orderType: 'LOC', quantity: 1, price: '100', status: 'PLACED' },
      ],
      competition: {
        sufficientBudget: true, availableDeposit: '500', requiredForThisStrategy: '100',
        consumedByHigherPriority: '0', blockedByHigherPriority: [], uncertainStrategyIds: [],
        liveBalanceUnavailable: false,
      },
    })

    const result = computeBuyReadiness(preview)

    expect(result.buyUnplaced).toBe(false)
    expect(result.sellUnplaced).toBe(true)
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run entities/order/model/buy-readiness.test.ts`
Expected: FAIL — `Cannot find module './buy-readiness'` (파일이 아직 없음).

- [ ] **Step 3: 구현**

Create `entities/order/model/buy-readiness.ts`:

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

// 카드/상세 두 위젯이 공유하는 순수 판정 로직 — "오늘 계획된 주문 중 실제 미접수 방향이 있는가"를
// plannedDirections(orders) vs placedDirections(todayOrders)로 판정한다
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
  // 우선순위 앞선 경쟁 전략 소요액 + 이 전략 필요액 - 가용예수금 = 부족액
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

- [ ] **Step 4: 통과 확인 (GREEN)**

Run: `npx vitest run entities/order/model/buy-readiness.test.ts`
Expected: PASS, 7개 테스트 모두 통과.

- [ ] **Step 5: barrel export 추가**

`entities/order/index.ts` 현재 1-10행:
```ts
export type {
  NextOrderPositionSnapshot,
  NextOrderItem,
  SkipReason,
  NextOrderPreview,
  PlacedOrder,
  StrategyOrder,
  BuyCompetitionSummary,
  CompetingStrategy,
} from './model/types'
```
변경 후 (타입 export 목록 아래에 신규 라인 추가):
```ts
export type {
  NextOrderPositionSnapshot,
  NextOrderItem,
  SkipReason,
  NextOrderPreview,
  PlacedOrder,
  StrategyOrder,
  BuyCompetitionSummary,
  CompetingStrategy,
} from './model/types'
export type { BuyReadiness } from './model/buy-readiness'
export { computeBuyReadiness } from './model/buy-readiness'
```

- [ ] **Step 6: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 오류 없음.

- [ ] **Step 7: Commit**

```bash
git add entities/order/model/buy-readiness.ts entities/order/model/buy-readiness.test.ts entities/order/index.ts
git commit -m "$(cat <<'EOF'
feat(order): 매수 미접수/예수금 부족 공용 판정 로직 computeBuyReadiness 추가

카드·상세 위젯이 각자 계산하던 hasDeficit 등을 순수 함수로 통합.
라이브 예수금 조회 실패(liveBalanceUnavailable) 시 "충족됨"으로
오인하지 않도록 별도 플래그로 노출.
EOF
)"
```

---

### Task 3: `StrategyCard.tsx` 색상 로직을 order 상태 기준으로 교체

**Files:**
- Modify: `widgets/strategy-card/StrategyCard.tsx`
- Modify: `widgets/strategy-card/StrategyCard.test.tsx`

**Interfaces:**
- Consumes: Task 2의 `computeBuyReadiness(preview): BuyReadiness` (`@entities/order`에서 import)

- [ ] **Step 1: 테스트를 새 판정 기준으로 교체 (RED)**

`widgets/strategy-card/StrategyCard.test.tsx` 전체를 아래로 교체:

```tsx
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Strategy } from '@entities/strategy'
import { StrategyCard } from './StrategyCard'

interface CompetitionMock {
  sufficientBudget: boolean
  availableDeposit?: string
  requiredForThisStrategy?: string
  consumedByHigherPriority?: string
  liveBalanceUnavailable?: boolean
}

let previewState = {
  data: {
    orders: [] as Array<{ direction: string; price: string; quantity: number }>,
    todayOrders: [] as Array<{ status: 'PLANNED' | 'PLACED'; direction: 'BUY' | 'SELL' }>,
    otherStrategiesPlannedBuyUsd: '0',
    competition: null as CompetitionMock | null,
  },
  isLoading: false,
}

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) => <a href={href} {...props}>{children}</a>,
}))

vi.mock('@entities/order', async () => {
  const actual = await vi.importActual<typeof import('@entities/order')>('@entities/order')
  return {
    ...actual,
    useStrategyOrderPreviewQuery: () => previewState,
  }
})

vi.mock('@entities/meta', () => ({
  useMeta: () => ({
    findStrategyType: (code: string) => {
      if (code === 'INFINITE') return { divisionCounts: [20, 30, 40] }
      return { divisionCounts: [] }
    },
    labelOf: (_group: string, value: string) => value,
  }),
}))

vi.mock('@entities/strategy', async () => {
  const actual = await vi.importActual<typeof import('@entities/strategy')>('@entities/strategy')
  return {
    ...actual,
    seedBadgeClass: () => 'seed-badge',
  }
})

const strategy: Strategy = {
  id: 'strategy-1',
  accountId: 'account-1',
  type: 'INFINITE',
  status: 'ACTIVE',
  ticker: 'MAGX',
  cycleSeedType: 'MAX',
  initialUsdDeposit: 2103,
  divisionCount: 20,
  isReverseMode: false,
  currentRound: 10.3,
}

describe('StrategyCard mobile row', () => {
  beforeEach(() => {
    previewState = {
      data: {
        orders: [],
        todayOrders: [],
        otherStrategiesPlannedBuyUsd: '0',
        competition: null,
      },
      isLoading: false,
    }
  })

  it('keeps the round label on a single line in the mobile row', () => {
    render(<StrategyCard accountId="account-1" strategy={strategy} />)

    const roundBadges = screen.getAllByText('10.3회차')

    expect(roundBadges[0]).toHaveClass('whitespace-nowrap')
    expect(roundBadges[0]).toHaveClass('shrink-0')
  })

  it('places only the seed badge in the mobile top row', () => {
    render(<StrategyCard accountId="account-1" strategy={strategy} />)

    const topRow = screen.getByTestId('strategy-card-mobile-top-row')
    const mainRow = screen.getByTestId('strategy-card-mobile-main-row')

    expect(topRow).toHaveTextContent('INFINITEMAX')
    expect(topRow).not.toHaveTextContent('20분할')
    expect(mainRow).not.toHaveTextContent('MAX')
    expect(mainRow).toHaveTextContent('20분할')
    expect(mainRow).toHaveTextContent('MAGX')
    expect(mainRow).toHaveTextContent('10.3회차')
    expect(screen.queryByRole('img', { name: 'ACTIVE' })).not.toBeInTheDocument()
  })

  it('shows VR marker without rendering division count', () => {
    render(<StrategyCard
      accountId="account-1"
      strategy={{
        ...strategy,
        type: 'VR',
        ticker: 'TQQQ',
        divisionCount: undefined,
        currentRound: undefined,
        vr: { value: 3000, bandWidth: 15, intervalWeeks: 4, recurringAmount: 0, poolLimit: 1000, gradient: 10 },
      }}
    />)

    expect(screen.getAllByText('VR')[0]).toBeInTheDocument()
    expect(screen.getAllByText('V $3,000.00')[0]).toBeInTheDocument()
    expect(screen.queryByText('undefined분할')).not.toBeInTheDocument()
    expect(screen.getByTestId('strategy-card-mobile-top-row')).not.toHaveTextContent('MAX')
  })

  it('hides next cycle row for VR cards', () => {
    render(<StrategyCard
      accountId="account-1"
      strategy={{
        ...strategy,
        type: 'VR',
        ticker: 'TQQQ',
        divisionCount: undefined,
        currentRound: undefined,
        vr: { value: 3000, bandWidth: 15, intervalWeeks: 4, recurringAmount: 0, poolLimit: 1000, gradient: 10 },
      }}
    />)

    expect(screen.queryByText('다음 사이클')).not.toBeInTheDocument()
  })

  it('marks borders green once every planned direction has been placed today', () => {
    previewState = {
      ...previewState,
      data: {
        ...previewState.data,
        orders: [{ direction: 'BUY', price: '1200', quantity: 1 }],
        todayOrders: [{ status: 'PLACED', direction: 'BUY' }],
        competition: { sufficientBudget: true },
      },
    }

    render(<StrategyCard accountId="account-1" strategy={strategy} />)

    expect(screen.getByTestId('strategy-order-border-accent')).toHaveAttribute('style', expect.stringContaining('border-color: var(--status-ok);'))
  })

  it('marks borders red when the budget is insufficient before any order has been attempted', () => {
    previewState = {
      ...previewState,
      data: {
        ...previewState.data,
        orders: [{ direction: 'BUY', price: '1200', quantity: 1 }],
        todayOrders: [],
        competition: { sufficientBudget: false },
      },
    }

    render(<StrategyCard accountId="account-1" strategy={strategy} />)

    expect(screen.getByTestId('strategy-order-border-accent')).toHaveAttribute('style', expect.stringContaining('border-color: var(--status-error);'))
  })

  it('marks borders red when sell placed but buy is unplaced and still short on budget', () => {
    previewState = {
      ...previewState,
      data: {
        ...previewState.data,
        orders: [
          { direction: 'BUY', price: '1200', quantity: 1 },
          { direction: 'SELL', price: '1300', quantity: 1 },
        ],
        todayOrders: [{ status: 'PLACED', direction: 'SELL' }],
        competition: { sufficientBudget: false },
      },
    }

    render(<StrategyCard accountId="account-1" strategy={strategy} />)

    expect(screen.getByTestId('strategy-order-border-accent')).toHaveAttribute('style', expect.stringContaining('border-color: var(--status-error);'))
  })

  it('marks borders yellow when sell placed, buy unplaced, but budget is now sufficient', () => {
    previewState = {
      ...previewState,
      data: {
        ...previewState.data,
        orders: [
          { direction: 'BUY', price: '1200', quantity: 1 },
          { direction: 'SELL', price: '1300', quantity: 1 },
        ],
        todayOrders: [{ status: 'PLACED', direction: 'SELL' }],
        competition: { sufficientBudget: true },
      },
    }

    render(<StrategyCard accountId="account-1" strategy={strategy} />)

    const borderAccent = screen.getByTestId('strategy-order-border-accent')
    expect(borderAccent).not.toHaveAttribute('style', expect.stringContaining('border-color: var(--status-ok);'))
    expect(borderAccent).toHaveAttribute('style', expect.stringContaining('border-color: var(--warn);'))
  })

  it('marks borders red when buy is unplaced and live balance could not be confirmed', () => {
    previewState = {
      ...previewState,
      data: {
        ...previewState.data,
        orders: [
          { direction: 'BUY', price: '1200', quantity: 1 },
          { direction: 'SELL', price: '1300', quantity: 1 },
        ],
        todayOrders: [{ status: 'PLACED', direction: 'SELL' }],
        competition: { sufficientBudget: true, liveBalanceUnavailable: true },
      },
    }

    render(<StrategyCard accountId="account-1" strategy={strategy} />)

    expect(screen.getByTestId('strategy-order-border-accent')).toHaveAttribute('style', expect.stringContaining('border-color: var(--status-error);'))
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run widgets/strategy-card/StrategyCard.test.tsx`
Expected: FAIL — 기존 `StrategyCard.tsx`는 여전히 `marketSession` 기준이라 새 시나리오(특히 노랑·post-attempt 빨강·uncertain 빨강)에서 기대와 다른 색상이 나옴.

- [ ] **Step 3: `StrategyCard.tsx` 색상 로직 교체**

`widgets/strategy-card/StrategyCard.tsx` import 현재(1-12행):
```tsx
import Link from 'next/link'
import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { fmtUsd } from '@shared/lib/format'
import { useMeta } from '@entities/meta'
import { useMarketSessionQuery } from '@entities/market'
import { useStrategyOrderPreviewQuery } from '@entities/order'
import { seedBadgeClass, strategyStatusAccent } from '@entities/strategy'
import type { Strategy } from '@entities/strategy'
import { Badge } from '@shared/ui/Badge'
```
변경 후:
```tsx
import Link from 'next/link'
import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { fmtUsd } from '@shared/lib/format'
import { useMeta } from '@entities/meta'
import { computeBuyReadiness, useStrategyOrderPreviewQuery } from '@entities/order'
import { seedBadgeClass, strategyStatusAccent } from '@entities/strategy'
import type { Strategy } from '@entities/strategy'
import { Badge } from '@shared/ui/Badge'
```

컴포넌트 본문 현재(21-40행):
```tsx
export function StrategyCard({ accountId, strategy, accountLabel }: Props) {
  const { findStrategyType, labelOf } = useMeta()
  const { data: preview } = useStrategyOrderPreviewQuery(strategy.id)
  const previewOrders = preview?.orders ?? []
  const hasBuyOrders = previewOrders.some((o) => o.direction === 'BUY')
  const { data: marketSession } = useMarketSessionQuery()
  const usesDivisionCount = (findStrategyType(strategy.type)?.divisionCounts?.length ?? 0) > 0
  const isVr = strategy.vr != null // VR 전략 여부 — vr 필드 존재 여부로 판정
  const seedLabel = labelOf('cycleSeedTypes', strategy.cycleSeedType)
  const seedBadgeCls = seedBadgeClass(strategy.cycleSeedType)
  const hasPlannedOrder = (preview?.todayOrders ?? []).some((o) => o.status === 'PLANNED')
  // 서버가 계좌 전체 우선순위 경쟁까지 반영해 계산한 예산 충분 여부 — 라이브 잔고 별도 조회 불필요
  const competition = preview?.competition ?? null
  const hasDeficit = hasBuyOrders && competition ? !competition.sufficientBudget : false
  // 부족 상태가 최우선 — SELL만 PLANNED로 성공해도 BUY가 부족하면 부족색을 표시한다
  const orderBorderColor = hasDeficit
    ? (marketSession?.session === 'DIRECT' ? 'var(--status-error)' : 'var(--warn)')
    : hasPlannedOrder
      ? 'var(--status-ok)'
      : null
```
변경 후:
```tsx
export function StrategyCard({ accountId, strategy, accountLabel }: Props) {
  const { findStrategyType, labelOf } = useMeta()
  const { data: preview } = useStrategyOrderPreviewQuery(strategy.id)
  const usesDivisionCount = (findStrategyType(strategy.type)?.divisionCounts?.length ?? 0) > 0
  const isVr = strategy.vr != null // VR 전략 여부 — vr 필드 존재 여부로 판정
  const seedLabel = labelOf('cycleSeedTypes', strategy.cycleSeedType)
  const seedBadgeCls = seedBadgeClass(strategy.cycleSeedType)
  // "오늘 계획된 주문 중 실제 미접수 방향이 있는가" 기준 — marketSession(장 시간대)이 아니라
  // 이 전략의 실제 주문 시도 결과로 판정한다 (SELL만 성공하고 BUY만 미접수인 상태를 구분하기 위함)
  const readiness = computeBuyReadiness(preview)
  const hasTodayOrders = (preview?.todayOrders ?? []).length > 0
  // 부족 최우선. 미접수인데 라이브 잔고 확인 자체가 실패했으면(liveBalanceUncertain) 충족으로
  // 오인시키지 않도록 부족과 동일하게 취급한다
  const orderBorderColor = readiness.hasDeficit || (readiness.buyUnplaced && readiness.liveBalanceUncertain)
    ? 'var(--status-error)'
    : readiness.buyUnplaced
      ? 'var(--warn)'
      : hasTodayOrders
        ? 'var(--status-ok)'
        : null
```

- [ ] **Step 4: 통과 확인 (GREEN)**

Run: `npx vitest run widgets/strategy-card/StrategyCard.test.tsx`
Expected: PASS, 9개 테스트 전부 통과.

- [ ] **Step 5: 타입 체크 + 전체 스위트 회귀 확인**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 오류 없음, 기존 다른 스위트에 회귀 없음.

- [ ] **Step 6: Commit**

```bash
git add widgets/strategy-card/StrategyCard.tsx widgets/strategy-card/StrategyCard.test.tsx
git commit -m "$(cat <<'EOF'
refactor(strategy): 카드 색상 판정을 marketSession에서 주문 접수 상태 기준으로 교체

marketSession(DIRECT/BLOCKED)은 "이 전략의 주문이 실제로 시도됐는지"를
모르는 전역 시계라 매도만 성공하고 매수만 미접수인 상태를 구분하지
못했음. computeBuyReadiness() 기반으로 교체해 빨강(부족)/노랑(미접수·
충족됨)/초록(전체 접수) 3단계를 정확히 표현한다.
EOF
)"
```

---

### Task 4: `StrategyDetail.tsx` executed 모드 예수금 부족 배지·문구 복원

**Files:**
- Modify: `widgets/strategy-detail/StrategyDetail.tsx`
- Modify: `widgets/strategy-detail/StrategyDetail.test.tsx`

**Interfaces:**
- Consumes: Task 2의 `computeBuyReadiness(preview): BuyReadiness` (`@entities/order`에서 import)

- [ ] **Step 1: `@entities/order` mock을 `computeBuyReadiness` 실구현이 살아남도록 보정**

**중요:** 이 파일의 기존 mock은 `@entities/order` 모듈 전체를 치환한다 — `vi.importActual` 없이 `useStrategyOrderPreviewQuery`/`useCancelAllOrdersMutation`/`useCancelOneOrderMutation`만 반환하므로, `StrategyDetail.tsx`가 새로 import할 `computeBuyReadiness`는 이 mock 아래에서 `undefined`가 된다. 실제 구현을 살리도록 `vi.importActual`로 감싼다.

현재(85-94행):
```tsx
vi.mock('@entities/order', () => ({
  useStrategyOrderPreviewQuery: () => mockPreviewQuery(),
  useCancelAllOrdersMutation: () => ({
    mutate: (_: undefined, opts?: { onSuccess?: (r: { cancelledCount: number; failedCount: number }) => void }) => {
      cancelAllSuccessHandler = opts?.onSuccess
    },
    isPending: false,
  }),
  useCancelOneOrderMutation: () => ({ mutate: vi.fn(), isPending: false, variables: null }),
}))
```
변경 후:
```tsx
vi.mock('@entities/order', async () => {
  const actual = await vi.importActual<typeof import('@entities/order')>('@entities/order')
  return {
    ...actual,
    useStrategyOrderPreviewQuery: () => mockPreviewQuery(),
    useCancelAllOrdersMutation: () => ({
      mutate: (_: undefined, opts?: { onSuccess?: (r: { cancelledCount: number; failedCount: number }) => void }) => {
        cancelAllSuccessHandler = opts?.onSuccess
      },
      isPending: false,
    }),
    useCancelOneOrderMutation: () => ({ mutate: vi.fn(), isPending: false, variables: null }),
  }
})
```

- [ ] **Step 2: 실패하는 테스트 추가 (RED)**

이 파일은 `previewState` 같은 가변 객체가 아니라 `mockPreviewQuery.mockReturnValueOnce({...})` 패턴을 쓴다(기존 `'shows a buy-unplaced banner...'` 등 참고). 새 `describe` 블록 하나를 파일 끝에 추가한다(기존 `'StrategyDetail budget deficit badge'` 블록 뒤):

```tsx
describe('StrategyDetail executed-mode deficit badge', () => {
  it('shows the deficit badge with the exact amount once the strategy is in executed mode', () => {
    mockPreviewQuery.mockReturnValueOnce({
      data: {
        todayOrders: [
          { id: 'o1', ticker: 'TSLA', direction: 'SELL', orderType: 'LIMIT', quantity: 1, price: '25.00', status: 'PLACED' },
        ],
        position: null,
        orders: [
          { ticker: 'TSLA', orderType: 'LOC', direction: 'BUY', quantity: 5, price: '20.00' },
          { ticker: 'TSLA', orderType: 'LIMIT', direction: 'SELL', quantity: 1, price: '25.00' },
        ],
        skipReason: null,
        otherStrategiesPlannedBuyUsd: '0',
        competition: {
          sufficientBudget: false,
          availableDeposit: '1000',
          requiredForThisStrategy: '200',
          consumedByHigherPriority: '900',
          blockedByHigherPriority: [],
          uncertainStrategyIds: [],
          liveBalanceUnavailable: false,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    // deficitUsd = max(0, 900 + 200 - 1000) = 100
    expect(screen.getByText('예수금 부족 ($100.00 부족)')).toBeInTheDocument()
    expect(screen.getByText('예수금 부족으로 매수 미접수')).toBeInTheDocument()
  })

  it('hides the deficit badge and rewords the notice once the deposit becomes sufficient', () => {
    mockPreviewQuery.mockReturnValueOnce({
      data: {
        todayOrders: [
          { id: 'o1', ticker: 'TSLA', direction: 'SELL', orderType: 'LIMIT', quantity: 1, price: '25.00', status: 'PLACED' },
        ],
        position: null,
        orders: [
          { ticker: 'TSLA', orderType: 'LOC', direction: 'BUY', quantity: 5, price: '20.00' },
          { ticker: 'TSLA', orderType: 'LIMIT', direction: 'SELL', quantity: 1, price: '25.00' },
        ],
        skipReason: null,
        otherStrategiesPlannedBuyUsd: '0',
        competition: {
          sufficientBudget: true,
          availableDeposit: '1000',
          requiredForThisStrategy: '100',
          consumedByHigherPriority: '0',
          blockedByHigherPriority: [],
          uncertainStrategyIds: [],
          liveBalanceUnavailable: false,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    expect(screen.queryByText(/예수금 부족 \(/)).not.toBeInTheDocument()
    expect(screen.getByText('예수금 충족됨 — 마감 시 매수 재시도 예정')).toBeInTheDocument()
  })

  it('shows an uncertain notice instead of claiming the deficit is resolved when live balance lookup failed', () => {
    mockPreviewQuery.mockReturnValueOnce({
      data: {
        todayOrders: [
          { id: 'o1', ticker: 'TSLA', direction: 'SELL', orderType: 'LIMIT', quantity: 1, price: '25.00', status: 'PLACED' },
        ],
        position: null,
        orders: [
          { ticker: 'TSLA', orderType: 'LOC', direction: 'BUY', quantity: 5, price: '20.00' },
          { ticker: 'TSLA', orderType: 'LIMIT', direction: 'SELL', quantity: 1, price: '25.00' },
        ],
        skipReason: null,
        otherStrategiesPlannedBuyUsd: '0',
        competition: {
          sufficientBudget: true,
          availableDeposit: '0',
          requiredForThisStrategy: '100',
          consumedByHigherPriority: '0',
          blockedByHigherPriority: [],
          uncertainStrategyIds: [],
          liveBalanceUnavailable: true,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    expect(screen.queryByText(/예수금 부족 \(/)).not.toBeInTheDocument()
    expect(screen.getByText('예수금 확인 실패로 매수 미접수 — 잠시 후 다시 확인해주세요')).toBeInTheDocument()
  })
})
```

**참고:** `baseStrategy`(`status: 'ACTIVE'`)를 그대로 쓰면 `canExecute`가 true가 되어 배지 표시 조건을 만족한다. 세 테스트 모두 `todayOrders`에 SELL만 `PLACED`로 넣어 executed 모드(`mode==='executed'`, 즉 `placedOrders.length>0`)를 만들고, `orders`(계획)엔 BUY·SELL 둘 다 있어 BUY가 `unplacedDirections`에 잡히게 한다.

- [ ] **Step 3: 실패 확인**

Run: `npx vitest run widgets/strategy-detail/StrategyDetail.test.tsx`
Expected: FAIL — 현재 `StrategyDetail.tsx`는 executed 모드에서 배지 블록 자체를 렌더링하지 않고, 미접수 문구도 분기가 없음.

- [ ] **Step 4: `StrategyDetail.tsx` 수정**

import에 `computeBuyReadiness` 추가 (기존 `useStrategyOrderPreviewQuery` import 줄):
```tsx
import { useStrategyOrderPreviewQuery, useCancelAllOrdersMutation, useCancelOneOrderMutation, computeBuyReadiness } from '@entities/order'
```

현재 `hasDeficit`/`previewDeficit`/`unplacedDirections` 계산부:
```tsx
  const placedOrders = preview?.todayOrders ?? []
  const mode: 'preview' | 'executed' = placedOrders.length > 0 ? 'executed' : 'preview'
  const position = preview?.position ?? null
  const orders = preview?.orders ?? []

  // 매수 주문이 있으면 서버 예산 경쟁 시뮬레이션 결과(competition)로 부족 여부 판정 — "바로 주문" 버튼 가드용
  const hasBuyOrders = orders.some((o) => o.direction === 'BUY')
  const competition = preview?.competition ?? null
  const hasDeficit = hasBuyOrders && competition ? !competition.sufficientBudget : false
  // 우선순위 앞선 경쟁 전략 소요액 + 이 전략 필요액 - 가용예수금 = 부족액
  const previewDeficit = competition
    ? Math.max(0, toNum(competition.consumedByHigherPriority) + toNum(competition.requiredForThisStrategy) - toNum(competition.availableDeposit))
    : 0

  // 계획(orders)엔 있는데 실제 접수(placedOrders)엔 없는 방향 — 예산 부족으로 거절된 방향
  // executed 모드에서만 의미 있음: preview 모드는 "아직 시도 안 함"과 "전량 거절"을 구분할 수 없다
  const plannedDirections = new Set(orders.map((o) => o.direction as 'BUY' | 'SELL'))
  const placedDirections = new Set(placedOrders.map((o) => o.direction))
  const unplacedDirections = mode === 'executed'
    ? [...plannedDirections].filter((d) => !placedDirections.has(d))
    : []
```
변경 후:
```tsx
  const placedOrders = preview?.todayOrders ?? []
  const mode: 'preview' | 'executed' = placedOrders.length > 0 ? 'executed' : 'preview'
  const position = preview?.position ?? null
  const orders = preview?.orders ?? []

  // 카드와 동일한 공용 판정 — "오늘 계획된 주문 중 실제 미접수 방향이 있는가" 기준
  const readiness = computeBuyReadiness(preview)
  const hasDeficit = readiness.hasDeficit
  const previewDeficit = readiness.deficitUsd

  // executed 모드에서만 의미 있음: preview 모드는 "아직 시도 안 함"과 "전량 거절"을 구분할 수 없다
  const unplacedDirections: Array<'BUY' | 'SELL'> = mode === 'executed'
    ? [...(readiness.buyUnplaced ? (['BUY'] as const) : []), ...(readiness.sellUnplaced ? (['SELL'] as const) : [])]
    : []
```

`toNum` import가 이 파일의 KPI 카드(`toNum(position.unitAmount)` 등)에서 계속 쓰이므로 import 문 자체는 유지한다.

미접수 문구 함수 추가 (컴포넌트 함수 위, `SKIP_REASON_LABELS` 근처):
```tsx
function buyUnplacedMessage(readiness: ReturnType<typeof computeBuyReadiness>): string {
  if (readiness.liveBalanceUncertain) return '예수금 확인 실패로 매수 미접수 — 잠시 후 다시 확인해주세요'
  if (readiness.hasDeficit) return '예수금 부족으로 매수 미접수'
  return '예수금 충족됨 — 마감 시 매수 재시도 예정'
}
```

미접수 안내 렌더 부분 현재:
```tsx
              {unplacedDirections.length > 0 && (
                <div className="flex flex-col gap-0.5 mt-1.5">
                  {unplacedDirections.map((d) => (
                    <p key={d} className="text-sm lg:text-base text-warn">
                      {d === 'BUY' ? '예수금 부족으로 매수 미접수' : '판매가능수량 부족으로 매도 미접수'}
                    </p>
                  ))}
                </div>
              )}
```
변경 후:
```tsx
              {unplacedDirections.length > 0 && (
                <div className="flex flex-col gap-0.5 mt-1.5">
                  {unplacedDirections.map((d) => (
                    <p key={d} className="text-sm lg:text-base text-warn">
                      {d === 'BUY' ? buyUnplacedMessage(readiness) : '판매가능수량 부족으로 매도 미접수'}
                    </p>
                  ))}
                </div>
              )}
```

배지 렌더 부분 현재 (`{canExecute && mode === 'preview' && (...)}` 블록 직후):
```tsx
            {canExecute && mode === 'preview' && (
              <div className="flex items-center gap-2">
                {(isHoliday || hasDeficit) && (
                  <Badge tone="warn" size="sm">
                    {isHoliday ? '휴장일' : `예수금 부족 ($${fmtUsd(previewDeficit)} 부족)`}
                  </Badge>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (isHoliday) {
                      toast.info('오늘은 미국 증시 휴장일입니다')
                      return
                    }
                    if (hasDeficit) {
                      toast.info('예수금이 부족합니다')
                      return
                    }
                    executeMutation.mutate()
                  }}
                  disabled={executeMutation.isPending || orders.length === 0}
                  className={cn(
                    'inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md',
                    'bg-gradient-to-br from-rose-500 to-rose-700 text-white font-semibold',
                    'shadow-[0_1px_4px_rgba(225,29,72,0.30)] hover:opacity-90 transition-opacity disabled:opacity-50',
                  )}
                >
                  {executeMutation.isPending ? '주문 중...' : '바로 주문'}
                </button>
              </div>
            )}
```
변경 후 (기존 블록은 그대로 두고 executed 모드 배지를 바로 뒤에 추가):
```tsx
            {canExecute && mode === 'preview' && (
              <div className="flex items-center gap-2">
                {(isHoliday || hasDeficit) && (
                  <Badge tone="warn" size="sm">
                    {isHoliday ? '휴장일' : `예수금 부족 ($${fmtUsd(previewDeficit)} 부족)`}
                  </Badge>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (isHoliday) {
                      toast.info('오늘은 미국 증시 휴장일입니다')
                      return
                    }
                    if (hasDeficit) {
                      toast.info('예수금이 부족합니다')
                      return
                    }
                    executeMutation.mutate()
                  }}
                  disabled={executeMutation.isPending || orders.length === 0}
                  className={cn(
                    'inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md',
                    'bg-gradient-to-br from-rose-500 to-rose-700 text-white font-semibold',
                    'shadow-[0_1px_4px_rgba(225,29,72,0.30)] hover:opacity-90 transition-opacity disabled:opacity-50',
                  )}
                >
                  {executeMutation.isPending ? '주문 중...' : '바로 주문'}
                </button>
              </div>
            )}
            {canExecute && mode === 'executed' && hasDeficit && (
              <Badge tone="warn" size="sm">{`예수금 부족 ($${fmtUsd(previewDeficit)} 부족)`}</Badge>
            )}
```

- [ ] **Step 5: 통과 확인 (GREEN)**

Run: `npx vitest run widgets/strategy-detail/StrategyDetail.test.tsx`
Expected: PASS — 신규 3개 테스트 포함 전체 통과, 기존 preview 모드 배지/버튼 테스트도 회귀 없음.

- [ ] **Step 6: 타입 체크 + 전체 스위트 회귀 확인**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 오류 없음, 회귀 없음.

- [ ] **Step 7: Commit**

```bash
git add widgets/strategy-detail/StrategyDetail.tsx widgets/strategy-detail/StrategyDetail.test.tsx
git commit -m "$(cat <<'EOF'
feat(strategy): executed 모드에서도 예수금 부족 금액·해소 상태 표시

장 개시 후 매도만 접수되고 매수가 미접수인 상태에서 부족 금액이
전혀 안 보이고, 예수금을 채워도 문구가 안 바뀌던 문제를 해결.
computeBuyReadiness()가 매 preview 재조회마다 라이브 예수금을
반영하므로 배지는 충족 시 자동으로 사라지고 문구도 전환된다.
EOF
)"
```

## Self-Review

- 스펙 커버리지: 스펙의 4개 변경 지점(UI 타입 필드 추가, 공용 판정 로직, 카드 색상 교체, 상세 배지·문구)이 Task 1~4로 1:1 매핑됨. API 변경 없음도 스펙과 일치(어떤 태스크도 kista-api를 건드리지 않음).
  - Task 4에서 `previewDeficit` 사용, `toNum` import 유지 등 KPI 카드가 여전히 `toNum`을 쓰는지는 구현자가 실제 파일에서 최종 확인 필요(파일 컨텍스트상 유지되는 것으로 보임) — Step 3 설명에 명시함.
- 플레이스홀더 없음 — 모든 Step에 실제 코드·명령어·정확한 before/after 포함.
- 타입 일관성: `BuyReadiness`(Task 2 정의) 필드명이 Task 3(`readiness.hasDeficit`, `readiness.buyUnplaced`, `readiness.liveBalanceUncertain`)·Task 4(`readiness.hasDeficit`, `readiness.deficitUsd`, `readiness.buyUnplaced`, `readiness.sellUnplaced`, `readiness.liveBalanceUncertain`)에서 동일하게 사용됨. `computeBuyReadiness` 시그니처(`preview: NextOrderPreview | undefined`)도 두 위젯 모두 `preview`(옵셔널, 로딩 중 undefined 가능)를 그대로 전달하는 것과 일치.
- Task 간 순서 의존성: Task 1(타입) → Task 2(로직, 타입 참조) → Task 3/Task 4(로직 소비) 순서가 실제 컴파일 의존성과 일치. Task 3·Task 4는 서로 독립적이나 순차 실행 원칙(서브에이전트 병렬 금지)에 따라 순서대로 진행.
