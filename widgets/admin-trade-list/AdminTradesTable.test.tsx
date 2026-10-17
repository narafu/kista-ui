import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AdminTrade } from '@entities/admin'
import { AdminTradesTable } from './AdminTradesTable'

vi.mock('@entities/meta', () => ({
  useMeta: () => ({
    labelOf: (_g: string, code: string) => code,
    findTicker: (code: string) => (code === 'BTC' ? { code: 'BTC', market: 'CRYPTO_KRW' } : { code, market: 'US_STOCK' }),
  }),
}))

const trade = {
  id: 't1', userId: 'u1', accountId: 'a1', strategyId: 's1', ownerNickname: 'tester', strategyType: 'DCA', tradeDate: '2026-10-18',
  ticker: 'UPRO', direction: 'BUY', orderType: 'LOC', quantity: 3, price: 87.4, status: 'FILLED',
} as AdminTrade

describe('AdminTradesTable', () => {
  it('코인 체결은 소수 수량과 원화 가격으로 보여준다', () => {
    render(<AdminTradesTable trades={[{ ...trade, ticker: 'BTC', quantity: 0.0005, price: 145000000 }]} />)
    expect(screen.getByText('0.0005')).toBeInTheDocument()
    expect(screen.getByText('145,000,000원')).toBeInTheDocument()
  })
  it('주식 체결은 달러 가격으로 보여준다', () => {
    render(<AdminTradesTable trades={[trade]} />)
    expect(screen.getByText('$87.40')).toBeInTheDocument()
  })
})
