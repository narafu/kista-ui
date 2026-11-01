# 바로주문/미리보기 정리 (UI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "바로주문/미리보기" 영역에서 실제로 남아있던 문제 세 가지를 고친다 — 카드 목록의 반복 재조회 비용을 캐싱으로 완화하고(정확도·안전장치는 그대로), `manualOrders` 섀도우 상태(무효화 누락이 eslint-disable로 억제된 흔적)를 서버 상태 단일 소스로 정리하고, 오늘 오전 컴포넌트 제거의 부작용으로 사라진 예수금 부족액 표시를 복원한다.

**Architecture:** `entities/order/hooks/useOrderQueries.ts`의 `useStrategyOrderPreviewQuery`에 `staleTime` 추가 → `StrategyCard.tsx`/`StrategyDetail.tsx` 양쪽에 자동 적용. `entities/strategy/hooks/useStrategyQueries.ts`의 `useExecuteStrategyMutation`이 `order-preview` 쿼리를 무효화하도록 수정 → `widgets/strategy-detail/StrategyDetail.tsx`가 로컬 `manualOrders` state 없이 `preview.todayOrders` 하나로 `mode`/`placedOrders`를 파생. `StrategyCard.tsx`는 이번 작업에서 무변경.

**Tech Stack:** Next.js App Router, React, TanStack Query, Vitest + Testing Library.

## Global Constraints

- Task 1은 `staleTime` 추가라는 설정값 변경뿐이라 동작(데이터 자체)은 안 바뀐다 — 새 쿼리 옵션이 실제로 전달되는지만 검증한다.
- Task 3(`manualOrders` 제거)도 토스트 메시지 등 사용자에게 보이는 동작 자체는 바뀌지 않는다(로컬 즉시 갱신 → 서버 재조회 갱신으로 내부 구현만 바뀜) — 이 태스크의 테스트는 "리팩터 전에도 이미 통과하는" 회귀 방지 테스트로, 리팩터 후에도 계속 통과해야 한다.
- 커밋 메시지는 한글, `refactor:`/`fix:` 접두사(사용자에게 보이는 버그 수정이면 `fix:`, 아니면 `refactor:`).
- 각 태스크 후 `npx vitest run <해당 경로>`로 국소 확인, 마지막 태스크 후 `npx tsc --noEmit` + `npx vitest run` 전체 실행.

---

### Task 1: `useStrategyOrderPreviewQuery`에 `staleTime` 추가

**Files:**
- Modify: `entities/order/hooks/useOrderQueries.ts`
- Create: `entities/order/hooks/useOrderQueries.test.tsx`

**Interfaces:**
- 변경 없음 — `useStrategyOrderPreviewQuery(strategyId: string)` 시그니처·반환 타입(`NextOrderPreview`) 그대로.

- [ ] **Step 1: 실패하는 테스트 작성**

`entities/order/hooks/useOrderQueries.test.tsx` 신규 작성:

```tsx
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useStrategyOrderPreviewQuery } from './useOrderQueries'

const { useQueryMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}))

vi.mock('../api', () => ({
  getStrategyOrdersPreview: vi.fn(),
  cancelAllOrders: vi.fn(),
  cancelOneOrder: vi.fn(),
  listStrategyOrders: vi.fn(),
}))

describe('useStrategyOrderPreviewQuery', () => {
  it('카드 목록 재진입 시 재사용할 수 있도록 staleTime을 부여한다', () => {
    useQueryMock.mockReturnValue({ data: undefined })

    renderHook(() => useStrategyOrderPreviewQuery('strategy-1'))

    expect(useQueryMock.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({
      queryKey: ['order-preview', 'strategy', 'strategy-1'],
      staleTime: 60_000,
    }))
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run entities/order/hooks/useOrderQueries.test.tsx`
Expected: FAIL — `staleTime: undefined`가 `staleTime: 60000`과 불일치 (현재 훅에 `staleTime` 옵션이 없으므로)

- [ ] **Step 3: 최소 구현**

