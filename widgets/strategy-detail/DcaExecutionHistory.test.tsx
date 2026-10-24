import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DcaRule } from '@entities/strategy'
import { DcaExecutionHistory } from './DcaExecutionHistory'

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }))

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }))
vi.mock('@entities/meta', async () => {
  const { testLabelOf } = await import('@entities/meta/__fixtures__/testMeta')
  return { useMeta: () => ({ labelOf: testLabelOf, findTicker: (c: string) => (c === 'BTC' ? { code: 'BTC', market: 'CRYPTO_KRW' } : undefined) }) }
})
vi.mock('@entities/strategy', async () => ({
  ...(await vi.importActual<typeof import('@entities/strategy')>('@entities/strategy')),
  useDcaExecutionsQuery: (...args: unknown[]) => queryMock(...args),
}))

const rule = { ruleKey: 'a', direction: 'BUY', frequency: 'DAILY', dayOfWeek: null, dayOfMonth: null, orderType: 'MOC', executionHour: null, sizing: { type: 'AMOUNT', amount: 15000, percent: null }, shortfall: 'PARTIAL', conditions: [], nextExecution: null, lastExecution: null } as DcaRule
const row = { ruleKey: 'a', direction: 'BUY', kstTradeDate: '2026-09-30', status: 'ORDERED', skipReason: null, detail: null, quantity: 3, order: null }

describe('DcaExecutionHistory', () => {
  beforeEach(() => queryMock.mockReset())

  it('1-based 페이지를 API 0-based로 매핑한다', () => {
    queryMock.mockReturnValue({
      data: { content: [row], page: 0, size: 20, totalElements: 45 }, isLoading: false, isError: false,
    })
    render(<DcaExecutionHistory strategyId="d1" ticker="UPRO" rules={[rule]} market="US_STOCK" />)
    expect(queryMock).toHaveBeenLastCalledWith('d1', 0, 20)

    fireEvent.click(screen.getByRole('button', { name: '2' }))
    expect(queryMock).toHaveBeenLastCalledWith('d1', 1, 20)
  })

  it('ORDERED 행에 referencePrice가 없으면 기준가 칸에 -를 표시한다', () => {
    queryMock.mockReturnValue({
      data: { content: [row], page: 0, size: 20, totalElements: 1 }, isLoading: false, isError: false,
    })
    render(<DcaExecutionHistory strategyId="d1" ticker="UPRO" rules={[rule]} market="US_STOCK" />)
    const cells = screen.getAllByRole('row')[1].querySelectorAll('td')
    expect(cells[4]).toHaveTextContent('-')
  })

  it('코인 행은 원화 가격과 소수 수량·코인 단위로 표시한다', () => {
    queryMock.mockReturnValue({
      data: { content: [{ ruleKey: 'a', direction: 'BUY', kstTradeDate: '2026-10-18', status: 'SKIPPED', skipReason: 'BELOW_MIN_ORDER_AMOUNT', detail: null, referencePrice: 145000000, quantity: 0.00034482, order: { id: 'o1', status: 'FILLED', filledPrice: 145100000 } }], page: 0, size: 20, totalElements: 1 },
      isLoading: false, isError: false,
    })
    render(<DcaExecutionHistory strategyId="d1" ticker="BTC" rules={[rule]} market="CRYPTO_KRW" />)
    expect(screen.getByText('145,000,000원')).toBeInTheDocument()
    expect(screen.getByText('0.00034482 BTC')).toBeInTheDocument()
    expect(screen.getByText(/145,100,000원/)).toBeInTheDocument()
  })

  it('바이낸스 행은 USDT 가격으로 표시한다', () => {
    queryMock.mockReturnValue({
      data: { content: [{ ruleKey: 'a', direction: 'BUY', kstTradeDate: '2026-10-18', status: 'ORDERED', skipReason: null, detail: null, referencePrice: 65000.5, quantity: 0.001, order: { id: 'o1', status: 'FILLED', filledPrice: 65010 } }], page: 0, size: 20, totalElements: 1 },
      isLoading: false, isError: false,
    })
    render(<DcaExecutionHistory strategyId="d1" ticker="BTC" rules={[rule]} market="CRYPTO_USDT" />)
    expect(screen.getByText('65,000.50 USDT')).toBeInTheDocument()
    expect(screen.getByText(/65,010.00 USDT/)).toBeInTheDocument()
    expect(screen.getByText('0.001 BTC')).toBeInTheDocument()
  })

  it('같은 날 규칙별 행을 모두 보여주고 삭제된 규칙은 방향 배지와 함께 표시한다', () => {
    const x = { ruleKey: 'x', direction: 'SELL', kstTradeDate: '2026-09-30', status: 'SKIPPED', skipReason: 'INSUFFICIENT_HOLDINGS', detail: null, order: null }
    queryMock.mockReturnValue({
      data: { content: [row, x], page: 0, size: 20, totalElements: 2 }, isLoading: false, isError: false,
    })
    render(<DcaExecutionHistory strategyId="d1" ticker="UPRO" rules={[rule]} market="US_STOCK" />)
    const rows = screen.getAllByRole('row')
    expect(rows).toHaveLength(3)
    expect(rows[1]).toHaveTextContent('매수 · 매일 · MOC(종가시장가) · $15,000.00')
    expect(rows[2]).toHaveTextContent('삭제된 규칙')
    expect(rows[2]).toHaveTextContent('매도')
    expect(rows[2]).toHaveTextContent('보유 수량 부족')
  })
})
