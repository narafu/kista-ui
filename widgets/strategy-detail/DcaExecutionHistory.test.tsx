import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DcaRule } from '@entities/strategy'
import { testLabelOf } from '@entities/meta/__fixtures__/testMeta'
import { DcaExecutionHistory } from './DcaExecutionHistory'

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }))

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), useSearchParams: () => new URLSearchParams() }))
vi.mock('@entities/meta', async () => {
  const { testLabelOf, testMeta } = await import('@entities/meta/__fixtures__/testMeta')
  return { useMeta: () => ({ meta: testMeta, labelOf: testLabelOf, findTicker: (c: string) => (c === 'BTC' ? { code: 'BTC', market: 'CRYPTO_KRW' } : undefined) }) }
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
    expect(queryMock).toHaveBeenLastCalledWith('d1', 0, 10, expect.any(Object), { enabled: true })

    fireEvent.click(screen.getByRole('button', { name: '2' }))
    expect(queryMock).toHaveBeenLastCalledWith('d1', 1, 10, expect.any(Object), { enabled: true })
  })

  it('PC 표는 결과·기준가 열 없이 수량·체결 뒤 맨 오른쪽에 사유를 둔다', () => {
    queryMock.mockReturnValue({
      data: { content: [row], page: 0, size: 20, totalElements: 1 }, isLoading: false, isError: false,
    })
    render(<DcaExecutionHistory strategyId="d1" ticker="UPRO" rules={[rule]} market="US_STOCK" />)
    const heads = table().getAllByRole('columnheader').map((h) => h.textContent)
    expect(heads).toEqual(['방향', '주기', '규칙', '수량', '체결', '사유'])
  })

  it('코인 행은 원화 가격과 소수 수량·코인 단위로 표시한다', () => {
    queryMock.mockReturnValue({
      data: { content: [{ ruleKey: 'a', direction: 'BUY', kstTradeDate: '2026-10-18', status: 'SKIPPED', skipReason: 'BELOW_MIN_ORDER_AMOUNT', detail: null, referencePrice: 145000000, quantity: 0.00034482, order: { id: 'o1', status: 'FILLED', filledPrice: 145100000 } }], page: 0, size: 20, totalElements: 1 },
      isLoading: false, isError: false,
    })
    render(<DcaExecutionHistory strategyId="d1" ticker="BTC" rules={[rule]} market="CRYPTO_KRW" />)
    expect(table().getByText('0.00034482 BTC')).toBeInTheDocument()
    expect(table().getByText('145,100,000원')).toBeInTheDocument() // 체결 칸은 상태 라벨 없이 가격만
  })

  it('바이낸스 행은 USDT 가격으로 표시한다', () => {
    queryMock.mockReturnValue({
      data: { content: [{ ruleKey: 'a', direction: 'BUY', kstTradeDate: '2026-10-18', status: 'ORDERED', skipReason: null, detail: null, referencePrice: 65000.5, quantity: 0.001, order: { id: 'o1', status: 'FILLED', filledPrice: 65010 } }], page: 0, size: 20, totalElements: 1 },
      isLoading: false, isError: false,
    })
    render(<DcaExecutionHistory strategyId="d1" ticker="BTC" rules={[rule]} market="CRYPTO_USDT" />)
    expect(table().getByText('65,010.00 USDT')).toBeInTheDocument()
    expect(table().getByText('0.001 BTC')).toBeInTheDocument()
  })

  it('같은 날 규칙별 행을 모두 보여주고 삭제된 규칙은 방향 배지와 함께 표시한다', () => {
    const x = { ruleKey: 'x', direction: 'SELL', kstTradeDate: '2026-09-30', status: 'SKIPPED', skipReason: 'INSUFFICIENT_HOLDINGS', detail: null, order: null }
    queryMock.mockReturnValue({
      data: { content: [row, x], page: 0, size: 20, totalElements: 2 }, isLoading: false, isError: false,
    })
    render(<DcaExecutionHistory strategyId="d1" ticker="UPRO" rules={[rule]} market="US_STOCK" />)
    const rows = table().getAllByRole('row').filter((tr) => tr.querySelector('td')) // 날짜 소제목 행 제외
    expect(rows).toHaveLength(2)
    expect([...rows[0].querySelectorAll('td')].slice(0, 3).map((c) => c.textContent)).toEqual(['매수', '매일', '-'])
    expect(rows[1]).toHaveTextContent('삭제된 규칙')
    expect(rows[1]).toHaveTextContent('매도')
    expect(rows[1]).toHaveTextContent('보유 수량 부족')
  })

  it('같은 날 행은 규칙 카드 순서로, 삭제된 규칙은 그날 맨 뒤로 표시하고 날짜 내림차순은 유지한다', () => {
    const ruleB = { ...rule, ruleKey: 'b', direction: 'SELL' } as DcaRule
    const at = (ruleKey: string, kstTradeDate: string) => ({ ...row, ruleKey, kstTradeDate, direction: ruleKey === 'b' ? 'SELL' : 'BUY' })
    queryMock.mockReturnValue({
      // API 순서: 같은 날 기록 역순(gone → b → a)
      data: { content: [at('gone', '2026-10-01'), at('b', '2026-10-01'), at('a', '2026-10-01'), at('b', '2026-09-30'), at('a', '2026-09-30')], page: 0, size: 20, totalElements: 5 },
      isLoading: false, isError: false,
    })
    render(<DcaExecutionHistory strategyId="d1" ticker="UPRO" rules={[rule, ruleB]} market="US_STOCK" />)
    const order = table().getAllByRole('row').filter((tr) => tr.querySelector('td')).map((r) => (r.textContent?.includes('삭제된 규칙') ? '삭제' : r.querySelectorAll('td')[0].textContent))
    expect(order).toEqual(['매수', '매도', '삭제', '매수', '매도'])
    // 같은 거래일은 소제목 한 줄로 묶인다 — 10-01, 09-30 두 그룹
    expect(table().getAllByRole('row').filter((tr) => tr.querySelector('th[scope="rowgroup"]'))).toHaveLength(2)
  })

  it('모바일 카드에 날짜 그룹·규칙·결과·수량·체결가·사유를 표시한다', () => {
    queryMock.mockReturnValue({
      data: { content: [{ ruleKey: 'a', direction: 'BUY', kstTradeDate: '2026-10-18', status: 'SKIPPED', skipReason: 'BELOW_MIN_ORDER_AMOUNT', detail: null, referencePrice: 145000000, quantity: 0.00034482, order: { id: 'o1', status: 'FILLED', filledPrice: 145100000 } }], page: 0, size: 20, totalElements: 1 },
      isLoading: false, isError: false,
    })
    const { container } = render(<DcaExecutionHistory strategyId="d1" ticker="BTC" rules={[rule]} market="CRYPTO_KRW" />)
    const card = within(container.querySelector('.p-4.lg\\:hidden') as HTMLElement)
    expect(card.queryByText('145,000,000원')).not.toBeInTheDocument() // 기준가는 표시하지 않는다
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
    const [ordered, skipped] = [...(container.querySelector('.p-4.lg\\:hidden') as HTMLElement).querySelectorAll('dl')].map((dl) => dl.parentElement!)
    expect(within(ordered).getByText(/RSI\(14\) 30/)).toBeInTheDocument()
    expect(within(ordered).getByText('체결가').nextElementSibling).toHaveTextContent(testLabelOf('orderStatuses', 'SUBMITTED'))
    expect(within(skipped).getByText('체결가').nextElementSibling).toHaveTextContent('-')
  })

  it('방향·규칙 필터 선택을 훅 인자에 반영하고 페이지를 1로 되돌린다', async () => {
    queryMock.mockReturnValue({ data: { content: [row], page: 0, size: 10, totalElements: 45 }, isLoading: false, isError: false })
    render(<DcaExecutionHistory strategyId="d1" ticker="UPRO" rules={[rule]} market="US_STOCK" />)
    fireEvent.click(screen.getByRole('button', { name: '2' }))
    await selectOption('방향', '매도')
    await waitFor(() => expect(queryMock).toHaveBeenLastCalledWith('d1', 0, 10, expect.objectContaining({ direction: 'SELL', ruleKey: undefined }), { enabled: true }))
    await selectOption('규칙', '매일')
    await waitFor(() => expect(queryMock).toHaveBeenLastCalledWith('d1', 0, 10, expect.objectContaining({ direction: 'SELL', ruleKey: 'a' }), { enabled: true }))
  }, 15000)

  it('필터 적용 중 빈 결과는 조건 문구, 기본(전체)은 기존 문구를 보여 준다', async () => {
    queryMock.mockReturnValue({ data: { content: [], page: 0, size: 10, totalElements: 0 }, isLoading: false, isError: false })
    render(<DcaExecutionHistory strategyId="d1" ticker="UPRO" rules={[rule]} market="US_STOCK" />)
    expect(screen.getByText('아직 실행된 회차가 없습니다.')).toBeInTheDocument() // 기본 기간은 전체
    fireEvent.click(screen.getByRole('button', { name: '7일' }))
    expect(screen.getByText('조건에 맞는 실행 이력이 없습니다.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '전체' }))
    expect(screen.getByText('아직 실행된 회차가 없습니다.')).toBeInTheDocument()
    await selectOption('방향', '매수')
    expect(screen.getByText('조건에 맞는 실행 이력이 없습니다.')).toBeInTheDocument()
  }, 15000)
})

// 모바일·PC 필터가 함께 DOM에 있어 첫 인스턴스를 쓴다
async function selectOption(label: string, option: string) {
  const user = userEvent.setup()
  await user.click(screen.getAllByLabelText(label)[0])
  await user.click(await screen.findByRole('option', { name: option }))
}
