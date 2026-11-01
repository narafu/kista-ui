# Strategy Order History Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 전략 상세 주문 내역에 방향, 유형, 상태를 AND 조건으로 조합하는 반응형 드롭다운 필터를 추가한다.

**Architecture:** `StrategyOrderHistory`가 조회 결과와 필터 상태, 필터 후 페이지네이션을 소유한다. 새 `OrderHistoryFilters`는 고정 선택지와 반응형 Select 마크업만 담당하며 서버 API와 React Query 키는 변경하지 않는다.

**Tech Stack:** React 19, TypeScript, Next.js, TanStack Query, Base UI 기반 shadcn Select, Tailwind CSS, Vitest, Testing Library

## Global Constraints

- 방향, 유형, 상태의 초기값은 모두 `전체`다.
- 여러 필터는 AND 조건으로 적용한다.
- 필터는 기간 조회 결과에 먼저 적용하고 그 결과를 페이지네이션한다.
- 필터 변경 시 페이지를 1페이지로 초기화한다.
- PC에서는 세 드롭다운을 한 행에, 모바일에서는 동일 너비 3열로 표시하고 가로 스크롤을 만들지 않는다.
- 원본 주문 없음과 필터 결과 없음의 문구를 구분한다.
- 기존 주문 조회 API, React Query 키, 기간 필터 동작은 변경하지 않는다.
- 기존 작업 트리의 사용자 변경은 수정하거나 커밋하지 않는다.

---

### Task 1: 주문 내역 필터 동작과 반응형 컨트롤

**Files:**
- Create: `widgets/strategy-detail/OrderHistoryFilters.tsx`
- Create: `widgets/strategy-detail/StrategyOrderHistory.test.tsx`
- Modify: `widgets/strategy-detail/StrategyOrderHistory.tsx`

**Interfaces:**
- Consumes: `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` from `@/components/ui/select`
- Produces: `OrderHistoryFilterValue = 'ALL' | string`
- Produces: `OrderHistoryFilters({ direction, orderType, status, onDirectionChange, onOrderTypeChange, onStatusChange })`
- Produces: 필터 결과를 먼저 계산한 뒤 페이지 크기로 자르는 `StrategyOrderHistory` 렌더링 동작

- [ ] **Step 1: 테스트가 변경에 민감한 이유를 명시한다**

`StrategyOrderHistory.test.tsx` 상단 테스트 데이터는 매수/매도, LIMIT/LOC/MOC, PLANNED/PLACED/FILLED/FAILED가 서로 겹치도록 구성한다. 프로덕션 코드에서 특정 필터 조건 하나를 제거하면 해당 조건 테스트 또는 AND 조합 테스트가 실패해야 한다.

- [ ] **Step 2: 기본값과 개별 필터의 실패 테스트를 작성한다**

`useStrategyOrdersQuery`를 mock해 다음 주문을 반환하고, `userEvent`로 실제 Select를 조작한다.

```tsx
const ORDERS: StrategyOrder[] = [
  { id: '1', tradeDate: '2026-07-29', direction: 'BUY', orderType: 'LIMIT', quantity: 1, price: '100', status: 'PLANNED', filledQuantity: null, filledPrice: null },
  { id: '2', tradeDate: '2026-07-29', direction: 'SELL', orderType: 'LOC', quantity: 2, price: '110', status: 'PLACED', filledQuantity: null, filledPrice: null },
  { id: '3', tradeDate: '2026-07-28', direction: 'BUY', orderType: 'MOC', quantity: 3, price: '120', status: 'FILLED', filledQuantity: 3, filledPrice: '119' },
  { id: '4', tradeDate: '2026-07-28', direction: 'SELL', orderType: 'LIMIT', quantity: 4, price: '130', status: 'FAILED', filledQuantity: null, filledPrice: null },
]

it('전체 선택 시 모든 주문을 표시하고 방향 필터를 적용한다', async () => {
  render(<StrategyOrderHistory strategyId="strategy-1" />)

  expect(screen.getByText('$100.00')).toBeInTheDocument()
  expect(screen.getByText('$110.00')).toBeInTheDocument()

  await selectOption('방향', '매수')

  expect(screen.getByText('$100.00')).toBeInTheDocument()
  expect(screen.queryByText('$110.00')).not.toBeInTheDocument()
})

it.each([
  ['유형', 'LOC', '$110.00', '$100.00'],
  ['상태', '체결', '$120.00', '$110.00'],
] as const)('%s 필터를 적용한다', async (label, option, visible, hidden) => {
  render(<StrategyOrderHistory strategyId="strategy-1" />)
  await selectOption(label, option)
  expect(screen.getByText(visible)).toBeInTheDocument()
  expect(screen.queryByText(hidden)).not.toBeInTheDocument()
})
```

