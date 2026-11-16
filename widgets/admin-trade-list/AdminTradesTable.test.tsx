import { act, render, renderHook, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AdminTrade } from '@entities/admin'
import { AdminTradesTable, useTradeSort } from './AdminTradesTable'

vi.mock('@entities/meta', () => ({
  useMeta: () => ({
    labelOf: (_g: string, code: string) => code,
  }),
}))

const trade = {
  id: 't1', userId: 'u1', accountId: 'a1', strategyId: 's1', ownerNickname: 'tester', strategyType: 'DCA', tradeDate: '2026-10-18',
  ticker: 'UPRO', direction: 'BUY', orderType: 'LOC', quantity: 3, price: 87.4, status: 'FILLED',
} as AdminTrade

const sort = { activeKey: 'default' as const, direction: 'desc' as const, onSort: () => {} }

describe('AdminTradesTable', () => {
  it('통화가 없거나 모르는 값이면 달러로 보여준다', () => {
    render(<AdminTradesTable trades={[{ ...trade, currency: null }, { ...trade, id: 't2', price: 10, currency: 'XXX' }]} sort={sort} />)
    expect(screen.getByText('$87.40')).toBeInTheDocument()
    expect(screen.getByText('$10.00')).toBeInTheDocument()
  })
  it('주식 체결은 달러 가격으로 보여준다', () => {
    render(<AdminTradesTable trades={[trade]} sort={sort} />)
    expect(screen.getByText('$87.40')).toBeInTheDocument()
  })
  it('가격 정렬은 첫 클릭 내림차순이고 재클릭하면 오름차순이다', () => {
    const trades = [{ ...trade, id: 'a', price: 5 }, { ...trade, id: 'b', price: 9 }, { ...trade, id: 'c', price: 1 }]
    const { result } = renderHook(() => useTradeSort(trades))
    expect(result.current.sorted.map((t) => t.id)).toEqual(['a', 'b', 'c'])
    act(() => result.current.sort.onSort('price'))
    expect(result.current.sorted.map((t) => t.id)).toEqual(['b', 'a', 'c'])
    act(() => result.current.sort.onSort('price'))
    expect(result.current.sorted.map((t) => t.id)).toEqual(['c', 'a', 'b'])
  })
})
