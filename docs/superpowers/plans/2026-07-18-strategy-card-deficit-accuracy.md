# 전략 목록 카드 예수금 부족 표시 정확도 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `widgets/strategy-card/StrategyCard.tsx`의 부족 판정을 서버 `NextOrdersResponse.competition` 값으로 교체하고, SELL만 성공해도 무조건 초록으로 표시되던 테두리 색 우선순위 버그를 수정한다.

**Architecture:** 단일 컴포넌트(`StrategyCard.tsx`) + 그 테스트 파일만 수정. kista-api 변경 없음(`competition` 필드는 이미 존재). `StrategyCard`는 `AllStrategiesList.tsx`/`StrategyList.tsx` 2곳에서 재사용되므로 이 파일 하나 수정으로 두 화면 모두 반영된다.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS, React Query, Vitest + @testing-library/react.

## Global Constraints

- 설계 스펙: `docs/superpowers/specs/2026-07-18-strategy-card-deficit-accuracy-design.md` (승인 완료) — 세부 규칙 SSOT.
- 범위: `widgets/strategy-card/StrategyCard.tsx` + `widgets/strategy-card/StrategyCard.test.tsx`만. 다른 파일 수정 금지.
- kista-api 변경 없음 — `NextOrdersResponse.competition`은 이미 존재하는 필드를 소비만 한다.
- 싱글 쿼트, 세미콜론 없음, import 중괄호 공백 유지, 인라인 `style` 금지(기존 파일의 CSS 변수 style 속성은 예외로 유지 — 이미 존재하는 패턴).
- `any` 금지.
- 서버 상태를 `useState`에 복사하지 않음(이 컴포넌트는 애초에 로컬 state가 없음, 해당 없음).
- 기본 검증: `npm run typecheck`. `npm run test:run -- widgets/strategy-card`.
- 커밋 메시지 한글, author `narafu <narafu@kakao.com>`.

---

### Task 1: `hasDeficit` 계산 교체 + 테두리 우선순위 수정

**Files:**
- Modify: `widgets/strategy-card/StrategyCard.tsx`
- Modify: `widgets/strategy-card/StrategyCard.test.tsx`

**Interfaces:**
- Consumes: `NextOrderPreview.competition: BuyCompetitionSummary | null`(이미 `entities/order`에 존재, 2026-07-18 세션 앞부분에 구현됨) — `@entities/order`의 `useStrategyOrderPreviewQuery`가 반환하는 `preview.competition` 필드.

- [ ] **Step 1: 테스트 파일에 실패하는 회귀 테스트 작성 + 기존 테스트 갱신**

`widgets/strategy-card/StrategyCard.test.tsx`에서 `previewState` 타입에 `competition` 필드 추가:

```ts
// BEFORE (6~13행)
let previewState = {
  data: {
    orders: [] as Array<{ direction: string; price: string; quantity: number }>,
    todayOrders: [] as Array<{ status: 'PLANNED' | 'PLACED' }>,
    otherStrategiesPlannedBuyUsd: '0',
  },
  isLoading: false,
}
```

```ts
// AFTER
let previewState = {
  data: {
    orders: [] as Array<{ direction: string; price: string; quantity: number }>,
    todayOrders: [] as Array<{ status: 'PLANNED' | 'PLACED' }>,
    otherStrategiesPlannedBuyUsd: '0',
    competition: null as { sufficientBudget: boolean } | null,
  },
  isLoading: false,
}
```

`@entities/account` mock 블록 삭제(15~18행의 `marginState` 변수 선언, 32~34행의 `vi.mock('@entities/account', ...)` 블록 전체 — 컴포넌트가 더 이상 이 모듈을 import하지 않게 될 것이므로):

```ts
// 삭제 (15~18행)
let marginState = {
  items: [{ currency: 'USD', purchasableAmount: 1000 }],
  isLoading: false,
}
```

```ts
// 삭제 (32~34행)
vi.mock('@entities/account', () => ({
  useAccountMarginQuery: () => marginState,
}))
```

`beforeEach` 블록에서 `marginState` 리셋 제거, `previewState` 리셋에 `competition: null` 추가:

```ts
// BEFORE (72~88행)
beforeEach(() => {
  previewState = {
    data: {
      orders: [],
      todayOrders: [],
      otherStrategiesPlannedBuyUsd: '0',
    },
    isLoading: false,
  }
  marginState = {
    items: [{ currency: 'USD', purchasableAmount: 1000 }],
    isLoading: false,
  }
  marketSessionState = {
    data: { session: 'BLOCKED' },
  }
})
```

```ts
// AFTER
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
  marketSessionState = {
    data: { session: 'BLOCKED' },
  }
})
```

기존 "주황 테두리" 테스트(177~189행)에 `competition` 추가:

