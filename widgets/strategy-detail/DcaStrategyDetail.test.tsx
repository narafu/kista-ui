import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MetaProvider } from '@entities/meta'
import type { Strategy } from '@entities/strategy'
import { fmtDate, todayKst } from '@shared/lib/format'
import { DcaStrategyDetail } from './DcaStrategyDetail'
import { dcaTestMeta } from '@features/strategy/create-strategy/sections/__fixtures__/dcaTestMeta'

const cryptoPortfolio = vi.hoisted(() => ({ result: null as unknown }))
vi.mock('@entities/trade', async (orig) => ({
  ...(await orig<typeof import('@entities/trade')>()),
  cryptoPortfolioQueryOptions: (accountId: string) => ({
    queryKey: ['crypto-portfolio', accountId],
    queryFn: () => (cryptoPortfolio.result instanceof Error ? Promise.reject(cryptoPortfolio.result) : Promise.resolve(cryptoPortfolio.result)),
  }),
}))

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

const btcStrategy: Strategy = { ...strategy, ticker: 'BTC', currentHoldings: 0.01, dca: { ...strategy.dca!, amount: 50000, frequency: 'DAILY', executionHour: 9 } }

function renderDetail(s: Strategy = strategy) {
  const tickers = [{ code: 'BTC', exchangeCode: 'UPBIT', targetProfitRate: '0', market: 'CRYPTO_KRW' }]
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MetaProvider meta={{ ...dcaTestMeta, tickers, strategyStatuses: [{ code: 'PAUSED', label: '일시중지됨' }], dcaSkipReasons: [{ code: 'CONDITION_NOT_MET', label: '조건 미충족' }] }}>
        <DcaStrategyDetail accountId="a1" strategy={s} />
      </MetaProvider>
    </QueryClientProvider>,
  )
}