`entities/order/hooks/useOrderQueries.ts` 현재:
```ts
export function useStrategyOrderPreviewQuery(strategyId: string) {
  return useQuery<NextOrderPreview>({
    queryKey: ['order-preview', 'strategy', strategyId],
    queryFn: () => getStrategyOrdersPreview(strategyId),
    retry: false,
  })
}
```

변경 후:
```ts
export function useStrategyOrderPreviewQuery(strategyId: string) {
  return useQuery<NextOrderPreview>({
    queryKey: ['order-preview', 'strategy', strategyId],
    queryFn: () => getStrategyOrdersPreview(strategyId),
    retry: false,
    staleTime: 60_000, // 카드 목록 재진입 시 캐시 재사용 — "바로 주문"/취소는 invalidateQueries로 별도 강제 갱신되므로 신선도에 영향 없음
  })
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run entities/order/hooks/useOrderQueries.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add entities/order/hooks/useOrderQueries.ts entities/order/hooks/useOrderQueries.test.tsx
git commit -m "$(cat <<'EOF'
perf(order): 주문 미리보기 쿼리에 staleTime 부여

전략 카드 N개가 목록 페이지 진입마다 각각 무거운 예산 경쟁
시뮬레이션(TradingBuyCompetitionSimulator)을 재조회하던 비용을
1분 캐싱으로 완화. 카드의 예산부족 배지·안전장치(2026-07-18)는
데이터·계산 로직 무변경으로 그대로 유지.
EOF
)"
```

---

### Task 2: `useExecuteStrategyMutation`이 `order-preview`를 무효화하도록 수정

**Files:**
- Modify: `entities/strategy/hooks/useStrategyQueries.ts`
- Modify: `entities/strategy/hooks/useStrategyQueries.test.tsx`

**Interfaces:**
- 변경 없음 — `useExecuteStrategyMutation(strategyId: string | undefined)` 시그니처 그대로. `mutate()` 호출부의 성공 콜백에서 로컬 데이터를 받아쓰던 소비자(Task 3에서 손볼 `StrategyDetail.tsx`)는 이제 재조회된 서버 상태를 봐야 한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`entities/strategy/hooks/useStrategyQueries.test.tsx`의 `useUpdateStrategyMutation` describe 블록(83-95행) 바로 아래에 추가. 먼저 5행의 import에 `useExecuteStrategyMutation` 추가:

```ts
// BEFORE
import { useAllStrategiesQuery, useStrategiesQuery, useUpdateStrategyMutation } from './useStrategyQueries'

// AFTER
import { useAllStrategiesQuery, useStrategiesQuery, useUpdateStrategyMutation, useExecuteStrategyMutation } from './useStrategyQueries'
```

새 describe 블록 추가:

```ts
describe('useExecuteStrategyMutation', () => {
  it('실행 성공 시 실제 주문 미리보기 쿼리(order-preview)를 무효화한다', () => {
    const invalidateQueries = vi.fn()
    vi.mocked(useQueryClient).mockReturnValue({ invalidateQueries } as never)
    vi.mocked(useMutation).mockReturnValue({} as never)

    renderHook(() => useExecuteStrategyMutation('strategy-1'))

    const options = vi.mocked(useMutation).mock.calls.at(-1)?.[0] as unknown as { onSuccess: () => void }
    options.onSuccess()

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['order-preview', 'strategy', 'strategy-1'] })
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run entities/strategy/hooks/useStrategyQueries.test.tsx -t "실행 성공 시"`
Expected: FAIL — `invalidateQueries`가 호출되지 않음 (현재 `useExecuteStrategyMutation`의 `onSuccess`는 `toast.success`만 호출)

- [ ] **Step 3: 최소 구현**

`entities/strategy/hooks/useStrategyQueries.ts` 현재(127-141행):
```ts
export function useExecuteStrategyMutation(strategyId: string | undefined) {
  return useMutation({ // eslint-disable-line react-doctor/query-mutation-missing-invalidation
    mutationFn: () => executeStrategy(strategyId!),
    onSuccess: () => toast.success('매매 실행이 요청됐습니다. 장 마감 후 체결 결과를 확인하세요.'),
    onError: (e) => {
      if (e instanceof ApiError) {
        if (e.status === 409) toast.error(apiMsg(e, '오늘 이미 실행됐습니다.'))
        else if (e.status === 403) toast.error(apiMsg(e, '권한이 없습니다.'))
        else toast.error(apiMsg(e, '실행 중 오류가 발생했습니다.'))
      } else {
        toast.error('실행 중 오류가 발생했습니다.')
      }
    },
  })
}
```

