import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { AdminPrivacyBase } from '@entities/privacy'
import { AdminPrivacyBaseTable } from './AdminPrivacyBaseTable'

const base: AdminPrivacyBase = {
  id: 'base-1',
  tradeDate: '2026-07-02',
  ticker: 'NVDA',
  currentCycleStart: 1234.56,
  currentCycleRealizedPnl: 12.34,
  avgPrice: 98.76,
  holdings: 3,
  orders: [
    {
      id: 'order-1',
      direction: 'BUY',
      orderType: 'LOC',
      price: 100.25,
      quantity: 1,
    },
  ],
}

describe('AdminPrivacyBaseTable mobile spacing', () => {
  it('uses a narrower base width and cell padding on mobile', () => {
    render(<AdminPrivacyBaseTable bases={[base]} />)

    const table = screen.getAllByRole('table')[0]
    const dateHeader = screen.getByRole('columnheader', { name: '날짜' })
    const tickerCell = screen.getByText('NVDA').closest('td')

    expect(table).toHaveClass('min-w-[560px]')
    expect(table).toHaveClass('sm:min-w-[760px]')
    expect(dateHeader).toHaveClass('px-2.5')
    expect(dateHeader).toHaveClass('sm:px-4')
    expect(tickerCell).toHaveClass('px-2.5')
    expect(tickerCell).toHaveClass('sm:px-4')
  })
})
