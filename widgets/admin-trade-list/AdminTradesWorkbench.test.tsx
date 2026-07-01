import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { correctAdminOrder } from '@entities/user'
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
    correctAdminOrder: vi.fn(),
  }
})

const trades: AdminTrade[] = [
  {
    id: 'trade-1',
    userId: 'user-1',
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
    tradeDate: '2026-07-01',
    ticker: 'TSLA',
    direction: 'BUY',
    orderType: 'MOC',
    timing: 'AT_CLOSE',
    quantity: 3,
    price: 312.45,
    status: 'PLACED',
    externalOrderId: 'ext-1',
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

const correctAdminOrderMock = vi.mocked(correctAdminOrder)

describe('AdminTradesWorkbench', () => {
  it('submits placed order correction with replace mode and stronger warning copy', async () => {
    const user = userEvent.setup()
    const loadAccounts = vi.fn(async () => accounts.slice(0, 1))
    const loadStrategies = vi.fn(async () => strategies.slice(0, 1))
    const loadOrders = vi.fn(async () => orders)

    correctAdminOrderMock.mockResolvedValue({
      userId: 'user-1',
      accountId: 'account-1',
      strategyId: 'strategy-1',
      orderId: 'order-1',
      mode: 'PLACED_REPLACE',
      originalStatus: 'PLACED',
      resultingStatus: 'PLACED',
      replacementExternalOrderId: 'ext-2',
      finalHoldings: 3,
      finalAvgPrice: 312.45,
      finalUsdDeposit: 1000,
      strategyStatus: 'ACTIVE',
      cycleEnded: false,
      cycleEndDate: null,
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

    await user.selectOptions(screen.getByRole('combobox', { name: '사용자 선택' }), 'user-1')
    await user.selectOptions(await screen.findByRole('combobox', { name: '계좌 선택' }), 'account-1')
    await user.selectOptions(await screen.findByRole('combobox', { name: '전략 선택' }), 'strategy-1')
    await user.selectOptions(await screen.findByRole('combobox', { name: '거래일 선택' }), '2026-07-01')
    await user.selectOptions(await screen.findByRole('combobox', { name: '주문 선택' }), 'order-1')

    expect(screen.getByText('PLACED 주문은 기존 주문을 취소한 뒤 다시 주문합니다. 체결 위험을 확인한 뒤 진행하세요.')).toBeInTheDocument()

    const quantityInput = screen.getByLabelText('보정 수량')
    const priceInput = screen.getByLabelText('보정 가격')
    const memoInput = screen.getByLabelText('보정 메모')

    await user.clear(quantityInput)
    await user.type(quantityInput, '5')
    await user.clear(priceInput)
    await user.type(priceInput, '320.5')
    await user.type(memoInput, '관리자 보정')
    await user.click(screen.getByRole('button', { name: '취소 후 재주문' }))

    await waitFor(() =>
      expect(correctAdminOrderMock).toHaveBeenCalledWith({
        userId: 'user-1',
        accountId: 'account-1',
        strategyId: 'strategy-1',
        orderId: 'order-1',
        mode: 'PLACED_REPLACE',
        tradeDateKst: '2026-07-01',
        direction: 'BUY',
        quantity: 5,
        price: 320.5,
        memo: '관리자 보정',
      }),
    )
  })

  it('shows selected correction targets summary when rows are selected', async () => {
    const user = userEvent.setup()

    render(
      <AdminTradesWorkbench
        initialTrades={trades}
        initialPage={1}
        initialSize={10}
      />,
    )

    const summaryHeading = screen.getByRole('heading', { name: '선택된 보정 대상' })
    const summary = summaryHeading.closest('section')

    expect(summary).not.toBeNull()
    expect(within(summary!).getByText('0건 선택됨')).toBeInTheDocument()
    expect(within(summary!).getByText('선택한 거래가 없습니다')).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'TSLA 거래 선택' }))

    expect(within(summary!).getByText('1건 선택됨')).toBeInTheDocument()
    expect(within(summary!).getByText('홍길동')).toBeInTheDocument()
    expect(within(summary!).getByText('TSLA')).toBeInTheDocument()
    expect(within(summary!).getByText('2026-07-01')).toBeInTheDocument()
  })

  it('supports user-account-strategy-tradeDate-order selection and resets lower steps', async () => {
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

    await user.click(screen.getByRole('checkbox', { name: 'TSLA 거래 선택' }))

    const accountSelect = screen.getByRole('combobox', { name: '계좌 선택' })
    const strategySelect = screen.getByRole('combobox', { name: '전략 선택' })
    const tradeDateSelect = screen.getByRole('combobox', { name: '거래일 선택' })
    const orderSelect = screen.getByRole('combobox', { name: '주문 선택' })

    expect(screen.getByRole('heading', { name: '선택된 보정 대상' })).toBeInTheDocument()
    expect(accountSelect).toBeDisabled()
    expect(strategySelect).toBeDisabled()
    expect(tradeDateSelect).toBeDisabled()
    expect(orderSelect).toBeDisabled()

    await user.selectOptions(screen.getByRole('combobox', { name: '사용자 선택' }), 'user-1')

    await waitFor(() => expect(loadAccounts).toHaveBeenCalledWith('user-1'))
    await waitFor(() => expect(accountSelect).not.toBeDisabled())
    expect(within(accountSelect).getByRole('option', { name: '홍길동 · 123-45****' })).toBeInTheDocument()

    await user.selectOptions(accountSelect, 'account-1')

    await waitFor(() => expect(loadStrategies).toHaveBeenCalledWith('account-1'))
    await waitFor(() => expect(strategySelect).not.toBeDisabled())
    expect(within(strategySelect).getByRole('option', { name: 'INFINITE · TSLA' })).toBeInTheDocument()

    await user.selectOptions(strategySelect, 'strategy-1')

    await waitFor(() => expect(tradeDateSelect).not.toBeDisabled())
    expect(within(tradeDateSelect).getByRole('option', { name: '2026-07-01' })).toBeInTheDocument()

    await user.selectOptions(tradeDateSelect, '2026-07-01')

    await waitFor(() => expect(loadOrders).toHaveBeenCalledWith('account-1', 'strategy-1', '2026-07-01'))
    await waitFor(() => expect(orderSelect).not.toBeDisabled())
    expect(within(orderSelect).getByRole('option', { name: 'TSLA · BUY · 3주 · PLACED' })).toBeInTheDocument()

    await user.selectOptions(orderSelect, 'order-1')
    expect(orderSelect).toHaveValue('order-1')

    await user.selectOptions(screen.getByRole('combobox', { name: '사용자 선택' }), 'user-2')

    await waitFor(() => expect(loadAccounts).toHaveBeenLastCalledWith('user-2'))
    expect(accountSelect).toHaveValue('')
    expect(strategySelect).toHaveValue('')
    expect(tradeDateSelect).toHaveValue('')
    expect(orderSelect).toHaveValue('')
    expect(strategySelect).toBeDisabled()
    expect(tradeDateSelect).toBeDisabled()
    expect(orderSelect).toBeDisabled()
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

    await user.selectOptions(screen.getByRole('combobox', { name: '사용자 선택' }), 'user-1')
    await user.selectOptions(await screen.findByRole('combobox', { name: '계좌 선택' }), 'account-1')
    await user.selectOptions(await screen.findByRole('combobox', { name: '전략 선택' }), 'strategy-1')

    expect(screen.getByText('현재 전략 상태: ACTIVE')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '전략 중지' }))

    await waitFor(() => expect(toggleStrategyStatus).toHaveBeenCalledWith('account-1', 'strategy-1', 'PAUSED'))
    await waitFor(() => expect(loadStrategies).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.getByText('현재 전략 상태: PAUSED')).toBeInTheDocument())
    expect(screen.getByRole('combobox', { name: '전략 선택' })).toHaveValue('strategy-1')
    expect(screen.getByRole('button', { name: '전략 재개' })).toBeInTheDocument()
  })

  it.each([
    ['FAILED', failedOrder, 'FAILED 주문은 읽기 전용입니다. 상태 확인만 가능하며 보정은 진행할 수 없습니다.'],
    ['CANCELLED', cancelledOrder, 'CANCELLED 주문은 읽기 전용입니다. 취소 이력을 유지해야 하므로 보정은 진행할 수 없습니다.'],
  ])('shows read-only guidance for %s orders', async (_status, readOnlyOrder, message) => {
    const user = userEvent.setup()
    const loadAccounts = vi.fn(async () => accounts.slice(0, 1))
    const loadStrategies = vi.fn(async () => strategies.slice(0, 1))
    const loadOrders = vi.fn(async () => [readOnlyOrder])

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

    await user.selectOptions(screen.getByRole('combobox', { name: '사용자 선택' }), 'user-1')
    await user.selectOptions(await screen.findByRole('combobox', { name: '계좌 선택' }), 'account-1')
    await user.selectOptions(await screen.findByRole('combobox', { name: '전략 선택' }), 'strategy-1')
    await user.selectOptions(await screen.findByRole('combobox', { name: '거래일 선택' }), '2026-07-01')
    await user.selectOptions(await screen.findByRole('combobox', { name: '주문 선택' }), readOnlyOrder.id)

    expect(screen.getByText(message)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /보정|재주문|적용/ })).not.toBeInTheDocument()
  })

  it('shows correction submit controls for partially filled orders', async () => {
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

    await user.selectOptions(screen.getByRole('combobox', { name: '사용자 선택' }), 'user-1')
    await user.selectOptions(await screen.findByRole('combobox', { name: '계좌 선택' }), 'account-1')
    await user.selectOptions(await screen.findByRole('combobox', { name: '전략 선택' }), 'strategy-1')
    await user.selectOptions(await screen.findByRole('combobox', { name: '거래일 선택' }), '2026-07-01')
    await user.selectOptions(await screen.findByRole('combobox', { name: '주문 선택' }), partiallyFilledOrder.id)

    expect(screen.getByRole('button', { name: '체결 내역 보정' })).toBeInTheDocument()
  })
})
