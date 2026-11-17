import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OrderRows } from './OrderRows'

vi.mock('@entities/meta', async () => {
  const { testLabelOf } = await import('@entities/meta/__fixtures__/testMeta')
  return { useMeta: () => ({ labelOf: testLabelOf }) }
})

describe('OrderRows', () => {
  it('shows cancel buttons for both planned and placed orders', () => {
    const onCancelOne = vi.fn()

    render(
      <OrderRows
        orders={[
          { id: 'order-1', ticker: 'TSLA', direction: 'SELL', orderType: 'LOC', quantity: 1, price: '250', status: 'PLANNED' },
          { id: 'order-2', ticker: 'TSLA', direction: 'SELL', orderType: 'LOC', quantity: 1, price: '255', status: 'PLACED' },
        ]}
        onCancelOne={onCancelOne}
        cancelPending={false}
      />,
    )

    expect(screen.getAllByRole('button', { name: '취소' })).toHaveLength(4)
  })

  it('shows timing only for LIMIT·LIMIT_VWAP orders not submitted at open', () => {
    render(
      <OrderRows
        orders={[
          { ticker: 'SOXL', direction: 'SELL', orderType: 'LIMIT', timing: 'AT_OPEN', quantity: 1, price: '30' },
          { ticker: 'SOXL', direction: 'BUY', orderType: 'LOC', timing: 'AT_CLOSE', quantity: 1, price: '28' },
          { ticker: 'SOXL', direction: 'SELL', orderType: 'LOC', timing: 'AT_CLOSE', quantity: 1, price: '31' },
          { ticker: 'SOXL', direction: 'BUY', orderType: 'LIMIT', timing: 'AT_CLOSE', quantity: 1, price: '27' },
          { ticker: 'SOXL', direction: 'SELL', orderType: 'LIMIT_VWAP', timing: 'AT_CLOSE', quantity: 1, price: '32' },
        ]}
      />,
    )

    // 모바일 리스트·PC 표 두 벌 — 마감 접수 LIMIT·LIMIT_VWAP(PRIVACY) 두 건만 표시
    expect(screen.getAllByText('장마감 30분 전 접수')).toHaveLength(4)
    expect(screen.queryByText('개장 선접수')).toBeNull()
  })

  it('shows "-" instead of $0.00 for market orders (MOC·MOO)', () => {
    render(
      <OrderRows
        orders={[
          { ticker: 'TQQQ', direction: 'SELL', orderType: 'MOC', quantity: 1, price: '0' },
          { ticker: 'TQQQ', direction: 'BUY', orderType: 'MOO', quantity: 1, price: '0' },
          { ticker: 'TQQQ', direction: 'BUY', orderType: 'LOC', quantity: 1, price: '50' },
        ]}
      />,
    )

    // 모바일 리스트·PC 표 두 벌
    expect(screen.queryByText('$0.00')).toBeNull()
    expect(screen.getAllByText('-')).toHaveLength(4)
    expect(screen.getAllByText('$50.00')).toHaveLength(2)
  })

  it('sorts by price when the header is clicked, keeping other rows intact', async () => {
    render(
      <OrderRows
        orders={[
          { id: 'a', ticker: 'AAA', direction: 'BUY', orderType: 'LOC', quantity: 1, price: '10' },
          { id: 'b', ticker: 'BBB', direction: 'BUY', orderType: 'LOC', quantity: 1, price: '30' },
          { id: 'c', ticker: 'CCC', direction: 'BUY', orderType: 'LOC', quantity: 1, price: '20' },
        ]}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: '주문가' })) // desc로 시작
    const tickers = () => within(screen.getByRole('table')).getAllByRole('row').slice(1).map((r) => r.children[2].textContent)
    expect(tickers()).toEqual(['BBB', 'CCC', 'AAA'])
  })
})