변경 후:
```ts
export function useExecuteStrategyMutation(strategyId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => executeStrategy(strategyId!),
    onSuccess: () => {
      toast.success('매매 실행이 요청됐습니다. 장 마감 후 체결 결과를 확인하세요.')
      queryClient.invalidateQueries({ queryKey: ['order-preview', 'strategy', strategyId] })
    },
    onError: (e) => {
      if (e instanceof ApiError) {
        if (e.status === 409) toast.error(apiMsg(e, '오늘 이미 실행됐습니다.'))
        else if (e.status === 403) toast.error(apiMsg(e, '권한이 없습니다.'))
        else toast.error(apiMsg(e, '실행 중 오류가 발생했습니다.'))
      } else {
        toast.error('실행 중 오류가 발생했습니다.')
      }
    },
  })
}
```

`eslint-disable-line react-doctor/query-mutation-missing-invalidation` 주석은 이제 실제로 무효화하므로 제거한다 — 이 주석이 억제하고 있던 린터 경고가 애초에 정확한 지적이었다.

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run entities/strategy/hooks/useStrategyQueries.test.tsx`
Expected: PASS (전체 — 기존 테스트 포함 회귀 없음)

- [ ] **Step 5: Commit**

```bash
git add entities/strategy/hooks/useStrategyQueries.ts entities/strategy/hooks/useStrategyQueries.test.tsx
git commit -m "$(cat <<'EOF'
fix(strategy): 바로 주문 실행 성공 시 주문 미리보기 쿼리 무효화

eslint-disable로 억제돼 있던 무효화 누락을 수정 — git log 확인 결과
2026-06-27 false positive 일괄 정리 커밋에서 실수로 억제된 것으로,
의도된 설계가 아니었다. StrategyDetail.tsx의 manualOrders 섀도우
상태 제거(다음 커밋)의 전제 조건.
EOF
)"
```

---

### Task 3: `StrategyDetail.tsx`의 `manualOrders` 섀도우 상태 제거

**Files:**
- Modify: `widgets/strategy-detail/StrategyDetail.tsx`
- Modify: `widgets/strategy-detail/StrategyDetail.test.tsx`

**Interfaces:**
- `mode`/`placedOrders`는 이제 `preview?.todayOrders`(서버) 단일 소스에서만 파생 — Task 2에서 무효화가 걸렸으므로 "바로 주문"/"전체 취소" 성공 후 재조회된 값이 곧 화면에 반영된다.

- [ ] **Step 1: 실패하는(사실은 리팩터 전에도 통과해야 하는) 회귀 테스트 작성**

이 태스크는 사용자에게 보이는 동작(토스트 메시지)을 바꾸지 않는 리팩터라, 아래 테스트는 **리팩터 전 코드에서도 이미 통과한다** — 이후 `manualOrders` 제거 과정에서 토스트 분기를 실수로 건드리지 않았는지 지키는 회귀 방지선이다.

`widgets/strategy-detail/StrategyDetail.test.tsx` 최상단 import에 `fireEvent`, `toast` 추가:

```tsx
// BEFORE
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Strategy } from '@entities/strategy'
import type { NextOrderPreview } from '@entities/order'
import { StrategyDetail } from './StrategyDetail'

// AFTER
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import type { Strategy } from '@entities/strategy'
import type { NextOrderPreview } from '@entities/order'
import { StrategyDetail } from './StrategyDetail'
```

`@entities/order` mock 블록(82-86행)에서 `useCancelAllOrdersMutation`이 전달받은 `onSuccess` 콜백을 캡처하도록 수정:

```tsx
// BEFORE
vi.mock('@entities/order', () => ({
  useStrategyOrderPreviewQuery: () => mockPreviewQuery(),
  useCancelAllOrdersMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useCancelOneOrderMutation: () => ({ mutate: vi.fn(), isPending: false, variables: null }),
}))

