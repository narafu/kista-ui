import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  listAdminAccounts,
  listAdminStrategies,
  listAdminStrategyOrders,
  updateAdminStrategyStatus,
  reorderAdminOrder,
  getReorderTimingAvailability,
} from '@entities/admin/api'
import type { AdminAccount, AdminStrategy, AdminStrategyOrder, AdminTrade } from '@entities/admin'
import { AdminTradesWorkbench } from './AdminTradesWorkbench'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

// 훅(entities/admin/hooks/useAdminQueries.ts)이 '../api'(=이 경로)를 직접 import해서 호출한다 —
// '@entities/admin'(index.ts 배럴) 자체를 mock하면 훅 내부에서 쓰는 실제 api 함수는 그대로 남아
// 실제 네트워크 호출을 시도한다. 훅이 실제로 참조하는 모듈 경로를 mock해야 한다.
vi.mock('@entities/admin/api', async () => {
  const actual = await vi.importActual<typeof import('@entities/admin/api')>('@entities/admin/api')

  return {
    ...actual,
    listAdminAccounts: vi.fn(),
    listAdminStrategies: vi.fn(),
    listAdminStrategyOrders: vi.fn(),
    updateAdminStrategyStatus: vi.fn(),
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

const listAdminAccountsMock = vi.mocked(listAdminAccounts)
const listAdminStrategiesMock = vi.mocked(listAdminStrategies)
const listAdminStrategyOrdersMock = vi.mocked(listAdminStrategyOrders)
const updateAdminStrategyStatusMock = vi.mocked(updateAdminStrategyStatus)
const reorderAdminOrderMock = vi.mocked(reorderAdminOrder)
const getReorderTimingAvailabilityMock = vi.mocked(getReorderTimingAvailability)

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function renderWorkbench(props: Partial<React.ComponentProps<typeof AdminTradesWorkbench>> = {}) {
  return render(
    <AdminTradesWorkbench initialTrades={trades} initialPage={1} initialSize={10} {...props} />,
    { wrapper: createWrapper() },
  )
}

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
    listAdminAccountsMock.mockReset().mockResolvedValue(accounts)
    listAdminStrategiesMock.mockReset().mockResolvedValue(strategies.slice(0, 1))
    listAdminStrategyOrdersMock.mockReset().mockResolvedValue(orders)
    updateAdminStrategyStatusMock.mockReset().mockResolvedValue(undefined)
    reorderAdminOrderMock.mockReset()
    getReorderTimingAvailabilityMock.mockReset().mockResolvedValue({
      atOpen: false,
      atClose: true,
      immediate: false,
    })
  })

  it('submits only changed orders with per-order timing', async () => {
    const user = userEvent.setup()

    reorderAdminOrderMock.mockResolvedValue({
      userId: 'user-1',
      accountId: 'account-1',
      strategyId: 'strategy-1',
      sourceOrderId: 'order-1',
      originalStatus: 'PLACED',
      resultingStatus: 'PLANNED',
      newOrderExternalId: null,
    })

    renderWorkbench()

    await selectStrategyTarget(user)
    await waitFor(() => expect(screen.getByLabelText('order-1 재주문 수량')).toBeInTheDocument())

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
      tradeDate: '2026-07-03',
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
      tradeDate: '2026-07-03',
      direction: 'SELL',
      quantity: 1,
      price: 321,
      memo: undefined,
    })
  })

  it('refreshes orders and shows batch success summary after reorder', async () => {
    const user = userEvent.setup()
    const refreshedOrders: AdminStrategyOrder[] = [
      { ...orders[0], status: 'PLANNED' },
      { ...orders[1], status: 'PLANNED' },
    ]
    listAdminStrategyOrdersMock.mockReset()
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

    renderWorkbench()

    await selectStrategyTarget(user)
    await waitFor(() => expect(screen.getByLabelText('order-1 재주문 수량')).toBeInTheDocument())
    // order-1만 변경
    await user.clear(screen.getByLabelText('order-1 재주문 수량'))
    await user.type(screen.getByLabelText('order-1 재주문 수량'), '5')
    await user.clear(screen.getByLabelText('order-1 재주문 가격'))
    await user.type(screen.getByLabelText('order-1 재주문 가격'), '320.5')
    await user.type(screen.getByLabelText('order-1 메모'), '재주문 반영')
    await user.click(screen.getByRole('button', { name: '변경한 주문 1건 재주문' }))

    await waitFor(() => expect(reorderAdminOrderMock).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(listAdminStrategyOrdersMock).toHaveBeenCalledTimes(2))
    await waitFor(() =>
      expect(listAdminStrategyOrdersMock).toHaveBeenLastCalledWith('account-1', 'strategy-1', '2026-07-03'),
    )

    expect(screen.getByText('거래일 재주문이 완료되었습니다')).toBeInTheDocument()
    expect(screen.getByText('처리 1건 · 제외 1건')).toBeInTheDocument()
  })

  it('clears the previous success summary when strategy selection changes', async () => {
    const user = userEvent.setup()
    listAdminStrategiesMock.mockReset().mockResolvedValue(strategies)
    listAdminStrategyOrdersMock.mockReset()
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

    renderWorkbench()

    await selectStrategyTarget(user)
    await waitFor(() => expect(screen.getByLabelText('order-1 재주문 수량')).toBeInTheDocument())
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
    listAdminAccountsMock.mockReset().mockImplementation(async () => accounts)

    renderWorkbench()

    const brokerSelect = screen.getByRole('combobox', { name: '증권사 선택' })
    const accountSelect = screen.getByRole('combobox', { name: '계좌 선택' })
    const strategySelect = screen.getByRole('combobox', { name: '전략 선택' })

    expect(screen.getByRole('heading', { name: '거래일 재주문 대상' })).toBeInTheDocument()
    expect(brokerSelect).toBeDisabled()
    expect(accountSelect).toBeDisabled()
    expect(strategySelect).toBeDisabled()

    await user.selectOptions(screen.getByRole('combobox', { name: '사용자 선택' }), 'user-1')

    await waitFor(() => expect(listAdminAccountsMock).toHaveBeenCalled())
    await waitFor(() => expect(brokerSelect).not.toBeDisabled())
    expect(within(brokerSelect).getByRole('option', { name: '한국투자증권' })).toBeInTheDocument()

    await user.selectOptions(brokerSelect, 'KIS')

    await waitFor(() => expect(accountSelect).not.toBeDisabled())
    expect(within(accountSelect).getByRole('option', { name: '123-45****' })).toBeInTheDocument()

    await user.selectOptions(accountSelect, 'account-1')

    await waitFor(() => expect(listAdminStrategiesMock).toHaveBeenCalledWith('account-1'))
    await waitFor(() => expect(strategySelect).not.toBeDisabled())
    expect(within(strategySelect).getByRole('option', { name: 'INFINITE · TSLA' })).toBeInTheDocument()

    await user.selectOptions(strategySelect, 'strategy-1')

    await waitFor(() => expect(listAdminStrategyOrdersMock).toHaveBeenCalledWith('account-1', 'strategy-1', '2026-07-03'))
    await waitFor(() => expect(screen.getByLabelText('order-1 재주문 수량')).toBeInTheDocument())
    expect(screen.getByLabelText('order-2 재주문 수량')).toBeInTheDocument()

    // 사용자 재선택 시 하위 단계 초기화
    await user.selectOptions(screen.getByRole('combobox', { name: '사용자 선택' }), 'user-2')

    await waitFor(() => expect(brokerSelect).toHaveValue(''))
    expect(accountSelect).toHaveValue('')
    expect(strategySelect).toHaveValue('')
    expect(brokerSelect).not.toBeDisabled()
    expect(strategySelect).toBeDisabled()
  })

  it('toggles selected strategy status and refreshes the strategy list', async () => {
    const user = userEvent.setup()
    listAdminStrategiesMock.mockReset()
      .mockResolvedValueOnce(strategies.slice(0, 1))
      .mockResolvedValueOnce([{ ...strategies[0], status: 'PAUSED' }])

    renderWorkbench()

    await selectBrokeredOrderTarget(user)
    await user.selectOptions(await screen.findByRole('combobox', { name: '전략 선택' }), 'strategy-1')

    await waitFor(() => expect(screen.getByText('현재 전략 상태: ACTIVE')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: '전략 중지' }))

    await waitFor(() => expect(updateAdminStrategyStatusMock).toHaveBeenCalledWith('account-1', 'strategy-1', 'PAUSED'))
    await waitFor(() => expect(listAdminStrategiesMock).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.getByText('현재 전략 상태: PAUSED')).toBeInTheDocument())
    expect(screen.getByRole('combobox', { name: '전략 선택' })).toHaveValue('strategy-1')
    expect(screen.getByRole('button', { name: '전략 재개' })).toBeInTheDocument()
  })

  it('shows a visible error message when strategy status toggle fails', async () => {
    const user = userEvent.setup()
    updateAdminStrategyStatusMock.mockReset().mockRejectedValue(new Error('toggle failed'))

    renderWorkbench()

    await selectBrokeredOrderTarget(user)
    await user.selectOptions(await screen.findByRole('combobox', { name: '전략 선택' }), 'strategy-1')
    await user.click(screen.getByRole('button', { name: '전략 중지' }))

    await waitFor(() =>
      expect(screen.getByText('전략 상태 변경에 실패했습니다. 잠시 후 다시 시도하세요.')).toBeInTheDocument(),
    )
  })

  it('filters the table rows as the selection changes', async () => {
    const user = userEvent.setup()

    renderWorkbench()

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
    listAdminAccountsMock.mockReset().mockRejectedValue(new Error('accounts failed'))

    renderWorkbench()

    await user.selectOptions(screen.getByRole('combobox', { name: '사용자 선택' }), 'user-1')

    const errorSection = await screen.findByLabelText('재주문 오류')
    expect(errorSection).toHaveClass('dark:bg-rose-900/40')
    expect(errorSection).toHaveClass('dark:text-rose-100')
  })

  it('retries the accounts query when a different user is selected after a failed load', async () => {
    // accountsQuery는 userId 무관 공용 키를 쓴다 — 실패 후 다른 사용자를 골랐을 때 자동으로
    // 재조회되지 않으면(같은 키, enabled 유지) 오류 배너가 세션 내내 고정되는 회귀가 있었다.
    const user = userEvent.setup()
    listAdminAccountsMock.mockReset().mockRejectedValueOnce(new Error('accounts failed')).mockResolvedValue(accounts)

    renderWorkbench()

    await user.selectOptions(screen.getByRole('combobox', { name: '사용자 선택' }), 'user-1')
    await screen.findByLabelText('재주문 오류')

    await user.selectOptions(screen.getByRole('combobox', { name: '사용자 선택' }), 'user-2')

    await waitFor(() => expect(screen.queryByLabelText('재주문 오류')).not.toBeInTheDocument())
    await waitFor(() => expect(screen.getByRole('combobox', { name: '증권사 선택' })).not.toBeDisabled())
  })

  it.each([
    ['FAILED', failedOrder],
    ['CANCELLED', cancelledOrder],
  ])('shows reorder form controls for %s orders (all statuses reorderable)', async (_status, order) => {
    const user = userEvent.setup()
    listAdminStrategyOrdersMock.mockReset().mockResolvedValue([order])

    renderWorkbench()

    await selectStrategyTarget(user)

    // FAILED/CANCELLED 주문도 재주문 가능 — 수량 입력 활성화
    await waitFor(() => expect(screen.getByLabelText(`${order.id} 재주문 수량`)).not.toBeDisabled())
    // 변경 전 — 버튼 비활성
    expect(screen.getByRole('button', { name: '변경한 주문 0건 재주문' })).toBeDisabled()
  })

  it('shows batch reorder submit controls for partially filled orders', async () => {
    const user = userEvent.setup()
    listAdminStrategyOrdersMock.mockReset().mockResolvedValue([partiallyFilledOrder])

    renderWorkbench()

    await selectStrategyTarget(user)

    await waitFor(() => expect(screen.getByLabelText(`${partiallyFilledOrder.id} 재주문 수량`)).not.toBeDisabled())
    expect(screen.getByRole('button', { name: '변경한 주문 0건 재주문' })).toBeDisabled()
  })

  it('shows a visible error message when any batch reorder request fails', async () => {
    const user = userEvent.setup()
    reorderAdminOrderMock.mockReset().mockRejectedValue(new Error('reorder failed'))

    renderWorkbench()

    await selectStrategyTarget(user)
    await waitFor(() => expect(screen.getByLabelText('order-1 재주문 수량')).toBeInTheDocument())
    // 값 변경 후 재주문
    await user.clear(screen.getByLabelText('order-1 재주문 수량'))
    await user.type(screen.getByLabelText('order-1 재주문 수량'), '5')
    await user.click(screen.getByRole('button', { name: '변경한 주문 1건 재주문' }))

    await waitFor(() =>
      expect(screen.getByText('재주문에 실패했습니다. 입력값과 주문 상태를 다시 확인하세요.')).toBeInTheDocument(),
    )
  })
})
