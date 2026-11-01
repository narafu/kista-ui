# Admin Trade Correction UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `/admin/trades` so an admin can inspect strategy orders, toggle strategy status, and execute `PLANNED_EDIT`, `PLACED_REPLACE`, and `FILLED_CORRECTION` without leaving the page.

**Architecture:** Keep `app/(admin)/admin/trades/page.tsx` as the server entrypoint for initial trade loading, then hand off to a focused client widget that owns selection state and the correction workbench. Add missing admin API functions and types in `entities/user`, keep table rendering separate from correction state, and drive the status-specific form from the selected order payload.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest, Testing Library

## Global Constraints

- Keep the existing `/admin/trades` route and preserve the current date-range/page-size filtering UX.
- Use the existing `app/api/admin/[[...path]]/route.ts` catch-all proxy; do not add a new admin route handler.
- Show the correction workbench on the same page, below the trade table.
- Support the selection chain `사용자 -> 계좌 -> 전략 -> 거래일 -> 주문`.
- Expose strategy status toggle `ACTIVE <-> PAUSED` separately from order correction submission.
- Render status-specific order correction forms for `PLANNED`, `PLACED`, `FILLED`, and `PARTIALLY_FILLED`.
- Treat `FAILED` and `CANCELLED` as read-only in the UI.
- Re-fetch related order data after successful strategy status changes or order corrections.
- Follow TDD: every production change starts with a failing test.

---

### Task 1: Add Admin Trade Correction Types and API Functions

**Files:**
- Modify: `entities/user/model/types.ts`
- Modify: `entities/user/api/index.ts`
- Modify: `entities/user/index.ts`
- Test: `entities/user/api/index.test.ts`

**Interfaces:**
- Consumes: `apiFetch`, `clientFetch`, `jsonBody` from `@shared/lib/api-client`
- Produces:
  - `interface AdminStrategy { id: string; accountId: string; type: string; status: 'ACTIVE' | 'PAUSED'; ticker: string }`
  - `interface AdminStrategyOrder { id: string; userId?: string; ownerNickname?: string; strategyType?: string; tradeDate: string; ticker: string; direction: string; orderType: string; timing: string; quantity: number; price: number; status: string; externalOrderId?: string | null; filledQuantity?: number | null; filledPrice?: number | null }`
  - `interface AdminOrderCorrectionRequest { userId: string; accountId: string; strategyId: string; orderId: string; mode: 'PLANNED_EDIT' | 'PLACED_REPLACE' | 'FILLED_CORRECTION'; tradeDateKst: string; direction?: 'BUY' | 'SELL'; quantity?: number; price?: number; memo?: string }`
  - `interface AdminOrderCorrectionResponse { userId: string; accountId: string; strategyId: string; orderId: string; mode: string; originalStatus: string; resultingStatus: string; replacementExternalOrderId?: string | null; finalHoldings: number; finalAvgPrice?: number | null; finalUsdDeposit?: number | null; strategyStatus: 'ACTIVE' | 'PAUSED'; cycleEnded: boolean; cycleEndDate?: string | null }`
  - `listAdminStrategies(token: string, accountId: string): Promise<AdminStrategy[]>`
  - `listAdminStrategyOrders(token: string, accountId: string, strategyId: string, tradeDate: string): Promise<AdminStrategyOrder[]>`
  - `updateAdminStrategyStatus(accountId: string, strategyId: string, status: 'ACTIVE' | 'PAUSED'): Promise<void>`
  - `correctAdminOrder(request: AdminOrderCorrectionRequest): Promise<AdminOrderCorrectionResponse>`

- [ ] **Step 1: Write the failing API tests**

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { clientFetch, apiFetch } from '@shared/lib/api-client'
import {
  listAdminStrategies,
  listAdminStrategyOrders,
  updateAdminStrategyStatus,
  correctAdminOrder,
} from './index'

vi.mock('@shared/lib/api-client', () => ({
  apiFetch: vi.fn(),
  clientFetch: vi.fn(),
  jsonBody: (method: string, body: unknown) => ({ method, body }),
}))