```ts
// BEFORE
it('marks top, right, and bottom borders orange before market open when cash is insufficient', () => {
  previewState = {
    ...previewState,
    data: {
      ...previewState.data,
      orders: [{ direction: 'BUY', price: '1200', quantity: 1 }],
    },
  }

  render(<StrategyCard accountId="account-1" strategy={strategy} />)

  expect(screen.getByTestId('strategy-order-border-accent')).toHaveAttribute('style', expect.stringContaining('border-color: var(--warn);'))
})
```

```ts
// AFTER
it('marks top, right, and bottom borders orange before market open when cash is insufficient', () => {
  previewState = {
    ...previewState,
    data: {
      ...previewState.data,
      orders: [{ direction: 'BUY', price: '1200', quantity: 1 }],
      competition: { sufficientBudget: false },
    },
  }

  render(<StrategyCard accountId="account-1" strategy={strategy} />)

  expect(screen.getByTestId('strategy-order-border-accent')).toHaveAttribute('style', expect.stringContaining('border-color: var(--warn);'))
})
```

기존 "빨강 테두리" 테스트(191~206행)에 동일하게 `competition` 추가:

```ts
// BEFORE
it('marks top, right, and bottom borders red after market open when cash is insufficient', () => {
  previewState = {
    ...previewState,
    data: {
      ...previewState.data,
      orders: [{ direction: 'BUY', price: '1200', quantity: 1 }],
    },
  }
  marketSessionState = {
    data: { session: 'DIRECT' },
  }

  render(<StrategyCard accountId="account-1" strategy={strategy} />)

  expect(screen.getByTestId('strategy-order-border-accent')).toHaveAttribute('style', expect.stringContaining('border-color: var(--status-error);'))
})
```

```ts
// AFTER
it('marks top, right, and bottom borders red after market open when cash is insufficient', () => {
  previewState = {
    ...previewState,
    data: {
      ...previewState.data,
      orders: [{ direction: 'BUY', price: '1200', quantity: 1 }],
      competition: { sufficientBudget: false },
    },
  }
  marketSessionState = {
    data: { session: 'DIRECT' },
  }

  render(<StrategyCard accountId="account-1" strategy={strategy} />)

  expect(screen.getByTestId('strategy-order-border-accent')).toHaveAttribute('style', expect.stringContaining('border-color: var(--status-error);'))
})
```

파일 마지막(206행 `})` 앞, 기존 "빨강 테두리" 테스트 뒤)에 신규 회귀 테스트 추가 — 이번 작업의 핵심 목적:

```ts
it('shows a deficit color instead of green when a sell order is planned but the buy is still short on budget', () => {
  previewState = {
    ...previewState,
    data: {
      ...previewState.data,
      todayOrders: [{ status: 'PLANNED' }],
      orders: [{ direction: 'BUY', price: '1200', quantity: 1 }],
      competition: { sufficientBudget: false },
    },
  }

  render(<StrategyCard accountId="account-1" strategy={strategy} />)

  const borderAccent = screen.getByTestId('strategy-order-border-accent')
  expect(borderAccent).not.toHaveAttribute('style', expect.stringContaining('border-color: var(--status-ok);'))
  expect(borderAccent).toHaveAttribute('style', expect.stringContaining('border-color: var(--warn);'))
})
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm run test:run -- widgets/strategy-card`
Expected: FAIL — 신규 테스트는 컴포넌트가 아직 `hasPlannedOrder`를 `hasDeficit`보다 먼저 평가하므로 초록으로 렌더링되어 실패. 기존 주황/빨강 테스트도 컴포넌트가 아직 `competition`을 읽지 않고 `marginItems`(이제 mock 없음 → `useAccountMarginQuery` 호출 자체가 undefined 참조 에러 또는 기본값)에 의존하므로 실패하거나 에러.

- [ ] **Step 3: `StrategyCard.tsx` 계산 로직 교체**

`import { useAccountMarginQuery } from '@entities/account'` 줄을 삭제한다. `import { toNum } from '@shared/lib/utils'`도 이 파일에서 `hasDeficit` 계산 제거 후 다른 용도로 쓰이지 않으면 함께 삭제한다(`grep -n "toNum" widgets/strategy-card/StrategyCard.tsx`로 이 계산 블록 외 사용처가 없는지 먼저 확인).

