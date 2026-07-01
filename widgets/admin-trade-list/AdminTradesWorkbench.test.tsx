import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
  {
    id: 'order-2',
    userId: 'user-1',
    ownerNickname: '홍길동',
    strategyType: 'INFINITE',
    tradeDate: '2026-07-01',
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

const correctAdminOrderMock = vi.mocked(correctAdminOrder)

async function selectBrokeredOrderTarget(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByRole('combobox', { name: '사용자 선택' }), 'user-1')
  await user.selectOptions(await screen.findByRole('combobox', { name: '증권사 선택' }), 'KIS')
  await user.selectOptions(await screen.findByRole('combobox', { name: '계좌 선택' }), 'account-1')
}

async function selectStrategyDayTarget(user: ReturnType<typeof userEvent.setup>) {
  await selectBrokeredOrderTarget(user)
  await user.selectOptions(await screen.findByRole('combobox', { name: '전략 선택' }), 'strategy-1')
  await user.selectOptions(await screen.findByRole('combobox', { name: '거래일 선택' }), '2026-07-01')
}

describe('AdminTradesWorkbench', () => {
  beforeEach(() => {
    correctAdminOrderMock.mockReset()
  })

  it('submits same-day strategy orders together with per-order modes', async () => {
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

    await selectStrategyDayTarget(user)

    expect(screen.getByText('기존 주문을 취소한 뒤 같은 날 주문 세트를 다시 제출합니다.')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('order-1 보정 수량'))
    await user.type(screen.getByLabelText('order-1 보정 수량'), '5')
    await user.clear(screen.getByLabelText('order-1 보정 가격'))
    await user.type(screen.getByLabelText('order-1 보정 가격'), '320.5')
    await user.type(screen.getByLabelText('order-1 보정 메모'), '관리자 보정')
    await user.clear(screen.getByLabelText('order-2 보정 가격'))
    await user.type(screen.getByLabelText('order-2 보정 가격'), '321')
    await user.click(screen.getByRole('button', { name: '거래일 주문 2건 일괄 보정' }))

    await waitFor(() => expect(correctAdminOrderMock).toHaveBeenCalledTimes(2))
    expect(correctAdminOrderMock).toHaveBeenNthCalledWith(1, {
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
      })
    expect(correctAdminOrderMock).toHaveBeenNthCalledWith(2, {
      userId: 'user-1',
      accountId: 'account-1',
      strategyId: 'strategy-1',
      orderId: 'order-2',
      mode: 'FILLED_CORRECTION',
      tradeDateKst: '2026-07-01',
      direction: 'SELL',
      quantity: 1,
      price: 321,
      memo: undefined,
    })
  })

  it('refreshes strategy day orders and shows a batch success summary after correction', async () => {
    const user = userEvent.setup()
    const loadAccounts = vi.fn(async () => accounts.slice(0, 1))
    const loadStrategies = vi.fn(async () => strategies.slice(0, 1))
    const refreshedOrders: AdminStrategyOrder[] = [
      { ...orders[0], status: 'FILLED', filledQuantity: 5, filledPrice: 320.5 },
      { ...orders[1], filledPrice: 321 },
    ]
    const loadOrders = vi
      .fn<() => Promise<AdminStrategyOrder[]>>()
      .mockResolvedValueOnce(orders)
      .mockResolvedValueOnce(refreshedOrders)

    correctAdminOrderMock
      .mockResolvedValueOnce({
        userId: 'user-1',
        accountId: 'account-1',
        strategyId: 'strategy-1',
        orderId: 'order-1',
        mode: 'PLACED_REPLACE',
        originalStatus: 'PLACED',
        resultingStatus: 'FILLED',
        replacementExternalOrderId: 'ext-2',
        finalHoldings: 5,
        finalAvgPrice: 320.5,
        finalUsdDeposit: 850,
        strategyStatus: 'ACTIVE',
        cycleEnded: false,
        cycleEndDate: null,
      })
      .mockResolvedValueOnce({
        userId: 'user-1',
        accountId: 'account-1',
        strategyId: 'strategy-1',
        orderId: 'order-2',
        mode: 'FILLED_CORRECTION',
        originalStatus: 'FILLED',
        resultingStatus: 'FILLED',
        replacementExternalOrderId: null,
        finalHoldings: 5,
        finalAvgPrice: 320.5,
        finalUsdDeposit: 850,
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

    await selectStrategyDayTarget(user)
    await user.clear(screen.getByLabelText('order-1 보정 수량'))
    await user.type(screen.getByLabelText('order-1 보정 수량'), '5')
    await user.clear(screen.getByLabelText('order-1 보정 가격'))
    await user.type(screen.getByLabelText('order-1 보정 가격'), '320.5')
    await user.type(screen.getByLabelText('order-1 보정 메모'), '재체결 반영')
    await user.click(screen.getByRole('button', { name: '거래일 주문 2건 일괄 보정' }))

    await waitFor(() => expect(correctAdminOrderMock).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(loadOrders).toHaveBeenCalledTimes(2))
    await waitFor(() =>
      expect(loadOrders).toHaveBeenLastCalledWith('account-1', 'strategy-1', '2026-07-01'),
    )

    expect(screen.getByText('거래일 주문 보정이 완료되었습니다')).toBeInTheDocument()
    expect(screen.getByText('처리 2건 · 제외 0건')).toBeInTheDocument()
    expect(screen.getByText('order-1: PLACED -> FILLED / order-2: FILLED -> FILLED')).toBeInTheDocument()
  })

  it('clears the previous success summary when another trade date is selected', async () => {
    const user = userEvent.setup()
    const loadAccounts = vi.fn(async () => accounts.slice(0, 1))
    const loadStrategies = vi.fn(async () => strategies.slice(0, 1))
    const loadOrders = vi
      .fn<() => Promise<AdminStrategyOrder[]>>()
      .mockResolvedValueOnce(orders)
      .mockResolvedValueOnce([
        { ...orders[0], status: 'FILLED', filledQuantity: 5, filledPrice: 320.5 },
        orders[1],
      ])

    correctAdminOrderMock
      .mockResolvedValueOnce({
        userId: 'user-1',
        accountId: 'account-1',
        strategyId: 'strategy-1',
        orderId: 'order-1',
        mode: 'PLACED_REPLACE',
        originalStatus: 'PLACED',
        resultingStatus: 'FILLED',
        replacementExternalOrderId: 'ext-2',
        finalHoldings: 5,
        finalAvgPrice: 320.5,
        finalUsdDeposit: 850,
        strategyStatus: 'ACTIVE',
        cycleEnded: false,
        cycleEndDate: null,
      })
      .mockResolvedValueOnce({
        userId: 'user-1',
        accountId: 'account-1',
        strategyId: 'strategy-1',
        orderId: 'order-2',
        mode: 'FILLED_CORRECTION',
        originalStatus: 'FILLED',
        resultingStatus: 'FILLED',
        replacementExternalOrderId: null,
        finalHoldings: 5,
        finalAvgPrice: 320.5,
        finalUsdDeposit: 850,
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

    await selectStrategyDayTarget(user)
    await user.click(screen.getByRole('button', { name: '거래일 주문 2건 일괄 보정' }))

    await waitFor(() => expect(screen.getByText('거래일 주문 보정이 완료되었습니다')).toBeInTheDocument())

    await user.selectOptions(screen.getByRole('combobox', { name: '거래일 선택' }), '')

    expect(screen.queryByText('거래일 주문 보정이 완료되었습니다')).not.toBeInTheDocument()
  })

  it('supports user-broker-account-strategy-tradeDate selection and resets lower steps', async () => {
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
    const tradeDateSelect = screen.getByRole('combobox', { name: '거래일 선택' })

    expect(screen.getByRole('heading', { name: '거래일 보정 대상' })).toBeInTheDocument()
    expect(brokerSelect).toBeDisabled()
    expect(accountSelect).toBeDisabled()
    expect(strategySelect).toBeDisabled()
    expect(tradeDateSelect).toBeDisabled()

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

    await waitFor(() => expect(tradeDateSelect).not.toBeDisabled())
    expect(within(tradeDateSelect).getByRole('option', { name: '2026-07-01' })).toBeInTheDocument()

    await user.selectOptions(tradeDateSelect, '2026-07-01')

    await waitFor(() => expect(loadOrders).toHaveBeenCalledWith('account-1', 'strategy-1', '2026-07-01'))
    await waitFor(() => expect(screen.getByRole('button', { name: '거래일 주문 2건 일괄 보정' })).toBeInTheDocument())
    expect(screen.getByLabelText('order-1 보정 수량')).toBeInTheDocument()
    expect(screen.getByLabelText('order-2 보정 수량')).toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: '사용자 선택' }), 'user-2')

    await waitFor(() => expect(loadAccounts).toHaveBeenLastCalledWith('user-2'))
    expect(brokerSelect).toHaveValue('')
    expect(accountSelect).toHaveValue('')
    expect(strategySelect).toHaveValue('')
    expect(tradeDateSelect).toHaveValue('')
    expect(brokerSelect).not.toBeDisabled()
    expect(strategySelect).toBeDisabled()
    expect(tradeDateSelect).toBeDisabled()
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

  it.each([
    ['FAILED', failedOrder],
    ['CANCELLED', cancelledOrder],
  ])('shows read-only guidance for %s orders inside the batch form', async (_status, readOnlyOrder) => {
    const user = userEvent.setup()
    const loadAccounts = vi.fn(async () => accounts.slice(0, 1))
    const loadStrategies = vi.fn(async () => strategies.slice(0, 1))
    const loadOrders = vi.fn(async () => [orders[0], readOnlyOrder])

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

    await selectStrategyDayTarget(user)

    const readOnlyNotice = screen.getAllByText('취소/실패 상태 주문은 현재 일괄 보정 대상에서 제외됩니다.')[0]
    expect(readOnlyNotice).toBeInTheDocument()
    expect(screen.getByLabelText(`${readOnlyOrder.id} 보정 수량`)).toBeDisabled()
    expect(screen.getByRole('button', { name: '거래일 주문 1건 일괄 보정' })).toBeInTheDocument()
  })

  it('shows batch correction submit controls for partially filled orders', async () => {
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

    await selectStrategyDayTarget(user)

    expect(screen.getByRole('button', { name: '거래일 주문 1건 일괄 보정' })).toBeInTheDocument()
  })

  it('shows a visible error message when any batch correction request fails', async () => {
    const user = userEvent.setup()
    const loadAccounts = vi.fn(async () => accounts.slice(0, 1))
    const loadStrategies = vi.fn(async () => strategies.slice(0, 1))
    const loadOrders = vi.fn(async () => orders)

    correctAdminOrderMock.mockRejectedValue(new Error('correction failed'))

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

    await selectStrategyDayTarget(user)
    await user.click(screen.getByRole('button', { name: '거래일 주문 2건 일괄 보정' }))

    await waitFor(() =>
      expect(screen.getByText('주문 보정에 실패했습니다. 입력값과 주문 상태를 다시 확인하세요.')).toBeInTheDocument(),
    )
  })
})
