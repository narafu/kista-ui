import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MetaProvider } from '@entities/meta'
import type { Strategy } from '@entities/strategy'
import { fmtDate } from '@shared/lib/format'
import { DcaStrategyDetail } from './DcaStrategyDetail'
import { dcaTestMeta } from '@features/strategy/create-strategy/sections/__fixtures__/dcaTestMeta'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@features/strategy/manage-strategy', () => ({
  useManageStrategyMutations: () => ({ pause: vi.fn(), resume: vi.fn(), remove: vi.fn(), execute: vi.fn(), isPausing: false, isResuming: false, isDeleting: false, isExecuting: false }),
}))
vi.mock('@entities/strategy', async (orig) => ({
  ...(await orig<typeof import('@entities/strategy')>()),
  useDcaExecutionsQuery: () => ({
    data: { content: [
      { kstTradeDate: '2026-09-30', status: 'ORDERED', skipReason: null, detail: null, quantity: 3, order: { id: 'o1', status: 'FILLED', filledQuantity: 3, filledPrice: 87.4 } },
      { kstTradeDate: '2026-08-29', status: 'SKIPPED', skipReason: 'CONDITION_NOT_MET', detail: 'RSI(14) 48.20 > 35', referencePrice: 86.5, order: null },
    ], page: 0, size: 20, totalElements: 2 },
    isLoading: false, isError: false,
  }),
}))

const strategy: Strategy = {
  id: 'd1', accountId: 'a1', type: 'DCA', status: 'ACTIVE', ticker: 'UPRO', cycleSeedType: 'NONE', isReverseMode: false, currentHoldings: 12,
  dca: {
    direction: 'BUY', amount: 300, orderType: 'MOC', frequency: 'MONTHLY', dayOfWeek: null, dayOfMonth: null,
    conditions: [{ indicator: 'RSI', operator: 'LTE', threshold: 35 }],
    nextExecution: { usSessionDate: '2026-10-30', kstTradeDate: '2026-10-31' }, lastExecution: null,
  },
} as Strategy

function renderDetail(s: Strategy = strategy) {
  const tickers = [{ code: 'BTC', exchangeCode: 'UPBIT', targetProfitRate: '0', market: 'CRYPTO_KRW' }]
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MetaProvider meta={{ ...dcaTestMeta, tickers, dcaSkipReasons: [{ code: 'CONDITION_NOT_MET', label: '조건 미충족' }] }}>
        <DcaStrategyDetail accountId="a1" strategy={s} />
      </MetaProvider>
    </QueryClientProvider>,
  )
}

describe('DcaStrategyDetail', () => {
  it('코인 DCA 상세는 원화 금액·실행 시각·소수 수량을 보여주고 다음 판정일 행이 없다', () => {
    renderDetail({ ...strategy, ticker: 'BTC', currentHoldings: 0.01234567, dca: { ...strategy.dca!, amount: 50000, frequency: 'DAILY', executionHour: 0 } })
    expect(screen.getByText('50,000원')).toBeInTheDocument()
    expect(screen.getByText(/00시/)).toBeInTheDocument()
    expect(screen.getByText('0.01234567 BTC')).toBeInTheDocument()
    expect(screen.queryByText('다음 판정일')).not.toBeInTheDocument()
  })
  it('바로 주문 버튼이 없다', () => {
    renderDetail()
    expect(screen.queryByRole('button', { name: /바로 주문/ })).not.toBeInTheDocument()
  })
  it('설정 요약·조건·다음 판정일·보유 수량', () => {
    renderDetail()
    expect(screen.getByText('매월 말일')).toBeInTheDocument()
    expect(screen.getByText('RSI(14) 35 이하')).toBeInTheDocument()
    expect(screen.getByText(fmtDate('2026-10-31'))).toBeInTheDocument()
    expect(screen.getByText('12주')).toBeInTheDocument()
    expect(screen.getByText('계좌 전체 보유 기준')).toBeInTheDocument()
  })
  it('회차 이력: 주문됨/건너뜀 + 사유·detail', () => {
    renderDetail()
    expect(screen.getByText('주문됨')).toBeInTheDocument()
    expect(screen.getByText('조건 미충족')).toBeInTheDocument()
    expect(screen.getByText('RSI(14) 48.20 > 35')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '회차별 실행 이력' })).toHaveAttribute('tabindex', '0')
  })
  it('dca가 없어도 보유 수량·이력·일시중지 버튼을 렌더한다', () => {
    renderDetail({ ...strategy, dca: undefined })
    expect(screen.getByText('12주')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '회차별 실행 이력' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '일시중지' })).toBeInTheDocument()
    expect(screen.queryByText('다음 판정일')).not.toBeInTheDocument()
  })
  it('nextExecution이 null이면 다음 판정일을 미정으로 표시한다', () => {
    renderDetail({ ...strategy, dca: { ...strategy.dca!, nextExecution: null } })
    expect(screen.getByText('미정')).toBeInTheDocument()
  })
  it('조건이 없으면 조건 없음 문구를 표시한다', () => {
    renderDetail({ ...strategy, dca: { ...strategy.dca!, conditions: [] } })
    expect(screen.getByText('조건 없이 매 회차 주문')).toBeInTheDocument()
  })
  it('ORDERED 행에 referencePrice가 없으면 기준가 칸에 -를 표시한다', () => {
    renderDetail()
    const orderedRow = screen.getByText(fmtDate('2026-09-30')).closest('tr')!
    expect(orderedRow.querySelectorAll('td')[3]).toHaveTextContent('-')
  })
})
