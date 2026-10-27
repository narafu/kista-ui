import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { StrategyOrder } from '@entities/order'
import { StrategyOrderHistory } from './StrategyOrderHistory'

// 모바일 카드와 PC 표가 함께 렌더되므로 PC 표 영역으로 한정해 조회한다
const inTable = () => within(screen.getByRole('region', { name: '주문 내역' }))

vi.mock('@entities/meta', async () => {
  const { testMeta, testLabelOf } = await import('@entities/meta/__fixtures__/testMeta')
  return { useMeta: () => ({ meta: testMeta, labelOf: testLabelOf }) }
})

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

// 데스크탑(hidden lg:block)/모바일(lg:hidden) 필터가 동시에 DOM에 존재하므로 첫 번째 인스턴스를 사용한다
async function selectOption(label: string, option: string) {
  const user = userEvent.setup()
  await user.click(screen.getAllByLabelText(label)[0])
  await user.click(await screen.findByRole('option', { name: option }))
}

describe('StrategyOrderHistory filters', () => {
  it('상태 필터 기본값은 체결이다', async () => {
    render(<StrategyOrderHistory strategyId="strategy-1" />)

    expect(inTable().getByText('$120.00')).toBeInTheDocument()
    expect(inTable().queryByText('$100.00')).not.toBeInTheDocument()
  })

  it('모바일 카드는 주문가 다음에 수량을 표시하고 표는 주문가 열이 수량 열보다 앞선다', () => {
    render(<StrategyOrderHistory strategyId="strategy-1" />)

    const headers = inTable().getAllByRole('columnheader').map((h) => h.textContent)
    expect(headers.indexOf('주문가')).toBe(headers.indexOf('수량') - 1)
    expect(screen.getAllByText(/주문가/).some((el) => /주문가\s*\$120\.00\s*·\s*수량/.test(el.textContent ?? ''))).toBe(true)
  })

  // userEvent 연속 클릭 2회(Select 드롭다운 열기+옵션 선택 ×2) — 전체 스위트 동시 실행 시
  // CPU 경합으로 기본 5000ms를 넘기는 사례가 있어 여유를 둔다.
  it('전체 선택 시 모든 주문을 표시하고 방향 필터를 적용한다', async () => {
    render(<StrategyOrderHistory strategyId="strategy-1" />)

    await selectOption('상태', '전체')

    expect(inTable().getByText('$100.00')).toBeInTheDocument()
    expect(inTable().getByText('$110.00')).toBeInTheDocument()

    await selectOption('방향', '매수')

    expect(inTable().getByText('$100.00')).toBeInTheDocument()
    expect(inTable().queryByText('$110.00')).not.toBeInTheDocument()
  }, 15000)

  it.each([
    ['유형', 'LOC(종가지정가)', '$110.00', '$100.00'],
    ['상태', '체결', '$120.00', '$110.00'],
  ] as const)('%s 필터를 적용한다', async (label, option, visible, hidden) => {
    render(<StrategyOrderHistory strategyId="strategy-1" />)

    await selectOption('상태', '전체')
    await selectOption(label, option)

    expect(inTable().getByText(visible)).toBeInTheDocument()
    expect(inTable().queryByText(hidden)).not.toBeInTheDocument()
  })

  it('방향, 유형, 상태 필터를 AND 조건으로 결합한다', async () => {
    render(<StrategyOrderHistory strategyId="strategy-1" />)

    await selectOption('방향', '매도')
    await selectOption('유형', 'LOC(종가지정가)')
    await selectOption('상태', '접수')

    expect(inTable().getByText('$110.00')).toBeInTheDocument()
    expect(inTable().queryByText('$130.00')).not.toBeInTheDocument()
  })

  it('원본 주문은 있지만 필터 결과가 없으면 전용 빈 상태를 표시한다', async () => {
    render(<StrategyOrderHistory strategyId="strategy-1" />)

    await selectOption('상태', '전체')
    await selectOption('방향', '매수')
    await selectOption('유형', 'LOC(종가지정가)')

    expect(screen.getByText('조건에 맞는 주문이 없습니다.')).toBeInTheDocument()
    expect(screen.queryByText('주문 내역이 없습니다.')).not.toBeInTheDocument()
  })

  it('필터 변경 시 첫 페이지로 돌아간다', async () => {
    mockOrders(makeElevenOrders())
    const user = userEvent.setup()

    render(<StrategyOrderHistory strategyId="strategy-1" />)
    await selectOption('상태', '전체')
    await user.click(screen.getByText('2'))
    expect(inTable().getByText('$111.00')).toBeInTheDocument()

    await selectOption('방향', '매수')

    expect(inTable().getByText('$101.00')).toBeInTheDocument()
    expect(inTable().queryByText('$111.00')).not.toBeInTheDocument()
  })
})