// AFTER
let cancelAllSuccessHandler: ((r: { cancelledCount: number; failedCount: number }) => void) | undefined

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

파일 맨 아래에 새 describe 블록 추가:

```tsx
describe('StrategyDetail cancel-all toast', () => {
  it('전체 취소 성공 시 로컬 상태 없이도 성공 토스트를 보여준다', () => {
    mockPreviewQuery.mockReturnValueOnce({
      data: {
        todayOrders: [
          { id: 'o1', ticker: 'TSLA', direction: 'BUY', orderType: 'LOC', quantity: 5, price: '20.00', status: 'PLANNED' },
        ],
        position: null,
        orders: [],
        skipReason: null,
        otherStrategiesPlannedBuyUsd: '0',
        competition: null,
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)
    fireEvent.click(screen.getByText('전체 취소'))
    cancelAllSuccessHandler?.({ cancelledCount: 1, failedCount: 0 })

    expect(vi.mocked(toast.success)).toHaveBeenCalledWith('1건 모두 취소됐습니다.')
  })
})
```

- [ ] **Step 2: 테스트 통과 확인 (리팩터 전)**

Run: `npx vitest run widgets/strategy-detail/StrategyDetail.test.tsx -t "전체 취소 성공"`
Expected: PASS — 아직 `manualOrders`를 제거하지 않았으므로 기존 로직 그대로 통과해야 한다. FAIL이면 mock 캡처 방식이 실제 컴포넌트의 `cancelAllMutation.mutate` 호출 시그니처와 안 맞는 것이므로 먼저 원인을 고친다.

- [ ] **Step 3: `manualOrders` 제거**

`widgets/strategy-detail/StrategyDetail.tsx` 32행:
```ts
// BEFORE
import type { SkipReason, PlacedOrder } from '@entities/order'

// AFTER
import type { SkipReason } from '@entities/order'
```

57-67행:
```ts
// BEFORE
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [manualOrders, setManualOrders] = useState<PlacedOrder[] | null>(null)

  const { data: preview, isLoading: isLoadingPreview, isError: isPreviewError, error: previewError } = useStrategyOrderPreviewQuery(strategy.id)

  const serverOrders = preview?.todayOrders ?? []
  const hasServerOrders = serverOrders.length > 0
  const placedOrders = manualOrders ?? (hasServerOrders ? serverOrders : [])
  const mode: 'preview' | 'executed' = manualOrders !== null || hasServerOrders ? 'executed' : 'preview'
  const position = preview?.position ?? null
  const orders = preview?.orders ?? []

// AFTER
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data: preview, isLoading: isLoadingPreview, isError: isPreviewError, error: previewError } = useStrategyOrderPreviewQuery(strategy.id)

  const placedOrders = preview?.todayOrders ?? []
  const mode: 'preview' | 'executed' = placedOrders.length > 0 ? 'executed' : 'preview'
  const position = preview?.position ?? null
  const orders = preview?.orders ?? []
```

107-114행(`handleCancelOne`):
```ts
// BEFORE
  function handleCancelOne(id: string) {
    cancelOneMutation.mutate(id, {
      onSuccess: () => {
        const remaining = placedOrders.filter((x) => x.id !== id)
        setManualOrders(remaining.length === 0 ? null : remaining)
      },
    })
  }

// AFTER
  function handleCancelOne(id: string) {
    cancelOneMutation.mutate(id)
  }
```

259-263행("바로 주문" 클릭 핸들러 내부):
```ts
// BEFORE
                    executeMutation.mutate(undefined, {
                      onSuccess: (placed) => {
                        setManualOrders(placed)
                      },
                    })

// AFTER
                    executeMutation.mutate()
```

