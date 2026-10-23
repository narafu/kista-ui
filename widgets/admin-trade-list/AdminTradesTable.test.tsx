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
    render(<AdminTradesTable trades={[{ ...trade, ticker: 'BTC', quantity: 0.0005, price: 145000000, currency: 'KRW' }]} />)
    expect(screen.getByText('0.0005')).toBeInTheDocument()
    expect(screen.getByText('145,000,000원')).toBeInTheDocument()
  })
  it('바이낸스 체결은 USDT 가격으로 보여준다', () => {
    render(<AdminTradesTable trades={[{ ...trade, ticker: 'BTC', quantity: 0.001, price: 65000.5, currency: 'USDT' }]} />)
    expect(screen.getByText('65,000.50 USDT')).toBeInTheDocument()
  })
  it('계좌를 못 찾아 통화가 없는 코인 체결은 단위 없이 숫자만 보여준다', () => {
    render(<AdminTradesTable trades={[{ ...trade, ticker: 'BTC', quantity: 0.0005, price: 145000000, currency: null }]} />)
    expect(screen.getByText('145,000,000')).toBeInTheDocument()
  })
  it('통화가 없거나 모르는 값이면 주식은 달러로 보여준다', () => {
    render(<AdminTradesTable trades={[{ ...trade, currency: null }, { ...trade, id: 't2', price: 10, currency: 'XXX' }]} />)
    expect(screen.getByText('$87.40')).toBeInTheDocument()
    expect(screen.getByText('$10.00')).toBeInTheDocument()
  })
  it('주식 체결은 달러 가격으로 보여준다', () => {
    render(<AdminTradesTable trades={[trade]} />)
    expect(screen.getByText('$87.40')).toBeInTheDocument()
  })
})