describe('admin trade correction api', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset()
    vi.mocked(clientFetch).mockReset()
  })

  it('loads strategies for an admin account', async () => {
    vi.mocked(apiFetch).mockResolvedValue([])

    await listAdminStrategies('token', 'account-1')

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/admin/accounts/account-1/strategies',
      { method: 'GET' },
      'token',
    )
  })

  it('loads strategy orders with a tradeDate query', async () => {
    vi.mocked(apiFetch).mockResolvedValue([])

    await listAdminStrategyOrders('token', 'account-1', 'strategy-1', '2026-07-01')

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/admin/accounts/account-1/strategies/strategy-1/orders?tradeDate=2026-07-01',
      { method: 'GET' },
      'token',
    )
  })

  it('updates strategy status through the admin endpoint', async () => {
    vi.mocked(clientFetch).mockResolvedValue(undefined)

    await updateAdminStrategyStatus('account-1', 'strategy-1', 'PAUSED')

    expect(clientFetch).toHaveBeenCalledWith(
      '/api/admin/accounts/account-1/strategies/strategy-1/status',
      { method: 'PATCH', body: { status: 'PAUSED' } },
    )
  })

  it('submits an admin order correction body', async () => {
    vi.mocked(clientFetch).mockResolvedValue({ mode: 'PLANNED_EDIT' })

    await correctAdminOrder({
      userId: 'user-1',
      accountId: 'account-1',
      strategyId: 'strategy-1',
      orderId: 'order-1',
      mode: 'PLANNED_EDIT',
      tradeDateKst: '2026-07-01',
      quantity: 3,
      price: 250,
      memo: 'price fix',
    })

    expect(clientFetch).toHaveBeenCalledWith(
      '/api/admin/trades/order-corrections',
      {
        method: 'POST',
        body: {
          userId: 'user-1',
          accountId: 'account-1',
          strategyId: 'strategy-1',
          orderId: 'order-1',
          mode: 'PLANNED_EDIT',
          tradeDateKst: '2026-07-01',
          quantity: 3,
          price: 250,
          memo: 'price fix',
        },
      },
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- entities/user/api/index.test.ts`
Expected: FAIL because the new admin functions and types do not exist yet.

- [ ] **Step 3: Write the minimal type and API implementation**

```ts
export interface AdminStrategy {
  id: string
  accountId: string
  type: string
  status: 'ACTIVE' | 'PAUSED'
  ticker: string
}

export interface AdminStrategyOrder {
  id: string
  userId?: string
  ownerNickname?: string
  strategyType?: string
  tradeDate: string
  ticker: string
  direction: string
  orderType: string
  timing: string
  quantity: number
  price: number
  status: string
  externalOrderId?: string | null
  filledQuantity?: number | null
  filledPrice?: number | null
}

export async function listAdminStrategies(token: string, accountId: string): Promise<AdminStrategy[]> {
  return apiFetch<AdminStrategy[]>(`/api/admin/accounts/${accountId}/strategies`, { method: 'GET' }, token)
}

export async function listAdminStrategyOrders(
  token: string,
  accountId: string,
  strategyId: string,
  tradeDate: string,
): Promise<AdminStrategyOrder[]> {
  return apiFetch<AdminStrategy[]>(
    `/api/admin/accounts/${accountId}/strategies/${strategyId}/orders?tradeDate=${tradeDate}`,
    { method: 'GET' },
    token,
  ) as Promise<AdminStrategyOrder[]>
}

export async function updateAdminStrategyStatus(
  accountId: string,
  strategyId: string,
  status: 'ACTIVE' | 'PAUSED',
): Promise<void> {
  await clientFetch<void>(
    `/api/admin/accounts/${accountId}/strategies/${strategyId}/status`,
    jsonBody('PATCH', { status }),
  )
}

export async function correctAdminOrder(
  request: AdminOrderCorrectionRequest,
): Promise<AdminOrderCorrectionResponse> {
  return clientFetch<AdminOrderCorrectionResponse>(
    '/api/admin/trades/order-corrections',
    jsonBody('POST', request),
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- entities/user/api/index.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add entities/user/model/types.ts entities/user/api/index.ts entities/user/index.ts entities/user/api/index.test.ts
git commit -m "feat(admin): add trade correction api bindings"
```

### Task 2: Convert Admin Trades Page to a Client Workbench Shell

**Files:**
- Modify: `app/(admin)/admin/trades/page.tsx`
- Create: `widgets/admin-trade-list/AdminTradesWorkbench.tsx`
- Create: `widgets/admin-trade-list/AdminTradesTable.tsx`
- Create: `widgets/admin-trade-list/index.ts`
- Test: `widgets/admin-trade-list/AdminTradesWorkbench.test.tsx`

**Interfaces:**
- Consumes:
  - `type AdminTrade` from `@entities/user`
  - `fmtUsd` from `@shared/lib/format`
- Produces:
  - `function AdminTradesWorkbench(props: { initialTrades: AdminTrade[]; initialTotal: number; token: string }): JSX.Element`
  - `function AdminTradesTable(props: { trades: AdminTrade[]; selectedTradeId?: string; onSelectTrade: (trade: AdminTrade) => void }): JSX.Element`

- [ ] **Step 1: Write the failing workbench test**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminTradesWorkbench } from './AdminTradesWorkbench'

const trades = [
  {
    id: 'trade-1',
    userId: 'user-1',
    ownerNickname: 'privacy-user',
    strategyType: 'PRIVACY',
    tradeDate: '2026-07-01',
    ticker: 'SOXL',
    direction: 'SELL',
    orderType: 'LIMIT',
    timing: 'AT_OPEN',
    quantity: 2,
    price: 267.37,
    status: 'PLACED',
    externalOrderId: 'BROKER-1',
    filledQuantity: null,
    filledPrice: null,
  },
]

it('selects a trade row and shows the selected context in the workbench', async () => {
  const user = userEvent.setup()

  render(<AdminTradesWorkbench initialTrades={trades} initialTotal={1} token="token" />)

  await user.click(screen.getByRole('button', { name: /privacy-user.*SOXL/i }))

  expect(screen.getByText('선택된 보정 대상')).toBeInTheDocument()
  expect(screen.getByText(/privacy-user/i)).toBeInTheDocument()
  expect(screen.getByText(/2026-07-01/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- widgets/admin-trade-list/AdminTradesWorkbench.test.tsx`
Expected: FAIL because the new workbench components do not exist yet.

- [ ] **Step 3: Write the minimal page and client shell implementation**

```tsx
export default async function AdminTradesPage(...) {
  ...
  const token = await getAuthToken()
  const all = token ? await listAdminTrades(token, resolvedFrom, resolvedTo).catch(() => []) : []

  return (
    <AdminTradesWorkbench
      initialTrades={all}
      initialTotal={all.length}
      token={token ?? ''}
    />
  )
}
```

```tsx
'use client'

export function AdminTradesWorkbench({
  initialTrades,
  initialTotal,
}: {
  initialTrades: AdminTrade[]
  initialTotal: number
  token: string
}) {
  const [selectedTrade, setSelectedTrade] = useState<AdminTrade | null>(null)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">거래 내역</h1>
        <p className="mt-1 text-sm text-muted-foreground">전체 {initialTotal}건</p>
      </div>

      <AdminTradesTable
        trades={initialTrades}
        selectedTradeId={selectedTrade?.id}
        onSelectTrade={setSelectedTrade}
      />

      <section className="rounded-2xl border border-border bg-background p-5">
        <h2 className="text-base font-semibold">선택된 보정 대상</h2>
        {selectedTrade ? (
          <div className="mt-3 text-sm text-muted-foreground">
            {selectedTrade.ownerNickname} · {selectedTrade.strategyType ?? '-'} · {selectedTrade.tradeDate}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">보정할 주문을 선택하세요.</p>
        )}
      </section>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- widgets/admin-trade-list/AdminTradesWorkbench.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/(admin)/admin/trades/page.tsx widgets/admin-trade-list/AdminTradesWorkbench.tsx widgets/admin-trade-list/AdminTradesTable.tsx widgets/admin-trade-list/index.ts widgets/admin-trade-list/AdminTradesWorkbench.test.tsx
git commit -m "feat(admin): add trade correction workbench shell"
```

### Task 3: Add Strategy and Order Selection Flow

**Files:**
- Modify: `widgets/admin-trade-list/AdminTradesWorkbench.tsx`
- Create: `widgets/admin-trade-list/AdminTradeCorrectionPanel.tsx`
- Test: `widgets/admin-trade-list/AdminTradesWorkbench.test.tsx`

**Interfaces:**
- Consumes:
  - `listAdminAccounts(token, from, to)` from `@entities/user`
  - `listAdminStrategies(token, accountId)` from `@entities/user`
  - `listAdminStrategyOrders(token, accountId, strategyId, tradeDate)` from `@entities/user`
- Produces:
  - `function AdminTradeCorrectionPanel(props: { ...selection props... }): JSX.Element`
  - selection state fields `selectedUserId`, `selectedAccountId`, `selectedStrategyId`, `selectedTradeDate`, `selectedOrderId`

- [ ] **Step 1: Write the failing selection-reset test**

```tsx
it('resets lower selections when the account changes', async () => {
  vi.mocked(listAdminStrategies)
    .mockResolvedValueOnce([{ id: 'strategy-1', accountId: 'account-1', type: 'PRIVACY', status: 'ACTIVE', ticker: 'SOXL' }])
    .mockResolvedValueOnce([{ id: 'strategy-2', accountId: 'account-2', type: 'PRIVACY', status: 'PAUSED', ticker: 'SOXL' }])

  render(<AdminTradesWorkbench initialTrades={trades} initialTotal={1} token="token" />)

  await user.selectOptions(screen.getByLabelText('계좌 선택'), 'account-1')
  await user.selectOptions(screen.getByLabelText('전략 선택'), 'strategy-1')
  await user.selectOptions(screen.getByLabelText('계좌 선택'), 'account-2')

  expect(screen.getByLabelText('전략 선택')).toHaveValue('')
  expect(screen.getByText('보정할 주문을 선택하세요.')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- widgets/admin-trade-list/AdminTradesWorkbench.test.tsx`
Expected: FAIL because the selection controls do not exist yet.

- [ ] **Step 3: Write the minimal selection panel implementation**

```tsx
const [selectedUserId, setSelectedUserId] = useState('')
const [selectedAccountId, setSelectedAccountId] = useState('')
const [selectedStrategyId, setSelectedStrategyId] = useState('')
const [selectedTradeDate, setSelectedTradeDate] = useState('')
const [selectedOrderId, setSelectedOrderId] = useState('')

function handleAccountChange(nextAccountId: string) {
  setSelectedAccountId(nextAccountId)
  setSelectedStrategyId('')
  setSelectedTradeDate('')
  setSelectedOrderId('')
}
```

```tsx
<label className="grid gap-2 text-sm">
  <span className="font-medium">계좌 선택</span>
  <select value={selectedAccountId} onChange={(e) => handleAccountChange(e.target.value)}>
    <option value="">계좌를 선택하세요</option>
    {accounts.map((account) => (
      <option key={account.id} value={account.id}>{account.ownerNickname}</option>
    ))}
  </select>
</label>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- widgets/admin-trade-list/AdminTradesWorkbench.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add widgets/admin-trade-list/AdminTradesWorkbench.tsx widgets/admin-trade-list/AdminTradeCorrectionPanel.tsx widgets/admin-trade-list/AdminTradesWorkbench.test.tsx
git commit -m "feat(admin): add strategy order selection flow"
```

### Task 4: Add Strategy Status Toggle and Read-Only State Handling

**Files:**
- Modify: `widgets/admin-trade-list/AdminTradeCorrectionPanel.tsx`
- Modify: `widgets/admin-trade-list/AdminTradesWorkbench.tsx`
- Test: `widgets/admin-trade-list/AdminTradesWorkbench.test.tsx`

**Interfaces:**
- Consumes:
  - `updateAdminStrategyStatus(accountId, strategyId, status)` from `@entities/user`
- Produces:
  - toggle actions `pause strategy`, `resume strategy`
  - read-only treatment for `FAILED` and `CANCELLED`

- [ ] **Step 1: Write the failing toggle test**

```tsx
it('toggles strategy status and refreshes the strategy list', async () => {
  vi.mocked(updateAdminStrategyStatus).mockResolvedValue(undefined)

  render(<AdminTradesWorkbench initialTrades={trades} initialTotal={1} token="token" />)

  await user.click(screen.getByRole('button', { name: '전략 일시중지' }))

  expect(updateAdminStrategyStatus).toHaveBeenCalledWith('account-1', 'strategy-1', 'PAUSED')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- widgets/admin-trade-list/AdminTradesWorkbench.test.tsx`
Expected: FAIL because the toggle action does not exist yet.

- [ ] **Step 3: Write the minimal toggle and read-only implementation**

```tsx
const isReadOnlyStatus = selectedOrder?.status === 'FAILED' || selectedOrder?.status === 'CANCELLED'

async function handleStrategyStatusChange(nextStatus: 'ACTIVE' | 'PAUSED') {
  if (!selectedAccountId || !selectedStrategyId) return
  await updateAdminStrategyStatus(selectedAccountId, selectedStrategyId, nextStatus)
  const refreshed = await listAdminStrategies(token, selectedAccountId)
  setStrategies(refreshed)
}
```

```tsx
{isReadOnlyStatus ? (
  <p className="text-sm text-muted-foreground">이 주문 상태는 관리자 보정 대상이 아닙니다.</p>
) : null}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- widgets/admin-trade-list/AdminTradesWorkbench.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add widgets/admin-trade-list/AdminTradeCorrectionPanel.tsx widgets/admin-trade-list/AdminTradesWorkbench.tsx widgets/admin-trade-list/AdminTradesWorkbench.test.tsx
git commit -m "feat(admin): add strategy status toggle to trade workbench"
```

### Task 5: Add Status-Specific Order Correction Form

**Files:**
- Create: `widgets/admin-trade-list/AdminOrderCorrectionForm.tsx`
- Modify: `widgets/admin-trade-list/AdminTradesWorkbench.tsx`
- Modify: `widgets/admin-trade-list/AdminTradeCorrectionPanel.tsx`
- Test: `widgets/admin-trade-list/AdminOrderCorrectionForm.test.tsx`
- Test: `widgets/admin-trade-list/AdminTradesWorkbench.test.tsx`

**Interfaces:**
- Consumes:
  - `correctAdminOrder(request)` from `@entities/user`
  - selected `AdminStrategyOrder`
- Produces:
  - `function AdminOrderCorrectionForm(props: { order: AdminStrategyOrder; userId: string; accountId: string; strategyId: string; onSuccess: () => Promise<void> | void }): JSX.Element`

- [ ] **Step 1: Write the failing form-mode test**

```tsx
it('renders a replace CTA and warning for PLACED orders', () => {
  render(
    <AdminOrderCorrectionForm
      order={{ ...baseOrder, status: 'PLACED' }}
      userId="user-1"
      accountId="account-1"
      strategyId="strategy-1"
      onSuccess={vi.fn()}
    />,
  )

  expect(screen.getByText('기존 주문을 취소한 뒤 새 주문을 접수합니다.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '취소 후 재주문' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- widgets/admin-trade-list/AdminOrderCorrectionForm.test.tsx`
Expected: FAIL because the form component does not exist yet.

- [ ] **Step 3: Write the minimal form implementation**

```tsx
const mode = order.status === 'PLANNED'
  ? 'PLANNED_EDIT'
  : order.status === 'PLACED'
    ? 'PLACED_REPLACE'
    : 'FILLED_CORRECTION'
```

```tsx
const submitLabel = mode === 'PLACED_REPLACE'
  ? '취소 후 재주문'
  : mode === 'FILLED_CORRECTION'
    ? '보정 체결 추가'
    : '계획 주문 수정'
```

```tsx
await correctAdminOrder({
  userId,
  accountId,
  strategyId,
  orderId: order.id,
  mode,
  tradeDateKst: order.tradeDate,
  direction,
  quantity,
  price,
  memo,
})
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- widgets/admin-trade-list/AdminOrderCorrectionForm.test.tsx widgets/admin-trade-list/AdminTradesWorkbench.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add widgets/admin-trade-list/AdminOrderCorrectionForm.tsx widgets/admin-trade-list/AdminOrderCorrectionForm.test.tsx widgets/admin-trade-list/AdminTradeCorrectionPanel.tsx widgets/admin-trade-list/AdminTradesWorkbench.tsx widgets/admin-trade-list/AdminTradesWorkbench.test.tsx
git commit -m "feat(admin): add status-specific order correction form"
```

### Task 6: Refresh Data After Success and Verify the Full Flow

**Files:**
- Modify: `widgets/admin-trade-list/AdminTradesWorkbench.tsx`
- Modify: `app/(admin)/admin/trades/page.tsx`
- Test: `widgets/admin-trade-list/AdminTradesWorkbench.test.tsx`

**Interfaces:**
- Consumes:
  - `listAdminStrategyOrders(token, accountId, strategyId, tradeDate)` from `@entities/user`
  - `correctAdminOrder(...)` success callback
- Produces:
  - success summary UI
  - post-success re-fetch of strategy orders

- [ ] **Step 1: Write the failing refresh-after-success test**

```tsx
it('re-fetches strategy orders after a successful correction', async () => {
  vi.mocked(correctAdminOrder).mockResolvedValue({
    mode: 'PLANNED_EDIT',
    resultingStatus: 'PLANNED',
    strategyStatus: 'ACTIVE',
    replacementExternalOrderId: null,
    finalHoldings: 0,
    cycleEnded: false,
  } as any)

  render(<AdminTradesWorkbench initialTrades={trades} initialTotal={1} token="token" />)

  await user.click(screen.getByRole('button', { name: '계획 주문 수정' }))

  expect(listAdminStrategyOrders).toHaveBeenCalledTimes(2)
  expect(screen.getByText(/보정이 완료되었습니다/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- widgets/admin-trade-list/AdminTradesWorkbench.test.tsx`
Expected: FAIL because the success callback does not refresh or summarize yet.

- [ ] **Step 3: Write the minimal refresh and summary implementation**

```tsx
const [resultMessage, setResultMessage] = useState('')

async function refreshOrders() {
  if (!selectedAccountId || !selectedStrategyId || !selectedTradeDate) return
  const refreshed = await listAdminStrategyOrders(token, selectedAccountId, selectedStrategyId, selectedTradeDate)
  setOrders(refreshed)
}

async function handleCorrectionSuccess(response: AdminOrderCorrectionResponse) {
  setResultMessage(`보정이 완료되었습니다. 결과 상태: ${response.resultingStatus}`)
  await refreshOrders()
}
```

- [ ] **Step 4: Run focused verification**

Run: `npm test -- widgets/admin-trade-list/AdminTradesWorkbench.test.tsx widgets/admin-trade-list/AdminOrderCorrectionForm.test.tsx entities/user/api/index.test.ts`
Expected: PASS

- [ ] **Step 5: Run repo-level verification**

Run: `npm run typecheck && npm test -- widgets/admin-trade-list/AdminTradesWorkbench.test.tsx widgets/admin-trade-list/AdminOrderCorrectionForm.test.tsx entities/user/api/index.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/(admin)/admin/trades/page.tsx widgets/admin-trade-list/AdminTradesWorkbench.tsx widgets/admin-trade-list/AdminTradesWorkbench.test.tsx
git commit -m "feat(admin): finish trade correction admin ui"
```
