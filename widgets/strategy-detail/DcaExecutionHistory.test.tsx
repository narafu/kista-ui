import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DcaExecutionHistory } from './DcaExecutionHistory'

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }))

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }))
vi.mock('@entities/meta', () => ({ useMeta: () => ({ labelOf: (_g: string, v: string) => v, findTicker: (c: string) => (c === 'BTC' ? { code: 'BTC', market: 'CRYPTO_KRW' } : undefined) }) }))
vi.mock('@entities/strategy', async () => ({
  ...(await vi.importActual<typeof import('@entities/strategy')>('@entities/strategy')),
  useDcaExecutionsQuery: (...args: unknown[]) => queryMock(...args),
}))

const row = { kstTradeDate: '2026-09-30', status: 'ORDERED', skipReason: null, detail: null, quantity: 3, order: null }

describe('DcaExecutionHistory', () => {
  beforeEach(() => queryMock.mockReset())

  it('1-based 페이지를 API 0-based로 매핑한다', () => {
    queryMock.mockReturnValue({
      data: { content: [row], page: 0, size: 20, totalElements: 45 }, isLoading: false, isError: false,
    })
    render(<DcaExecutionHistory strategyId="d1" ticker="UPRO" />)
    expect(queryMock).toHaveBeenLastCalledWith('d1', 0, 20)

    fireEvent.click(screen.getByRole('button', { name: '2' }))
    expect(queryMock).toHaveBeenLastCalledWith('d1', 1, 20)
  })

  it('ORDERED 행에 referencePrice가 없으면 기준가 칸에 -를 표시한다', () => {
    queryMock.mockReturnValue({
      data: { content: [row], page: 0, size: 20, totalElements: 1 }, isLoading: false, isError: false,
    })
    render(<DcaExecutionHistory strategyId="d1" ticker="UPRO" />)
    const cells = screen.getAllByRole('row')[1].querySelectorAll('td')
    expect(cells[3]).toHaveTextContent('-')
  })

  it('코인 행은 원화 가격과 소수 수량·코인 단위로 표시한다', () => {
    queryMock.mockReturnValue({
      data: { content: [{ kstTradeDate: '2026-10-18', status: 'SKIPPED', skipReason: 'BELOW_MIN_ORDER_AMOUNT', detail: null, referencePrice: 145000000, quantity: 0.00034482, order: { id: 'o1', status: 'FILLED', filledPrice: 145100000 } }], page: 0, size: 20, totalElements: 1 },
      isLoading: false, isError: false,
    })
    render(<DcaExecutionHistory strategyId="d1" ticker="BTC" />)
    expect(screen.getByText('145,000,000원')).toBeInTheDocument()
    expect(screen.getByText('0.00034482 BTC')).toBeInTheDocument()
    expect(screen.getByText(/145,100,000원/)).toBeInTheDocument()
  })
})
