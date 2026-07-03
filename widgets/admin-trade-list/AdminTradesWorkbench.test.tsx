import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reorderAdminOrder, getReorderTimingAvailability } from '@entities/user'
import type { AdminAccount, AdminStrategy, AdminStrategyOrder, AdminTrade } from '@entities/user'
import { AdminTradesWorkbench } from './AdminTradesWorkbench'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@entities/user', async () => {
  const actual = await vi.importActual<typeof import('@entities/user')>('@entities/user')

  return {
    ...actual,
    reorderAdminOrder: vi.fn(),
    getReorderTimingAvailability: vi.fn().mockResolvedValue({
      atOpen: false,
      atClose: true,
      immediate: false,
    }),
  }
})

vi.mock('@shared/lib/format', async () => {
  const actual = await vi.importActual<typeof import('@shared/lib/format')>('@shared/lib/format')
  return {
    ...actual,
    todayKst: vi.fn(() => '2026-07-03'),
  }
})

const trades: AdminTrade[] = [
  {
    id: 'trade-1',
    userId: 'user-1',
    accountId: 'account-1',
    strategyId: 'strategy-1',
    ownerNickname: '홍길동',
    strategyType: 'INFINITE',
    tradeDate: '2026-07-01',
    ticker: 'TSLA',
    direction: 'BUY',
    orderType: 'MOC',
    quantity: 3,
    price: 312.45,
    status: 'PLACED',
  },
  {
    id: 'trade-2',
    userId: 'user-2',
    accountId: 'account-2',
    strategyId: 'strategy-2',
    ownerNickname: '김영희',
    strategyType: 'SINGLE',
    tradeDate: '2026-06-30',
    ticker: 'NVDA',
    direction: 'SELL',
    orderType: 'LIMIT',
    quantity: 1,
    price: 144.3,
    status: 'FILLED',
  },
]

const accounts: AdminAccount[] = [
  {
    id: 'account-1',
    userId: 'user-1',
    ownerNickname: '홍길동',
    accountNoMasked: '123-45****',
    broker: 'KIS',
    strategies: [],
  },
  {
    id: 'account-2',
    userId: 'user-2',
    ownerNickname: '김영희',
    accountNoMasked: '987-65****',
    broker: 'KIS',
    strategies: [],
  },
]

const strategies: AdminStrategy[] = [
  {
    id: 'strategy-1',
    type: 'INFINITE',
    status: 'ACTIVE',
    ticker: 'TSLA',
    cycleSeedType: 'MANUAL',
  },
  {
    id: 'strategy-2',
    type: 'SINGLE',
    status: 'PAUSED',
    ticker: 'NVDA',
    cycleSeedType: 'AUTO',
  },
]

const orders: AdminStrategyOrder[] = [
  {
    id: 'order-1',
    userId: 'user-1',
    ownerNickname: '홍길동',
    strategyType: 'INFINITE',
    tradeDate: '2026-07-03',
    ticker: 'TSLA',
    direction: 'BUY',
    orderType: 'MOC',
    timing: 'AT_CLOSE',
    quantity: 3,
    price: 312.45,
    status: 'PLACED',
    externalOrderId: 'ext-1',
  },
  {
    id: 'order-2',
    userId: 'user-1',
    ownerNickname: '홍길동',
    strategyType: 'INFINITE',
    tradeDate: '2026-07-03',
    ticker: 'TSLA',
    direction: 'SELL',
    orderType: 'LIMIT',
    timing: 'AT_CLOSE',
    quantity: 1,
    price: 320.0,
    status: 'FILLED',
    externalOrderId: 'ext-2',
  },
]

const failedOrder: AdminStrategyOrder = {
  ...orders[0],
  id: 'order-failed',
  status: 'FAILED',
}

const cancelledOrder: AdminStrategyOrder = {
  ...orders[0],
  id: 'order-cancelled',
  status: 'CANCELLED',
}