```ts
// BEFORE
export function StrategyCard({ accountId, strategy, accountLabel }: Props) {
  const { findStrategyType, labelOf } = useMeta()
  const { data: preview, isLoading: isLoadingPreview } = useStrategyOrderPreviewQuery(strategy.id)
  const previewOrders = preview?.orders ?? []
  const hasBuyOrders = previewOrders.some((o) => o.direction === 'BUY')
  const { items: marginItems, isLoading: isMarginLoading } = useAccountMarginQuery(accountId, {
    enabled: !isLoadingPreview && hasBuyOrders,
  })
  const { data: marketSession } = useMarketSessionQuery()
  const usesDivisionCount = (findStrategyType(strategy.type)?.divisionCounts?.length ?? 0) > 0
  const isVr = strategy.vr != null // VR 전략 여부 — vr 필드 존재 여부로 판정
  const seedLabel = labelOf('cycleSeedTypes', strategy.cycleSeedType)
  const seedBadgeCls = seedBadgeClass(strategy.cycleSeedType)
  const hasPlannedOrder = (preview?.todayOrders ?? []).some((o) => o.status === 'PLANNED')
  const totalBuyUsd = hasBuyOrders && !isMarginLoading
    ? previewOrders
      .filter((o) => o.direction === 'BUY')
      .reduce((sum, o) => sum + toNum(o.price) * o.quantity, 0)
    : 0
  const purchasableUsd = marginItems.find((i) => i.currency === 'USD')?.purchasableAmount ?? 0
  const otherPlannedUsd = toNum(preview?.otherStrategiesPlannedBuyUsd ?? '0')
  const hasDeficit = hasBuyOrders && !isLoadingPreview && !isMarginLoading && totalBuyUsd + otherPlannedUsd > purchasableUsd
  const orderBorderColor = hasPlannedOrder
    ? 'var(--status-ok)'
    : hasDeficit
      ? marketSession?.session === 'DIRECT' ? 'var(--status-error)' : 'var(--warn)'
      : null
```

```ts
// AFTER
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

`accountId` prop은 `Link href`(`/accounts/${accountId}/strategies/${strategy.id}`)에서 계속 쓰이므로 `Props` 인터페이스는 변경하지 않는다.

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npm run test:run -- widgets/strategy-card`
Expected: PASS (기존 8건 유지 + 신규 1건 = 9건 모두 통과)

- [ ] **Step 5: 타입 검사**

Run: `npm run typecheck`
Expected: 에러 없음. `useAccountMarginQuery`/`toNum`/`marginItems`/`isMarginLoading`/`totalBuyUsd`/`purchasableUsd`/`otherPlannedUsd`/`isLoadingPreview` 전부 파일에서 제거됐어야 함.

- [ ] **Step 6: 커밋**

```bash
git add widgets/strategy-card/StrategyCard.tsx widgets/strategy-card/StrategyCard.test.tsx
git commit -m "$(cat <<'EOF'
fix: 전략 목록 카드 예수금 부족 표시를 서버 competition 값으로 교체

useAccountMarginQuery 기반 구식 계산 제거, competition.sufficientBudget
소비로 교체. 테두리 우선순위도 수정 — SELL만 PLANNED로 성공해도
BUY가 예산 부족이면 무조건 초록으로 보이던 버그 해소
EOF
)"
```

---

### Task 2: 전체 검증

**Files:** 없음 (검증 전용)

**Interfaces:** 없음

- [ ] **Step 1: 타입 검사**

Run: `npm run typecheck`
Expected: 에러 없음.

- [ ] **Step 2: 전체 테스트 스위트**

Run: `npm run test:run`
Expected: 전체 PASS, 실패 없음. `AllStrategiesList.test.tsx`는 `StrategyCard`를 mock 처리하므로 영향 없어야 한다.

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공.

이 태스크는 검증 전용 — 코드 변경 없으므로 커밋 없음. 실패 시 Task 1로 돌아가 수정.

## Self-Review 결과

- **스펙 커버리지**: 설계 문서의 계산 로직 교체(1절), 우선순위 수정(2절), 테스트 갱신(3절)이 Task 1의 Step 1·3에 정확히 매핑됨. 신규 회귀 테스트도 스펙의 "핵심 목적" 문구 그대로 반영.
- **플레이스홀더 스캔**: 전 스텝에 실제 코드 포함. "TBD" 없음.
- **타입 일관성**: `competition: { sufficientBudget: boolean } | null` 목업 타입이 실제 `BuyCompetitionSummary`의 부분집합이며, 컴포넌트는 `sufficientBudget` 필드만 읽으므로 목업 단순화가 타당함(다른 필드는 이 컴포넌트가 소비하지 않음 — `BuyCompetitionNotice`처럼 확장 목록을 보여주지 않는 카드이므로).
- **범위 확인**: kista-api 변경 없음, 단일 컴포넌트 + 테스트 파일만 수정 — 계획 크기에 맞게 단일 작업으로 구성(Task 1). 검증은 별도 Task 2로 분리해 스펙의 "테스트" 섹션 요구사항을 명시적으로 완결.
