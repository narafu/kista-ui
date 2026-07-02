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

  it('uses a compact header label for current cycle start on mobile', () => {
    render(<AdminPrivacyBaseTable bases={[base]} />)

    const startHeader = screen.getByRole('columnheader', { name: /시작금액/ })
    const mobileLabel = screen.getByText('시작금액')
    const desktopLabel = screen.getByText('사이클 시작금액')

    expect(startHeader).toContainElement(mobileLabel)
    expect(mobileLabel).toHaveClass('sm:hidden')
    expect(desktopLabel).toHaveClass('hidden')
    expect(desktopLabel).toHaveClass('sm:inline')
  })

  it('centers the four visible headers and cells across mobile and desktop', () => {
    render(<AdminPrivacyBaseTable bases={[base]} />)

    const dateHeader = screen.getByRole('columnheader', { name: '날짜' })
    const tickerHeader = screen.getByRole('columnheader', { name: '종목' })
    const startHeader = screen.getByRole('columnheader', { name: /시작금액/ })
    const holdingsHeader = screen.getByRole('columnheader', { name: '보유' })

    const dateCell = screen.getByText('2026-07-02').closest('td')
    const tickerCell = screen.getByText('NVDA').closest('td')
    const startCell = screen.getByText('$1,234.56').closest('td')
    const holdingsCell = screen.getByText('3').closest('td')

    expect(dateHeader).toHaveClass('text-center')
    expect(tickerHeader).toHaveClass('text-center')
    expect(startHeader).toHaveClass('text-center')
    expect(holdingsHeader).toHaveClass('text-center')
    expect(dateHeader).not.toHaveClass('sm:text-left')
    expect(tickerHeader).not.toHaveClass('sm:text-left')
    expect(startHeader).not.toHaveClass('sm:text-right')
    expect(holdingsHeader).not.toHaveClass('sm:text-right')

    expect(dateCell).toHaveClass('text-center')
    expect(tickerCell).toHaveClass('text-center')
    expect(startCell).toHaveClass('text-center')
    expect(holdingsCell).toHaveClass('text-center')
    expect(dateCell).not.toHaveClass('sm:text-left')
    expect(tickerCell).not.toHaveClass('sm:text-left')
    expect(startCell).not.toHaveClass('sm:text-right')
    expect(holdingsCell).not.toHaveClass('sm:text-right')

    expect(startHeader).not.toHaveClass('w-[6.5rem]')
    expect(startCell).not.toHaveClass('w-[6.5rem]')
  })

  it('centers desktop-only headers and cells too', () => {
    render(<AdminPrivacyBaseTable bases={[base]} />)

    const avgHeader = screen.getByRole('columnheader', { name: '평단가' })
    const realizedHeader = screen.getByRole('columnheader', { name: '실현손익' })
    const ordersHeader = screen.getByRole('columnheader', { name: '주문' })

    const avgCell = screen.getByText('$98.76').closest('td')
    const realizedCell = screen.getByText('+12.34').closest('td')
    const ordersCell = screen.getByText('1건').closest('td')

    expect(avgHeader).toHaveClass('text-center')
    expect(realizedHeader).toHaveClass('text-center')
    expect(ordersHeader).toHaveClass('text-center')
    expect(avgHeader).not.toHaveClass('text-right')
    expect(realizedHeader).not.toHaveClass('text-right')
    expect(ordersHeader).not.toHaveClass('text-right')

    expect(avgCell).toHaveClass('text-center')
    expect(realizedCell).toHaveClass('text-center')
    expect(ordersCell).toHaveClass('text-center')
    expect(avgCell).not.toHaveClass('text-right')
    expect(realizedCell).not.toHaveClass('text-right')
    expect(ordersCell).not.toHaveClass('text-right')
  })
})