285-296행("전체 취소" 클릭 핸들러):
```ts
// BEFORE
                    cancelAllMutation.mutate(undefined, {
                      onSuccess: (r) => {
                        if (r.failedCount === 0) {
                          toast.success(`${r.cancelledCount}건 모두 취소됐습니다.`)
                          setManualOrders(null)
                        } else {
                          toast.warning(`${r.cancelledCount}건 취소, ${r.failedCount}건 실패 — KIS에서 직접 확인하세요.`)
                        }
                      },
                    })

// AFTER
                    cancelAllMutation.mutate(undefined, {
                      onSuccess: (r) => {
                        if (r.failedCount === 0) {
                          toast.success(`${r.cancelledCount}건 모두 취소됐습니다.`)
                        } else {
                          toast.warning(`${r.cancelledCount}건 취소, ${r.failedCount}건 실패 — KIS에서 직접 확인하세요.`)
                        }
                      },
                    })
```

- [ ] **Step 4: 전체 테스트 통과 확인 (리팩터 후)**

Run: `npx vitest run widgets/strategy-detail/StrategyDetail.test.tsx`
Expected: PASS — Step 1의 신규 테스트 포함, 기존 `unplaced order banner` 4건·`header card` 5건 전부 회귀 없이 통과.

- [ ] **Step 5: 타입 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음 — `PlacedOrder` import 제거로 인한 미사용 타입 참조가 없는지 확인.

- [ ] **Step 6: Commit**

```bash
git add widgets/strategy-detail/StrategyDetail.tsx widgets/strategy-detail/StrategyDetail.test.tsx
git commit -m "$(cat <<'EOF'
refactor(strategy-detail): manualOrders 섀도우 상태 제거

바로 주문/취소 성공 시 로컬 state 대신 서버 order-preview
재조회(직전 커밋의 무효화)로 mode/placedOrders를 단일 소스에서
파생하도록 정리. 사용자에게 보이는 토스트 동작은 무변경.
EOF
)"
```

---

### Task 4: 예수금 부족액 표시 복원

**Files:**
- Modify: `widgets/strategy-detail/StrategyDetail.tsx`
- Modify: `widgets/strategy-detail/StrategyDetail.test.tsx`

**Interfaces:**
- 신규 파생값 `previewDeficit: number` — `competition`이 있을 때만 0 이상의 값, 없으면 0.

- [ ] **Step 1: 실패하는 테스트 작성**

`widgets/strategy-detail/StrategyDetail.test.tsx` 상단 import에 `vi`가 이미 있으므로 `beforeEach`/`afterEach` 추가:

```tsx
// BEFORE
import { describe, expect, it, vi } from 'vitest'

// AFTER
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
```

파일 맨 아래에 새 describe 블록 추가 — `isWeekend` 판정이 실제 시스템 시각을 쓰므로(`StrategyDetail.tsx` 내부 `new Date()`), 실행 요일에 따라 "휴장일" 배지로 덮이지 않도록 평일로 시간을 고정한다:

```tsx
describe('StrategyDetail budget deficit badge', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-21T10:00:00+09:00')) // 화요일 — 휴장일 배지에 가려지지 않도록 평일 고정
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('예수금 부족 배지에 부족 금액을 함께 보여준다', () => {
    mockPreviewQuery.mockReturnValueOnce({
      data: {
        todayOrders: [],
        position: null,
        orders: [{ ticker: 'TSLA', orderType: 'LOC', direction: 'BUY', quantity: 5, price: '20.00' }],
        skipReason: null,
        otherStrategiesPlannedBuyUsd: '0',
        competition: {
          sufficientBudget: false,
          availableDeposit: '1000',
          requiredForThisStrategy: '200',
          consumedByHigherPriority: '900',
          blockedByHigherPriority: [],
          uncertainStrategyIds: [],
        },
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    // previewDeficit = max(0, 900 + 200 - 1000) = 100
    expect(screen.getByText('예수금 부족 ($100.00 부족)')).toBeInTheDocument()
  })
})
```

