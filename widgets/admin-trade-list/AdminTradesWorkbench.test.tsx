import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AdminAccount, AdminStrategy, AdminStrategyOrder, AdminTrade } from '@entities/user'
import { AdminTradesWorkbench } from './AdminTradesWorkbench'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

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
  },
  {
    id: 'account-2',
    userId: 'user-2',
    ownerNickname: '김영희',
    accountNoMasked: '987-65****',
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

describe('AdminTradesWorkbench', () => {
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
})