const partiallyFilledOrder: AdminStrategyOrder = {
  ...orders[0],
  id: 'order-partially-filled',
  status: 'PARTIALLY_FILLED',
  filledQuantity: 1,
  filledPrice: 311.1,
}

const reorderAdminOrderMock = vi.mocked(reorderAdminOrder)
const getReorderTimingAvailabilityMock = vi.mocked(getReorderTimingAvailability)

async function selectBrokeredOrderTarget(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByRole('combobox', { name: '사용자 선택' }), 'user-1')
  await user.selectOptions(await screen.findByRole('combobox', { name: '증권사 선택' }), 'KIS')
  await user.selectOptions(await screen.findByRole('combobox', { name: '계좌 선택' }), 'account-1')
}

async function selectStrategyTarget(user: ReturnType<typeof userEvent.setup>) {
  await selectBrokeredOrderTarget(user)
  await user.selectOptions(await screen.findByRole('combobox', { name: '전략 선택' }), 'strategy-1')
}

describe('AdminTradesWorkbench', () => {
  beforeEach(() => {
    reorderAdminOrderMock.mockReset()
    getReorderTimingAvailabilityMock.mockResolvedValue({
      atOpen: false,
      atClose: true,
      immediate: false,
    })
  })

  it('submits only changed orders with per-order timing', async () => {
    const user = userEvent.setup()
    const loadAccounts = vi.fn(async () => accounts.slice(0, 1))
    const loadStrategies = vi.fn(async () => strategies.slice(0, 1))
    const loadOrders = vi.fn(async () => orders)

    reorderAdminOrderMock.mockResolvedValue({
      userId: 'user-1',
      accountId: 'account-1',
      strategyId: 'strategy-1',
      sourceOrderId: 'order-1',
      originalStatus: 'PLACED',
      resultingStatus: 'PLANNED',
      newOrderExternalId: null,
    })

    render(
      <AdminTradesWorkbench
        initialTrades={trades}
        initialPage={1}
        initialSize={10}
        loadAccounts={loadAccounts}
        loadStrategies={loadStrategies}
        loadOrders={loadOrders}
      />,
    )

    await selectStrategyTarget(user)

    // 주문시점 셀렉터 표시 확인
    expect(screen.getAllByLabelText(/주문시점/)).toHaveLength(2)

    // order-1 값 변경
    await user.clear(screen.getByLabelText('order-1 재주문 수량'))
    await user.type(screen.getByLabelText('order-1 재주문 수량'), '5')
    await user.clear(screen.getByLabelText('order-1 재주문 가격'))
    await user.type(screen.getByLabelText('order-1 재주문 가격'), '320.5')
    await user.type(screen.getByLabelText('order-1 메모'), '관리자 재주문')
    // order-2 값 변경
    await user.clear(screen.getByLabelText('order-2 재주문 가격'))
    await user.type(screen.getByLabelText('order-2 재주문 가격'), '321')
    await user.click(screen.getByRole('button', { name: '변경한 주문 2건 재주문' }))

    await waitFor(() => expect(reorderAdminOrderMock).toHaveBeenCalledTimes(2))
    expect(reorderAdminOrderMock).toHaveBeenNthCalledWith(1, {
      userId: 'user-1',
      accountId: 'account-1',
      strategyId: 'strategy-1',
      orderId: 'order-1',
      timing: 'AT_CLOSE',
      tradeDateKst: '2026-07-03',
      direction: 'BUY',
      quantity: 5,
      price: 320.5,
      memo: '관리자 재주문',
    })
    expect(reorderAdminOrderMock).toHaveBeenNthCalledWith(2, {
      userId: 'user-1',
      accountId: 'account-1',
      strategyId: 'strategy-1',
      orderId: 'order-2',
      timing: 'AT_CLOSE',
      tradeDateKst: '2026-07-03',
      direction: 'SELL',
      quantity: 1,
      price: 321,
      memo: undefined,
    })
  })

  it('refreshes orders and shows batch success summary after reorder', async () => {
    const user = userEvent.setup()
    const loadAccounts = vi.fn(async () => accounts.slice(0, 1))
    const loadStrategies = vi.fn(async () => strategies.slice(0, 1))
    const refreshedOrders: AdminStrategyOrder[] = [
      { ...orders[0], status: 'PLANNED' },
      { ...orders[1], status: 'PLANNED' },
    ]
    const loadOrders = vi
      .fn<() => Promise<AdminStrategyOrder[]>>()
      .mockResolvedValueOnce(orders)
      .mockResolvedValueOnce(refreshedOrders)

    reorderAdminOrderMock.mockResolvedValueOnce({
      userId: 'user-1',
      accountId: 'account-1',
      strategyId: 'strategy-1',
      sourceOrderId: 'order-1',
      originalStatus: 'PLACED',
      resultingStatus: 'PLANNED',
      newOrderExternalId: null,
    })

    render(
      <AdminTradesWorkbench
        initialTrades={trades}
        initialPage={1}
        initialSize={10}
        loadAccounts={loadAccounts}
        loadStrategies={loadStrategies}
        loadOrders={loadOrders}
      />,
    )

    await selectStrategyTarget(user)
    // order-1만 변경
    await user.clear(screen.getByLabelText('order-1 재주문 수량'))
    await user.type(screen.getByLabelText('order-1 재주문 수량'), '5')
    await user.clear(screen.getByLabelText('order-1 재주문 가격'))
    await user.type(screen.getByLabelText('order-1 재주문 가격'), '320.5')
    await user.type(screen.getByLabelText('order-1 메모'), '재주문 반영')
    await user.click(screen.getByRole('button', { name: '변경한 주문 1건 재주문' }))

    await waitFor(() => expect(reorderAdminOrderMock).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(loadOrders).toHaveBeenCalledTimes(2))
    await waitFor(() =>
      expect(loadOrders).toHaveBeenLastCalledWith('account-1', 'strategy-1', '2026-07-03'),
    )

    expect(screen.getByText('거래일 재주문이 완료되었습니다')).toBeInTheDocument()
    expect(screen.getByText('처리 1건 · 제외 1건')).toBeInTheDocument()
  })

  it('clears the previous success summary when strategy selection changes', async () => {
    const user = userEvent.setup()
    const loadAccounts = vi.fn(async () => accounts.slice(0, 1))
    const loadStrategies = vi.fn(async () => strategies)
    const loadOrders = vi
      .fn<() => Promise<AdminStrategyOrder[]>>()
      .mockResolvedValueOnce(orders)    // strategy-1 초기 로드
      .mockResolvedValueOnce([orders[0], orders[1]]) // 재주문 후 리로드
      .mockResolvedValue([])            // strategy-2 선택 시

    reorderAdminOrderMock
      .mockResolvedValueOnce({
        userId: 'user-1',
        accountId: 'account-1',
        strategyId: 'strategy-1',
        sourceOrderId: 'order-1',
        originalStatus: 'PLACED',
        resultingStatus: 'PLANNED',
        newOrderExternalId: null,
      })
      .mockResolvedValueOnce({
        userId: 'user-1',
        accountId: 'account-1',
        strategyId: 'strategy-1',
        sourceOrderId: 'order-2',
        originalStatus: 'FILLED',
        resultingStatus: 'PLANNED',
        newOrderExternalId: null,
      })

    render(
      <AdminTradesWorkbench
        initialTrades={trades}
        initialPage={1}
        initialSize={10}
        loadAccounts={loadAccounts}
        loadStrategies={loadStrategies}
        loadOrders={loadOrders}
      />,
    )

    await selectStrategyTarget(user)
    // 두 주문 모두 변경 후 재주문
    await user.clear(screen.getByLabelText('order-1 재주문 수량'))
    await user.type(screen.getByLabelText('order-1 재주문 수량'), '5')
    await user.clear(screen.getByLabelText('order-2 재주문 가격'))
    await user.type(screen.getByLabelText('order-2 재주문 가격'), '321')
    await user.click(screen.getByRole('button', { name: '변경한 주문 2건 재주문' }))

    await waitFor(() => expect(screen.getByText('거래일 재주문이 완료되었습니다')).toBeInTheDocument())

    // 다른 전략 선택 시 피드백 초기화
    await user.selectOptions(screen.getByRole('combobox', { name: '전략 선택' }), 'strategy-2')

    expect(screen.queryByText('거래일 재주문이 완료되었습니다')).not.toBeInTheDocument()
  })

  it('supports user-broker-account-strategy selection and resets lower steps', async () => {
    const user = userEvent.setup()
    const loadAccounts = vi.fn(async (userId: string) => accounts.filter((account) => account.userId === userId))
    const loadStrategies = vi.fn(async () => strategies.slice(0, 1))
    const loadOrders = vi.fn(async () => orders)

    render(
      <AdminTradesWorkbench
        initialTrades={trades}
        initialPage={1}
        initialSize={10}
        loadAccounts={loadAccounts}
        loadStrategies={loadStrategies}
        loadOrders={loadOrders}
      />,
    )

    const brokerSelect = screen.getByRole('combobox', { name: '증권사 선택' })
    const accountSelect = screen.getByRole('combobox', { name: '계좌 선택' })
    const strategySelect = screen.getByRole('combobox', { name: '전략 선택' })

    expect(screen.getByRole('heading', { name: '거래일 재주문 대상' })).toBeInTheDocument()
    expect(brokerSelect).toBeDisabled()
    expect(accountSelect).toBeDisabled()
    expect(strategySelect).toBeDisabled()

    await user.selectOptions(screen.getByRole('combobox', { name: '사용자 선택' }), 'user-1')

    await waitFor(() => expect(loadAccounts).toHaveBeenCalledWith('user-1'))
    await waitFor(() => expect(brokerSelect).not.toBeDisabled())
    expect(within(brokerSelect).getByRole('option', { name: '한국투자증권' })).toBeInTheDocument()

    await user.selectOptions(brokerSelect, 'KIS')

    await waitFor(() => expect(accountSelect).not.toBeDisabled())
    expect(within(accountSelect).getByRole('option', { name: '123-45****' })).toBeInTheDocument()

    await user.selectOptions(accountSelect, 'account-1')

    await waitFor(() => expect(loadStrategies).toHaveBeenCalledWith('account-1'))
    await waitFor(() => expect(strategySelect).not.toBeDisabled())
    expect(within(strategySelect).getByRole('option', { name: 'INFINITE · TSLA' })).toBeInTheDocument()

    await user.selectOptions(strategySelect, 'strategy-1')

    await waitFor(() => expect(loadOrders).toHaveBeenCalledWith('account-1', 'strategy-1', '2026-07-03'))
    await waitFor(() => expect(screen.getByLabelText('order-1 재주문 수량')).toBeInTheDocument())
    expect(screen.getByLabelText('order-2 재주문 수량')).toBeInTheDocument()

    // 사용자 재선택 시 하위 단계 초기화
    await user.selectOptions(screen.getByRole('combobox', { name: '사용자 선택' }), 'user-2')

    await waitFor(() => expect(loadAccounts).toHaveBeenLastCalledWith('user-2'))
    expect(brokerSelect).toHaveValue('')
    expect(accountSelect).toHaveValue('')
    expect(strategySelect).toHaveValue('')
    expect(brokerSelect).not.toBeDisabled()
    expect(strategySelect).toBeDisabled()
  })

  it('toggles selected strategy status and refreshes the strategy list', async () => {
    const user = userEvent.setup()
    const loadAccounts = vi.fn(async () => accounts.slice(0, 1))
    const loadStrategies = vi
      .fn<() => Promise<AdminStrategy[]>>()
      .mockResolvedValueOnce(strategies.slice(0, 1))
      .mockResolvedValueOnce([{ ...strategies[0], status: 'PAUSED' }])
    const toggleStrategyStatus = vi.fn(async () => undefined)

    render(
      <AdminTradesWorkbench
        initialTrades={trades}
        initialPage={1}
        initialSize={10}
        loadAccounts={loadAccounts}
        loadStrategies={loadStrategies}
        toggleStrategyStatus={toggleStrategyStatus}
      />,
    )

    await selectBrokeredOrderTarget(user)
    await user.selectOptions(await screen.findByRole('combobox', { name: '전략 선택' }), 'strategy-1')

    expect(screen.getByText('현재 전략 상태: ACTIVE')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '전략 중지' }))

    await waitFor(() => expect(toggleStrategyStatus).toHaveBeenCalledWith('account-1', 'strategy-1', 'PAUSED'))
    await waitFor(() => expect(loadStrategies).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.getByText('현재 전략 상태: PAUSED')).toBeInTheDocument())
    expect(screen.getByRole('combobox', { name: '전략 선택' })).toHaveValue('strategy-1')
    expect(screen.getByRole('button', { name: '전략 재개' })).toBeInTheDocument()
  })

  it('shows a visible error message when strategy status toggle fails', async () => {
    const user = userEvent.setup()
    const loadAccounts = vi.fn(async () => accounts.slice(0, 1))
    const loadStrategies = vi.fn(async () => strategies.slice(0, 1))
    const toggleStrategyStatus = vi.fn(async () => {
      throw new Error('toggle failed')
    })

    render(
      <AdminTradesWorkbench
        initialTrades={trades}
        initialPage={1}
        initialSize={10}
        loadAccounts={loadAccounts}
        loadStrategies={loadStrategies}
        toggleStrategyStatus={toggleStrategyStatus}
      />,
    )

    await selectBrokeredOrderTarget(user)
    await user.selectOptions(await screen.findByRole('combobox', { name: '전략 선택' }), 'strategy-1')
    await user.click(screen.getByRole('button', { name: '전략 중지' }))

    await waitFor(() =>
      expect(screen.getByText('전략 상태 변경에 실패했습니다. 잠시 후 다시 시도하세요.')).toBeInTheDocument(),
    )
  })

  it('filters the table rows as the selection changes', async () => {
    const user = userEvent.setup()
    const loadAccounts = vi.fn(async () => accounts.slice(0, 1))
    const loadStrategies = vi.fn(async () => strategies.slice(0, 1))
    const loadOrders = vi.fn(async () => orders)

    render(
      <AdminTradesWorkbench
        initialTrades={trades}
        initialPage={1}
        initialSize={10}
        loadAccounts={loadAccounts}
        loadStrategies={loadStrategies}
        loadOrders={loadOrders}
      />,
    )

    const table = screen.getByRole('table')

    expect(within(table).getByText('홍길동')).toBeInTheDocument()
    expect(within(table).getByText('김영희')).toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: '사용자 선택' }), 'user-1')

    await waitFor(() => expect(within(table).queryByText('김영희')).not.toBeInTheDocument())
    expect(within(table).getAllByText('홍길동').length).toBeGreaterThan(0)

    await user.selectOptions(await screen.findByRole('combobox', { name: '증권사 선택' }), 'KIS')
    await user.selectOptions(await screen.findByRole('combobox', { name: '계좌 선택' }), 'account-1')
    await user.selectOptions(await screen.findByRole('combobox', { name: '전략 선택' }), 'strategy-1')

    await waitFor(() => expect(within(table).queryByText('김영희')).not.toBeInTheDocument())
    expect(within(table).getByText('TSLA')).toBeInTheDocument()
    expect(within(table).queryByText('NVDA')).not.toBeInTheDocument()
  })

  it('renders the action error with readable dark-mode contrast classes', async () => {
    const user = userEvent.setup()
    const loadAccounts = vi.fn(async () => {
      throw new Error('accounts failed')
    })

    render(
      <AdminTradesWorkbench
        initialTrades={trades}
        initialPage={1}
        initialSize={10}
        loadAccounts={loadAccounts}
      />,
    )

    await user.selectOptions(screen.getByRole('combobox', { name: '사용자 선택' }), 'user-1')

    const errorSection = screen.getByLabelText('재주문 오류')
    expect(errorSection).toHaveClass('dark:bg-rose-900/40')
    expect(errorSection).toHaveClass('dark:text-rose-100')
  })

  it.each([
    ['FAILED', failedOrder],
    ['CANCELLED', cancelledOrder],
  ])('shows reorder form controls for %s orders (all statuses reorderable)', async (_status, order) => {
    const user = userEvent.setup()
    const loadAccounts = vi.fn(async () => accounts.slice(0, 1))
    const loadStrategies = vi.fn(async () => strategies.slice(0, 1))
    const loadOrders = vi.fn(async () => [order])

    render(
      <AdminTradesWorkbench
        initialTrades={trades}
        initialPage={1}
        initialSize={10}
        loadAccounts={loadAccounts}
        loadStrategies={loadStrategies}
        loadOrders={loadOrders}
      />,
    )

    await selectStrategyTarget(user)

    // FAILED/CANCELLED 주문도 재주문 가능 — 수량 입력 활성화
    expect(screen.getByLabelText(`${order.id} 재주문 수량`)).not.toBeDisabled()
    // 변경 전 — 버튼 비활성
    expect(screen.getByRole('button', { name: '변경한 주문 0건 재주문' })).toBeDisabled()
  })

  it('shows batch reorder submit controls for partially filled orders', async () => {
    const user = userEvent.setup()
    const loadAccounts = vi.fn(async () => accounts.slice(0, 1))
    const loadStrategies = vi.fn(async () => strategies.slice(0, 1))
    const loadOrders = vi.fn(async () => [partiallyFilledOrder])

    render(
      <AdminTradesWorkbench
        initialTrades={trades}
        initialPage={1}
        initialSize={10}
        loadAccounts={loadAccounts}
        loadStrategies={loadStrategies}
        loadOrders={loadOrders}
      />,
    )

    await selectStrategyTarget(user)

    expect(screen.getByLabelText(`${partiallyFilledOrder.id} 재주문 수량`)).not.toBeDisabled()
    expect(screen.getByRole('button', { name: '변경한 주문 0건 재주문' })).toBeDisabled()
  })

  it('shows a visible error message when any batch reorder request fails', async () => {
    const user = userEvent.setup()
    const loadAccounts = vi.fn(async () => accounts.slice(0, 1))
    const loadStrategies = vi.fn(async () => strategies.slice(0, 1))
    const loadOrders = vi.fn(async () => orders)

    reorderAdminOrderMock.mockRejectedValue(new Error('reorder failed'))

    render(
      <AdminTradesWorkbench
        initialTrades={trades}
        initialPage={1}
        initialSize={10}
        loadAccounts={loadAccounts}
        loadStrategies={loadStrategies}
        loadOrders={loadOrders}
      />,
    )

    await selectStrategyTarget(user)
    // 값 변경 후 재주문
    await user.clear(screen.getByLabelText('order-1 재주문 수량'))
    await user.type(screen.getByLabelText('order-1 재주문 수량'), '5')
    await user.click(screen.getByRole('button', { name: '변경한 주문 1건 재주문' }))

    await waitFor(() =>
      expect(screen.getByText('재주문에 실패했습니다. 입력값과 주문 상태를 다시 확인하세요.')).toBeInTheDocument(),
    )
  })
})
