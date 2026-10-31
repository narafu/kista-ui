import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DcaRule } from '@entities/strategy'
import { testLabelOf } from '@entities/meta/__fixtures__/testMeta'
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

const table = () => within(screen.getByRole('region', { name: '회차별 실행 이력' }))

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
    const cells = table().getAllByRole('row')[1].querySelectorAll('td')
    expect(cells[6]).toHaveTextContent('-')
  })

  it('코인 행은 원화 가격과 소수 수량·코인 단위로 표시한다', () => {
    queryMock.mockReturnValue({
      data: { content: [{ ruleKey: 'a', direction: 'BUY', kstTradeDate: '2026-10-18', status: 'SKIPPED', skipReason: 'BELOW_MIN_ORDER_AMOUNT', detail: null, referencePrice: 145000000, quantity: 0.00034482, order: { id: 'o1', status: 'FILLED', filledPrice: 145100000 } }], page: 0, size: 20, totalElements: 1 },
      isLoading: false, isError: false,
    })
    render(<DcaExecutionHistory strategyId="d1" ticker="BTC" rules={[rule]} market="CRYPTO_KRW" />)
    expect(table().getByText('145,000,000원')).toBeInTheDocument()
    expect(table().getByText('0.00034482 BTC')).toBeInTheDocument()
    expect(table().getByText(/145,100,000원/)).toBeInTheDocument()
  })

  it('바이낸스 행은 USDT 가격으로 표시한다', () => {
    queryMock.mockReturnValue({
      data: { content: [{ ruleKey: 'a', direction: 'BUY', kstTradeDate: '2026-10-18', status: 'ORDERED', skipReason: null, detail: null, referencePrice: 65000.5, quantity: 0.001, order: { id: 'o1', status: 'FILLED', filledPrice: 65010 } }], page: 0, size: 20, totalElements: 1 },
      isLoading: false, isError: false,
    })
    render(<DcaExecutionHistory strategyId="d1" ticker="BTC" rules={[rule]} market="CRYPTO_USDT" />)
    expect(table().getByText('65,000.50 USDT')).toBeInTheDocument()
    expect(table().getByText(/65,010.00 USDT/)).toBeInTheDocument()
    expect(table().getByText('0.001 BTC')).toBeInTheDocument()
  })

  it('같은 날 규칙별 행을 모두 보여주고 삭제된 규칙은 방향 배지와 함께 표시한다', () => {
    const x = { ruleKey: 'x', direction: 'SELL', kstTradeDate: '2026-09-30', status: 'SKIPPED', skipReason: 'INSUFFICIENT_HOLDINGS', detail: null, order: null }
    queryMock.mockReturnValue({
      data: { content: [row, x], page: 0, size: 20, totalElements: 2 }, isLoading: false, isError: false,
    })
    render(<DcaExecutionHistory strategyId="d1" ticker="UPRO" rules={[rule]} market="US_STOCK" />)
    const rows = table().getAllByRole('row')
    expect(rows).toHaveLength(3)
    expect([...rows[1].querySelectorAll('td')].slice(1, 4).map((c) => c.textContent)).toEqual(['매수', '매일', '-'])
    expect(rows[2]).toHaveTextContent('삭제된 규칙')
    expect(rows[2]).toHaveTextContent('매도')
    expect(rows[2]).toHaveTextContent('보유 수량 부족')
  })

  it('모바일 카드에 날짜 그룹·규칙·결과·기준가·수량·체결·사유를 표시한다', () => {
    queryMock.mockReturnValue({
      data: { content: [{ ruleKey: 'a', direction: 'BUY', kstTradeDate: '2026-10-18', status: 'SKIPPED', skipReason: 'BELOW_MIN_ORDER_AMOUNT', detail: null, referencePrice: 145000000, quantity: 0.00034482, order: { id: 'o1', status: 'FILLED', filledPrice: 145100000 } }], page: 0, size: 20, totalElements: 1 },
      isLoading: false, isError: false,
    })
    const { container } = render(<DcaExecutionHistory strategyId="d1" ticker="BTC" rules={[rule]} market="CRYPTO_KRW" />)
    const card = within(container.querySelector('.lg\\:hidden') as HTMLElement)
    expect(card.getByText('145,000,000원')).toBeInTheDocument()
    expect(card.getByText('0.00034482 BTC')).toBeInTheDocument()
    expect(card.getByText('145,100,000원')).toBeInTheDocument() // 체결가 칸은 상태 라벨 없이 가격만
    expect(card.getByText('매일')).toBeInTheDocument() // 금액 요약 없이 주기만
    expect(card.queryByText('-')).not.toBeInTheDocument() // 조건 없으면 줄 생략
    expect(card.getByText(testLabelOf('dcaSkipReasons', 'BELOW_MIN_ORDER_AMOUNT'))).toBeInTheDocument()
  })
  it('모바일 카드: 조건이 있으면 조건 줄, 체결가가 없으면 주문 상태, 주문이 없으면 -', () => {
    const withCondition = { ...rule, conditions: [{ indicator: 'RSI', operator: 'LTE', threshold: 30 }] } as DcaRule
    queryMock.mockReturnValue({
      data: { content: [
        { ruleKey: 'a', direction: 'BUY', kstTradeDate: '2026-10-18', status: 'ORDERED', skipReason: null, detail: null, referencePrice: 100, quantity: 1, order: { id: 'o1', status: 'SUBMITTED' } },
        { ruleKey: 'gone', direction: 'SELL', kstTradeDate: '2026-10-17', status: 'SKIPPED', skipReason: null, detail: null, referencePrice: 100, quantity: null, order: null },
      ], page: 0, size: 20, totalElements: 2 },
      isLoading: false, isError: false,
    })
    const { container } = render(<DcaExecutionHistory strategyId="d1" ticker="BTC" rules={[withCondition]} market="CRYPTO_KRW" />)
    const [ordered, skipped] = [...(container.querySelector('.lg\\:hidden') as HTMLElement).querySelectorAll('dl')].map((dl) => dl.parentElement!)
    expect(within(ordered).getByText(/RSI\(14\) 30/)).toBeInTheDocument()
    expect(within(ordered).getByText('체결가').nextElementSibling).toHaveTextContent(testLabelOf('orderStatuses', 'SUBMITTED'))
    expect(within(skipped).getByText('체결가').nextElementSibling).toHaveTextContent('-')
  })
})
