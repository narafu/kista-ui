import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { StrategyOrder } from '@entities/order'
import { StrategyOrderHistory } from './StrategyOrderHistory'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

const ORDERS: StrategyOrder[] = [
  { id: '1', tradeDate: '2026-07-29', direction: 'BUY', orderType: 'LIMIT', quantity: 1, price: '100', status: 'PLANNED', filledQuantity: null, filledPrice: null },
  { id: '2', tradeDate: '2026-07-29', direction: 'SELL', orderType: 'LOC', quantity: 2, price: '110', status: 'PLACED', filledQuantity: null, filledPrice: null },
  { id: '3', tradeDate: '2026-07-28', direction: 'BUY', orderType: 'MOC', quantity: 3, price: '120', status: 'FILLED', filledQuantity: 3, filledPrice: '119' },
  { id: '4', tradeDate: '2026-07-28', direction: 'SELL', orderType: 'LIMIT', quantity: 4, price: '130', status: 'FAILED', filledQuantity: null, filledPrice: null },
]

let currentOrders = ORDERS

const mockOrdersQuery = vi.fn(() => ({
  data: currentOrders,
  isLoading: false,
  isError: false,
  error: null,
}))

vi.mock('@entities/order', async () => {
  const actual = await vi.importActual<typeof import('@entities/order')>('@entities/order')
  return { ...actual, useStrategyOrdersQuery: () => mockOrdersQuery() }
})

afterEach(() => {
  currentOrders = ORDERS
  mockOrdersQuery.mockClear()
})

function mockOrders(orders: StrategyOrder[]) {
  currentOrders = orders
}

function makeElevenOrders(): StrategyOrder[] {
  return Array.from({ length: 11 }, (_, index) => ({
    id: String(index + 1),
    tradeDate: '2026-07-29',
    direction: index === 10 ? 'SELL' : 'BUY',
    orderType: 'LIMIT',
    quantity: 1,
    price: String(101 + index),
    status: 'PLANNED',
    filledQuantity: null,
    filledPrice: null,
  }))
}

async function selectOption(label: string, option: string) {
  const user = userEvent.setup()
  await user.click(screen.getByLabelText(label))
  await user.click(await screen.findByRole('option', { name: option }))
}

describe('StrategyOrderHistory filters', () => {
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

  it('필터 변경 시 첫 페이지로 돌아간다', async () => {
    mockOrders(makeElevenOrders())
    const user = userEvent.setup()

    render(<StrategyOrderHistory strategyId="strategy-1" />)
    await user.click(screen.getByText('2'))
    expect(screen.getByText('$111.00')).toBeInTheDocument()

    await selectOption('방향', '매수')

    expect(screen.getByText('$101.00')).toBeInTheDocument()
    expect(screen.queryByText('$111.00')).not.toBeInTheDocument()
  })
})
