import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AdminTrade } from '@entities/user'
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
})