describe('DcaStrategyDetail', () => {
  it('코인 DCA 상세는 원화 금액·실행 시각·소수 수량·다음 실행을 보여주고 다음 판정일 행이 없다', async () => {
    cryptoPortfolio.result = { krwCash: 0, totalAssetKrw: 0, holdings: [{ ticker: 'BTC', quantity: 0.01234567, avgBuyPrice: 1, currentPrice: 1, evalAmountKrw: 1 }] }
    renderDetail({ ...strategy, ticker: 'BTC', currentHoldings: 0.01234567, dca: { ...strategy.dca!, amount: 50000, frequency: 'DAILY', executionHour: 0, nextExecution: { usSessionDate: '2026-11-01', kstTradeDate: '2026-11-01' } } })
    expect(screen.getByText('50,000원')).toBeInTheDocument()
    expect(screen.getByText('매일 00시')).toBeInTheDocument()
    expect(await screen.findByText('0.01234567 BTC')).toBeInTheDocument()
    expect(screen.getByText('다음 실행')).toBeInTheDocument()
    expect(screen.getByText('11/1 00시')).toBeInTheDocument()
    expect(screen.queryByText('다음 판정일')).not.toBeInTheDocument()
  })
  it('공포탐욕지수 조건은 주식이면 (CNN), 코인이면 (Crypto) 출처를 붙인다', () => {
    const fg = { indicator: 'FEAR_GREED' as const, operator: 'LTE' as const, threshold: 20 }
    const { unmount } = renderDetail({ ...strategy, dca: { ...strategy.dca!, conditions: [fg] } })
    expect(screen.getByText(/공포탐욕지수\(CNN\) 20/)).toBeInTheDocument()
    unmount()
    renderDetail({ ...strategy, ticker: 'BTC', dca: { ...strategy.dca!, conditions: [fg], nextExecution: null } })
    expect(screen.getByText(/공포탐욕지수\(Crypto\) 20/)).toBeInTheDocument()
    expect(screen.getByText('미정')).toBeInTheDocument()
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
  it('일시중지 상태와 시작 예정을 배지로 보여주고, 정상 상태면 배지가 없다', () => {
    const { unmount } = renderDetail()
    expect(screen.queryByTestId('strategy-status-group')).not.toBeInTheDocument()
    unmount()
    const [y, m, d] = todayKst().split('-').map(Number)
    const future = `${y + 1}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    renderDetail({ ...strategy, status: 'PAUSED', startDate: future })
    const group = screen.getByTestId('strategy-status-group')
    expect(group).toHaveTextContent('일시중지됨')
    expect(group).toHaveTextContent('시작예정')
  })
  it('일정·매매 설정·보유 현황 섹션 제목을 보여준다', () => {
    renderDetail()
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['일정', '매매 설정', '보유 현황', '회차별 실행 이력'])
  })
  it('판정 안내 캡션은 추가 조건이 있을 때만 보여준다', () => {
    const { unmount } = renderDetail()
    expect(screen.getByText('조건 충족 여부는 실행일에 판정')).toBeInTheDocument()
    unmount()
    renderDetail({ ...strategy, dca: { ...strategy.dca!, conditions: [] } })
    expect(screen.queryByText('조건 충족 여부는 실행일에 판정')).not.toBeInTheDocument()
  })
  it('코인은 계좌 포트폴리오에서 이 티커의 평단가·평가금액·수익률을 보여준다', async () => {
    cryptoPortfolio.result = { krwCash: 0, totalAssetKrw: 0, holdings: [
      { ticker: 'ETH', quantity: 1, avgBuyPrice: 1, currentPrice: 1, evalAmountKrw: 1 },
      { ticker: 'BTC', quantity: 0.01, avgBuyPrice: 100_000_000, currentPrice: 110_000_000, evalAmountKrw: 1_100_000 },
    ] }
    renderDetail(btcStrategy)
    expect(await screen.findByText('100,000,000원')).toBeInTheDocument()
    expect(screen.getByText('1,100,000원')).toBeInTheDocument()
    expect(screen.getByText('+10.0%')).toHaveClass('text-pos')
  })
  it('코인 현재가를 못 받으면 평가금액은 확인 불가, 수익률은 숨긴다', async () => {
    cryptoPortfolio.result = { krwCash: 0, totalAssetKrw: 0, holdings: [{ ticker: 'BTC', quantity: 0.01, avgBuyPrice: 100_000_000, currentPrice: null, evalAmountKrw: 0 }] }
    renderDetail(btcStrategy)
    expect(await screen.findByText('현재가 확인 불가')).toBeInTheDocument()
    expect(screen.queryByText('수익률')).not.toBeInTheDocument()
  })
  it('코인 포트폴리오 조회 실패 시 안내 문구를 보여준다', async () => {
    cryptoPortfolio.result = new Error('fail')
    renderDetail(btcStrategy)
    expect(await screen.findByText('보유 정보를 불러오지 못했습니다.')).toBeInTheDocument()
  })
  it('코인 보유 수량은 api currentHoldings가 아니라 포트폴리오 수량이고, 보유하지 않으면 0이다', async () => {
    cryptoPortfolio.result = { krwCash: 0, totalAssetKrw: 0, holdings: [{ ticker: 'ETH', quantity: 1, avgBuyPrice: 1, currentPrice: 1, evalAmountKrw: 1 }] }
    renderDetail({ ...btcStrategy, currentHoldings: 5 })
    expect(await screen.findByText('0 BTC')).toBeInTheDocument()
    expect(screen.queryByText('5 BTC')).not.toBeInTheDocument()
    expect(screen.queryByText('평단가')).not.toBeInTheDocument()
  })
  it('주식은 포트폴리오 평단가 행이 없다', () => {
    renderDetail()
    expect(screen.queryByText('평단가')).not.toBeInTheDocument()
  })
  it('실행 이력: 코인은 실행일·코인 단위, 주식은 거래일·주 단위', () => {
    const { unmount } = renderDetail()
    expect(screen.getByRole('columnheader', { name: '거래일' })).toBeInTheDocument()
    expect(screen.getByText('3주')).toBeInTheDocument()
    unmount()
    cryptoPortfolio.result = { krwCash: 0, totalAssetKrw: 0, holdings: [] }
    renderDetail(btcStrategy)
    expect(screen.getByRole('columnheader', { name: '실행일' })).toBeInTheDocument()
    expect(screen.getByText('3 BTC')).toBeInTheDocument()
  })
})