- [ ] **Step 3: 테스트를 실행해 필터 UI 부재로 실패하는지 확인한다**

Run: `npm test -- widgets/strategy-detail/StrategyOrderHistory.test.tsx`

Expected: FAIL. `방향`, `유형`, `상태` Select를 찾지 못해야 한다. import 또는 mock 설정 오류로 실패하면 테스트 환경을 먼저 바로잡고 같은 기능 부재 실패를 다시 확인한다.

- [ ] **Step 4: 반응형 필터 컨트롤을 최소 구현한다**

`OrderHistoryFilters.tsx`에 고정 선택지와 접근성 이름을 가진 Select 세 개를 작성한다.

```tsx
export const ALL_FILTER_VALUE = 'ALL'

interface Props {
  direction: string
  orderType: string
  status: string
  onDirectionChange: (value: string) => void
  onOrderTypeChange: (value: string) => void
  onStatusChange: (value: string) => void
}

export function OrderHistoryFilters(props: Props) {
  return (
    <div className="grid grid-cols-3 gap-2 lg:flex lg:items-center">
      <Select value={props.direction} onValueChange={(value) => value && props.onDirectionChange(value)}>
        <SelectTrigger aria-label="방향" className="w-full lg:w-28"><SelectValue /></SelectTrigger>
        <SelectContent>{/* 전체, 매수, 매도 */}</SelectContent>
      </Select>
      <Select value={props.orderType} onValueChange={(value) => value && props.onOrderTypeChange(value)}>
        <SelectTrigger aria-label="유형" className="w-full lg:w-28"><SelectValue /></SelectTrigger>
        <SelectContent>{/* 전체, LIMIT, LOC, MOC */}</SelectContent>
      </Select>
      <Select value={props.status} onValueChange={(value) => value && props.onStatusChange(value)}>
        <SelectTrigger aria-label="상태" className="w-full lg:w-32"><SelectValue /></SelectTrigger>
        <SelectContent>{/* 전체, 예정, 접수, 체결, 부분체결, 취소, 실패 */}</SelectContent>
      </Select>
    </div>
  )
}
```

`StrategyOrderHistory.tsx`에서 세 상태를 `ALL_FILTER_VALUE`로 초기화하고 `RangeFilterControls` 아래에 `OrderHistoryFilters`를 렌더링한다. `orders.filter`에서 각 값이 `ALL`이거나 주문 필드와 같은지 확인한 후 `filteredOrders`를 페이지네이션한다.

- [ ] **Step 5: 개별 필터 테스트가 통과하는지 확인한다**

Run: `npm test -- widgets/strategy-detail/StrategyOrderHistory.test.tsx`

Expected: PASS.

- [ ] **Step 6: AND 조합과 필터 결과 빈 상태의 실패 테스트를 작성한다**

```tsx
it('방향, 유형, 상태 필터를 AND 조건으로 결합한다', async () => {
  render(<StrategyOrderHistory strategyId="strategy-1" />)
  await selectOption('방향', '매도')
  await selectOption('유형', 'LOC')
  await selectOption('상태', '접수')
  expect(screen.getByText('$110.00')).toBeInTheDocument()
  expect(screen.queryByText('$130.00')).not.toBeInTheDocument()
})

it('원본 주문은 있지만 필터 결과가 없으면 전용 빈 상태를 표시한다', async () => {
  render(<StrategyOrderHistory strategyId="strategy-1" />)
  await selectOption('방향', '매수')
  await selectOption('유형', 'LOC')
  expect(screen.getByText('조건에 맞는 주문이 없습니다.')).toBeInTheDocument()
  expect(screen.queryByText('주문 내역이 없습니다.')).not.toBeInTheDocument()
})
```

- [ ] **Step 7: 테스트를 실행해 빈 상태 분기 부재로 실패하는지 확인한다**

Run: `npm test -- widgets/strategy-detail/StrategyOrderHistory.test.tsx`

Expected: FAIL. AND 결과가 0건일 때 테이블 또는 빈 컨테이너만 남고 `조건에 맞는 주문이 없습니다.`가 없어야 한다.

- [ ] **Step 8: 필터 결과 빈 상태를 최소 구현한다**

원본 `orders.length === 0` 분기는 기존 문구를 유지한다. 그 다음 분기에 `filteredOrders.length === 0`을 추가해 `EmptyState variant="text" message="조건에 맞는 주문이 없습니다."`를 렌더링한다.

- [ ] **Step 9: AND 조합과 빈 상태 테스트가 통과하는지 확인한다**

Run: `npm test -- widgets/strategy-detail/StrategyOrderHistory.test.tsx`

Expected: PASS.

- [ ] **Step 10: 필터 변경 시 페이지 초기화 실패 테스트를 작성한다**

