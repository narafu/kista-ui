import { fireEvent, render, screen, within } from '@testing-library/react'
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

describe('AdminPrivacyBaseTable mobile UX', () => {
  it('renders a mobile card list instead of the scroll table on mobile', () => {
    render(<AdminPrivacyBaseTable bases={[base]} />)

    const mobileList = screen.getByTestId('admin-privacy-mobile-list')
    const desktopWrap = screen.getByTestId('admin-privacy-desktop-table-wrap')

    expect(mobileList).toHaveClass('sm:hidden')
    expect(desktopWrap).toHaveClass('hidden')
    expect(desktopWrap).toHaveClass('sm:block')
  })

  it('shows the important trade-base values in the mobile card', () => {
    render(<AdminPrivacyBaseTable bases={[base]} />)

    const mobileList = screen.getByTestId('admin-privacy-mobile-list')
    const metrics = within(mobileList)
      .getAllByText(/^(시작금액|실현손익|평단가|보유)$/)
      .map((node) => node.textContent)

    expect(within(mobileList).getByText('2026-07-02')).toBeInTheDocument()
    expect(within(mobileList).getByRole('heading', { name: 'NVDA' })).toBeInTheDocument()
    expect(metrics).toEqual(['시작금액', '실현손익', '평단가', '보유'])
    expect(within(mobileList).getByText('시작금액')).toBeInTheDocument()
    expect(within(mobileList).getByText('$1,234.56')).toBeInTheDocument()
    expect(within(mobileList).getByText('보유')).toBeInTheDocument()
    expect(within(mobileList).getByText('3')).toBeInTheDocument()
    expect(within(mobileList).getByText('평단가')).toBeInTheDocument()
    expect(within(mobileList).getByText('$98.76')).toBeInTheDocument()
    expect(within(mobileList).getByText('실현손익')).toBeInTheDocument()
    expect(within(mobileList).getByText('+12.34')).toBeInTheDocument()
    expect(within(mobileList).getByText('1건')).toBeInTheDocument()
  })

  it('expands the order details inside the mobile card', () => {
    render(<AdminPrivacyBaseTable bases={[base]} />)

    const mobileList = screen.getByTestId('admin-privacy-mobile-list')
    const toggle = within(mobileList).getByRole('button', { name: /2026-07-02 NVDA 매매표 펼치기/ })

    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(within(mobileList).getByText('LOC')).toBeInTheDocument()
    expect(within(mobileList).getByText('$100.25')).toBeInTheDocument()
  })
})

describe('AdminPrivacyBaseTable desktop table', () => {
  it('keeps the desktop table width and compact header label behavior', () => {
    render(<AdminPrivacyBaseTable bases={[base]} />)

    const table = screen.getByTestId('admin-privacy-desktop-table')
    const desktopTable = within(table)
    const startHeader = desktopTable.getByRole('columnheader', { name: /시작금액/ })
    const mobileLabel = desktopTable.getByText('시작금액')
    const desktopLabel = desktopTable.getByText('사이클 시작금액')

    expect(table).toHaveClass('sm:min-w-[760px]')
    expect(table).not.toHaveClass('min-w-[560px]')
    expect(startHeader).toContainElement(mobileLabel)
    expect(mobileLabel).toHaveClass('sm:hidden')
    expect(desktopLabel).toHaveClass('hidden')
    expect(desktopLabel).toHaveClass('sm:inline')
  })

  it('centers the desktop headers and cells', () => {
    render(<AdminPrivacyBaseTable bases={[base]} />)

    const table = screen.getByTestId('admin-privacy-desktop-table')
    const desktopTable = within(table)

    const dateHeader = desktopTable.getByRole('columnheader', { name: '날짜' })
    const tickerHeader = desktopTable.getByRole('columnheader', { name: '종목' })
    const startHeader = desktopTable.getByRole('columnheader', { name: /시작금액/ })
    const holdingsHeader = desktopTable.getByRole('columnheader', { name: '보유' })
    const avgHeader = desktopTable.getByRole('columnheader', { name: '평단가' })
    const realizedHeader = desktopTable.getByRole('columnheader', { name: '실현손익' })
    const ordersHeader = desktopTable.getByRole('columnheader', { name: '주문' })

    const dateCell = desktopTable.getByText('2026-07-02').closest('td')
    const tickerCell = desktopTable.getByText('NVDA').closest('td')
    const startCell = desktopTable.getByText('$1,234.56').closest('td')
    const holdingsCell = desktopTable.getByText('3').closest('td')
    const avgCell = desktopTable.getByText('$98.76').closest('td')
    const realizedCell = desktopTable.getByText('+12.34').closest('td')
    const ordersCell = desktopTable.getByText('1건').closest('td')

    expect(dateHeader).toHaveClass('text-center')
    expect(tickerHeader).toHaveClass('text-center')
    expect(startHeader).toHaveClass('text-center')
    expect(holdingsHeader).toHaveClass('text-center')
    expect(avgHeader).toHaveClass('text-center')
    expect(realizedHeader).toHaveClass('text-center')
    expect(ordersHeader).toHaveClass('text-center')

    expect(dateCell).toHaveClass('text-center')
    expect(tickerCell).toHaveClass('text-center')
    expect(startCell).toHaveClass('text-center')
    expect(holdingsCell).toHaveClass('text-center')
    expect(avgCell).toHaveClass('text-center')
    expect(realizedCell).toHaveClass('text-center')
    expect(ordersCell).toHaveClass('text-center')
  })
})