`fmtUsd`의 소수점 자릿수 표기(`$100.00` 형태)는 `shared/lib/format`의 기존 동작을 그대로 따른다 — 이 파일 다른 테스트의 `$3,000.00` 표기(168-195행 `VR summary` 테스트)와 동일한 포맷.

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run widgets/strategy-detail/StrategyDetail.test.tsx -t "부족 금액"`
Expected: FAIL — 현재는 `'예수금 부족'`만 렌더링되고 금액이 없어 `getByText('예수금 부족 ($100.00 부족)')`가 매치 실패.

- [ ] **Step 3: 최소 구현**

`hasDeficit` 파생(현재 71-72행 부근) 바로 아래에 추가:

```ts
// BEFORE
  const competition = preview?.competition ?? null
  const hasDeficit = hasBuyOrders && competition ? !competition.sufficientBudget : false

// AFTER
  const competition = preview?.competition ?? null
  const hasDeficit = hasBuyOrders && competition ? !competition.sufficientBudget : false
  // 우선순위 앞선 경쟁 전략 소요액 + 이 전략 필요액 - 가용예수금 = 부족액
  const previewDeficit = competition
    ? Math.max(0, toNum(competition.consumedByHigherPriority) + toNum(competition.requiredForThisStrategy) - toNum(competition.availableDeposit))
    : 0
```

배지 렌더링부(현재 245-247행 부근):
```jsx
// BEFORE
                {(isHoliday || hasDeficit) && (
                  <Badge tone="warn" size="sm">{isHoliday ? '휴장일' : '예수금 부족'}</Badge>
                )}

// AFTER
                {(isHoliday || hasDeficit) && (
                  <Badge tone="warn" size="sm">
                    {isHoliday ? '휴장일' : `예수금 부족 ($${fmtUsd(previewDeficit)} 부족)`}
                  </Badge>
                )}
```

`fmtUsd`는 이미 `shared/lib/format`에서 import돼 있음(27행) — 추가 import 불필요.

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run widgets/strategy-detail/StrategyDetail.test.tsx`
Expected: PASS — 전체(신규 포함) 회귀 없이 통과. 특히 `unplaced order banner` describe의 `'never renders the removed BuyCompetitionNotice component'` 테스트(구 문구 `/부족 \(우선순위 전략/` 부재 검증)가 새 배지 문구(`예수금 부족 ($100 부족)`, "우선순위 전략" 텍스트 없음)와 계속 호환되는지 확인.

- [ ] **Step 5: 최종 확인**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 타입 에러 없음, 전체 스위트 통과.

- [ ] **Step 6: Commit**

```bash
git add widgets/strategy-detail/StrategyDetail.tsx widgets/strategy-detail/StrategyDetail.test.tsx
git commit -m "$(cat <<'EOF'
fix(strategy-detail): 예수금 부족 배지에 부족 금액 복원

오늘 오전 BuyCompetitionNotice 컴포넌트를 제거하면서(order-rejection-banner
작업) 그 컴포넌트만 쓰던 deficitUsd 계산을 죽은 코드로 판단해 함께
지웠는데, 실제로는 유일한 소비처가 사라진 부작용이었을 뿐 표시
자체는 계속 필요했다. 계산식은 그대로 복원하고 별도 컴포넌트
없이 배지 문구에만 인라인으로 반영.
EOF
)"
```

## Self-Review

- 스펙 커버리지: UI 스펙의 세 항목(staleTime, manualOrders 제거, previewDeficit 복원) 모두 Task 1/2+3/4로 매핑됨. `StrategyCard.tsx` 무변경은 스펙과 일치(별도 태스크 없음, 자연스러운 스펙 커버리지).
- 플레이스홀더 없음 — 모든 Step에 실제 코드·정확한 현재 라인 범위·명령어 포함.
- 타입 일관성: `previewDeficit: number`는 `toNum(...)` 결과(number) 기반, `fmtUsd(number)` 시그니처와 일치(기존 `fmtUsd(toNum(position.unitAmount))` 등 파일 내 다른 사용처와 동일 패턴).
- Task 순서 의존성: Task 3(`manualOrders` 제거)은 Task 2(무효화 추가)가 선행돼야 실행 후 화면이 최신 상태를 반영한다 — 순서대로 실행 필수. Task 1·4는 나머지와 독립적이라 순서 무관하지만 문서 순서를 따른다.