테스트 데이터 11건과 기본 페이지 크기 10을 사용한다. 2페이지로 이동한 뒤 방향 필터를 바꾸고 페이지 1의 주문이 표시되는지 확인한다.

```tsx
it('필터 변경 시 첫 페이지로 돌아간다', async () => {
  mockOrders(makeElevenOrders())
  render(<StrategyOrderHistory strategyId="strategy-1" />)
  await user.click(screen.getByRole('button', { name: '2' }))
  expect(screen.getByText('$111.00')).toBeInTheDocument()

  await selectOption('방향', '매수')

  expect(screen.getByText('$101.00')).toBeInTheDocument()
  expect(screen.queryByText('$111.00')).not.toBeInTheDocument()
})
```

- [ ] **Step 11: 테스트를 실행해 현재 페이지 유지로 실패하는지 확인한다**

Run: `npm test -- widgets/strategy-detail/StrategyOrderHistory.test.tsx`

Expected: FAIL. 필터 변경 후에도 2페이지 상태가 남아 첫 페이지 주문을 찾지 못해야 한다.

- [ ] **Step 12: 필터 변경 시 페이지 초기화를 최소 구현한다**

기존 페이지 초기화 effect 의존성에 `directionFilter`, `orderTypeFilter`, `statusFilter`를 추가한다.

```tsx
useEffect(() => setPage(1), [rangeType, customFrom, customTo, pageSize, directionFilter, orderTypeFilter, statusFilter])
```

- [ ] **Step 13: 관련 테스트와 타입 검사를 실행한다**

Run: `npm test -- widgets/strategy-detail/StrategyOrderHistory.test.tsx widgets/strategy-detail/StrategyDetail.test.tsx`

Expected: PASS with no warnings.

Run: `npm run typecheck`

Expected: exit code 0.

- [ ] **Step 14: 변경 내용을 커밋한다**

```bash
git add widgets/strategy-detail/OrderHistoryFilters.tsx widgets/strategy-detail/StrategyOrderHistory.tsx widgets/strategy-detail/StrategyOrderHistory.test.tsx
git commit -m "feat: 전략 주문 내역 필터 추가"
```

커밋 훅이 문서 동기화를 요구하면 `doc-sync` 에이전트를 실행하고 생성된 문서 커밋을 확인한다.

---

### Task 2: 실제 화면 반응형 검증

**Files:**
- Modify only if verification reveals a defect: `widgets/strategy-detail/OrderHistoryFilters.tsx`
- Modify only if verification reveals a defect: `widgets/strategy-detail/StrategyOrderHistory.tsx`

**Interfaces:**
- Consumes: Task 1의 `OrderHistoryFilters`와 전략 상세 라우트
- Produces: 375px 모바일과 1280px PC에서 가로 넘침 없이 사용할 수 있는 필터 UI

- [ ] **Step 1: 로컬 앱을 실행한다**

Run: `npm run dev`

Expected: 전략 상세 페이지를 열 수 있는 로컬 URL이 출력된다.

- [ ] **Step 2: 모바일 화면을 검증한다**

Playwright로 375px 너비에서 전략 상세 주문 내역을 연다. 세 Select가 한 행 3열로 보이고, 트리거 텍스트가 잘리지 않아 현재 선택을 구분할 수 있으며, 주문 내역 카드에 수평 페이지 넘침이 없는지 확인한다. 각 필터를 선택해 결과와 빈 상태 문구가 즉시 바뀌는지 확인한다.

- [ ] **Step 3: PC 화면을 검증한다**

Playwright로 1280px 너비에서 같은 화면을 연다. 세 Select가 기간 필터 아래 한 행에 왼쪽 정렬되고 테이블 헤더와 시각적으로 충돌하지 않는지 확인한다. 키보드 Tab으로 각 Select에 접근할 때 포커스 링이 보이는지 확인한다.

- [ ] **Step 4: 시각적 결함이 있으면 최소 스타일 수정 후 재검증한다**

트리거 폭, gap, 텍스트 잘림, 카드 넘침 중 확인된 문제만 Tailwind class로 수정한다. 동작 로직이나 전역 토큰은 변경하지 않는다.

- [ ] **Step 5: 최종 검증을 실행한다**

Run: `npm test -- widgets/strategy-detail/StrategyOrderHistory.test.tsx widgets/strategy-detail/StrategyDetail.test.tsx`

Expected: PASS.

Run: `npm run typecheck`

Expected: exit code 0.

Run: `git diff --check`

Expected: no output and exit code 0.

- [ ] **Step 6: 검증 중 코드 수정이 있었다면 커밋한다**

```bash
git add widgets/strategy-detail/OrderHistoryFilters.tsx widgets/strategy-detail/StrategyOrderHistory.tsx
git commit -m "fix: 주문 내역 필터 반응형 UI 보완"
```
