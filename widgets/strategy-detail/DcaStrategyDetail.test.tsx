import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MetaProvider } from '@entities/meta'
import type { DcaRule, Strategy } from '@entities/strategy'
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

const prices = vi.hoisted(() => ({ calls: [] as unknown[][], data: { UPRO: 100 } as Record<string, number> | undefined }))
vi.mock('@entities/account', async (orig) => ({
  ...(await orig<typeof import('@entities/account')>()),
  useAccountPricesQuery: (...args: unknown[]) => { prices.calls.push(args); return { data: prices.data } },
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

const rule: DcaRule = {
  ruleKey: 'r1', direction: 'BUY', frequency: 'MONTHLY', dayOfWeek: null, dayOfMonth: null, orderType: 'MOC', executionHour: null,
  sizing: { type: 'AMOUNT', amount: 300, percent: null }, shortfall: 'PARTIAL',
  conditions: [{ indicator: 'RSI', operator: 'LTE', threshold: 35 }],
  nextExecution: { usSessionDate: '2026-10-30', kstTradeDate: '2026-10-31' }, lastExecution: null,
}
const strategy: Strategy = {
  id: 'd1', accountId: 'a1', type: 'DCA', status: 'ACTIVE', ticker: 'UPRO', cycleSeedType: 'NONE', isReverseMode: false,
  dca: { rules: [rule], currentHoldings: 3, avgPrice: 80 },
} as Strategy
const ethRule: DcaRule = { ...rule, ruleKey: 'r2', frequency: 'DAILY', orderType: 'MARKET', executionHour: 9, sizing: { type: 'AMOUNT', amount: 50000, percent: null }, nextExecution: { usSessionDate: '2026-11-01', kstTradeDate: '2026-11-01' } }
const ethStrategy: Strategy = { ...strategy, ticker: 'ETH', dca: { rules: [ethRule], currentHoldings: 0.5, avgPrice: 4_000_000 } }
const portfolio = (currentPrice: number | null) => ({ krwCash: 0, totalAssetKrw: 0, holdings: [{ ticker: 'ETH', quantity: 0.5, avgBuyPrice: 1, currentPrice, evalAmountKrw: 1 }] })

function renderDetail(s: Strategy = strategy) {
  const tickers = [{ code: 'ETH', exchangeCode: 'UPBIT', targetProfitRate: '0', market: 'CRYPTO_KRW' }]
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MetaProvider meta={{
        ...dcaTestMeta, tickers, strategyStatuses: [{ code: 'PAUSED', label: '일시중지됨' }],
        dcaSkipReasons: [{ code: 'CONDITION_NOT_MET', label: '조건 미충족' }],
        dcaSizingTypes: [{ code: 'AMOUNT', label: '고정 금액' }, { code: 'HOLDING_PERCENT', label: '보유 비율' }],
        dcaShortfallPolicies: [{ code: 'PARTIAL', label: '가용만큼 주문' }, { code: 'REJECT', label: '주문하지 않음' }],
      }}>
        <DcaStrategyDetail accountId="a1" strategy={s} />
      </MetaProvider>
    </QueryClientProvider>,
  )
}

describe('DcaStrategyDetail', () => {
  it('크립토: 원장 보유 수량·평단가와 현재가로 평가금액·수익률을 계산하고 prices는 호출하지 않는다', async () => {
    cryptoPortfolio.result = portfolio(4_400_000)
    prices.calls = []
    renderDetail(ethStrategy)
    expect(screen.getByText('0.5 ETH')).toBeInTheDocument()
    expect(screen.getByText('이 전략 체결 기준')).toBeInTheDocument()
    expect(screen.getByText('4,000,000원')).toBeInTheDocument()
    expect(await screen.findByText('2,200,000원')).toBeInTheDocument()
    expect(screen.getByText('+10.0%')).toHaveClass('text-pos')
    expect(prices.calls.every((c) => (c[2] as { enabled?: boolean }).enabled === false)).toBe(true)
  })
  it('크립토 포트폴리오 조회 실패여도 보유·평단은 보이고 평가금액·수익률만 확인 불가', async () => {
    cryptoPortfolio.result = new Error('fail')
    renderDetail(ethStrategy)
    expect(await screen.findAllByText('확인 불가')).toHaveLength(2)
    expect(screen.getByText('0.5 ETH')).toBeInTheDocument()
    expect(screen.getByText('4,000,000원')).toBeInTheDocument()
  })
  it('크립토 현재가가 null이면 평가금액·수익률은 확인 불가', async () => {
    cryptoPortfolio.result = portfolio(null)
    renderDetail(ethStrategy)
    expect(await screen.findAllByText('확인 불가')).toHaveLength(2)
  })
  it('주식: prices 현재가로 평가금액·수익률을 계산한다', () => {
    prices.data = { UPRO: 100 }
    renderDetail()
    expect(screen.getAllByText('3주').length).toBeGreaterThan(0) // 보유 타일 + 이력 수량
    expect(screen.getByText('$80.00')).toBeInTheDocument()
    expect(screen.getByText('$300.00')).toBeInTheDocument()
    expect(screen.getByText('+25.0%')).toBeInTheDocument()
    expect(screen.getByText('이 전략 체결 기준')).toBeInTheDocument()
  })
  it('currentHoldings가 null이면 보유 수량 0, 나머지는 -', () => {
    renderDetail({ ...strategy, dca: { rules: [rule], currentHoldings: null, avgPrice: null } })
    const tile = (label: string) => screen.getByText(label).parentElement!.parentElement!
    expect(tile('보유 수량')).toHaveTextContent('0주')
    for (const l of ['평단가', '평가금액', '수익률']) expect(tile(l)).toHaveTextContent('-')
  })
  it('규칙 카드: 요약·조건·부족 정책·다음 판정일, 옛 방향 타일·설정 그리드·추가 조건 카드는 없다', () => {
    renderDetail()
    expect(screen.getByText('매수 · 매월 말일 · 장 마감 시장가 · $300.00')).toBeInTheDocument()
    expect(screen.getByText('RSI(14) 35 이하')).toBeInTheDocument()
    expect(screen.getByText('가용만큼 주문')).toBeInTheDocument()
    expect(screen.getByText(`다음 판정일 ${fmtDate('2026-10-31')}`)).toBeInTheDocument()
    expect(screen.queryByText(/^최근/)).not.toBeInTheDocument()
    expect(screen.queryByText('방향')).not.toBeInTheDocument()
    expect(screen.queryByTestId('dca-config-grid')).not.toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['규칙', '회차별 실행 이력'])
  })
  it('규칙 카드: 크립토는 다음 실행 + 시각, 최근 결과와 skip 사유, 조건 없음 문구', () => {
    cryptoPortfolio.result = portfolio(1)
    const r = { ...ethRule, conditions: [], shortfall: 'REJECT' as const, lastExecution: { kstTradeDate: '2026-10-21', status: 'SKIPPED', skipReason: 'CONDITION_NOT_MET' } }
    renderDetail({ ...ethStrategy, dca: { ...ethStrategy.dca!, rules: [r] } })
    expect(screen.getByText('다음 실행 11/1 09시')).toBeInTheDocument()
    expect(screen.getByText('최근 건너뜀 · 조건 미충족')).toBeInTheDocument()
    expect(screen.getByText('조건 없이 매 회차 주문')).toBeInTheDocument()
    expect(screen.getByText('주문하지 않음')).toBeInTheDocument()
    expect(screen.queryByText(/다음 판정일/)).not.toBeInTheDocument()
  })
  it('nextExecution이 null이면 미정', () => {
    renderDetail({ ...strategy, dca: { ...strategy.dca!, rules: [{ ...rule, nextExecution: null }] } })
    expect(screen.getByText('다음 판정일 미정')).toBeInTheDocument()
  })
  it('공포탐욕지수 조건은 주식이면 (CNN), 크립토면 (Crypto) 출처를 붙인다', () => {
    const fg = { indicator: 'FEAR_GREED' as const, operator: 'LTE' as const, threshold: 20 }
    const { unmount } = renderDetail({ ...strategy, dca: { ...strategy.dca!, rules: [{ ...rule, conditions: [fg] }] } })
    expect(screen.getByText(/공포탐욕지수\(CNN\) 20/)).toBeInTheDocument()
    unmount()
    cryptoPortfolio.result = portfolio(1)
    renderDetail({ ...ethStrategy, dca: { ...ethStrategy.dca!, rules: [{ ...ethRule, conditions: [fg] }] } })
    expect(screen.getByText(/공포탐욕지수\(Crypto\) 20/)).toBeInTheDocument()
  })
  it('바로 주문 버튼이 없다', () => {
    renderDetail()
    expect(screen.queryByRole('button', { name: /바로 주문/ })).not.toBeInTheDocument()
  })
  it('회차 이력: 주문됨/건너뜀 + 사유·detail', () => {
    renderDetail()
    expect(screen.getByText('주문됨')).toBeInTheDocument()
    expect(screen.getByText('조건 미충족')).toBeInTheDocument()
    expect(screen.getByText('RSI(14) 48.20 > 35')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '회차별 실행 이력' })).toHaveAttribute('tabindex', '0')
  })
  it('dca가 없어도 이력·일시중지 버튼을 렌더하고 규칙 카드는 없다', () => {
    renderDetail({ ...strategy, dca: undefined })
    expect(screen.getByRole('region', { name: '회차별 실행 이력' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '일시중지' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '규칙' })).not.toBeInTheDocument()
  })
  it('일시중지 상태와 시작 예정을 배지로 보여주고, 정상 상태면 배지가 없다', () => {
    const { unmount } = renderDetail()
    expect(screen.getByTestId('strategy-status-group')).toBeEmptyDOMElement()
    unmount()
    const [y, m, d] = todayKst().split('-').map(Number)
    const future = `${y + 1}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    renderDetail({ ...strategy, status: 'PAUSED', startDate: future })
    const group = screen.getByTestId('strategy-status-group')
    expect(group).toHaveTextContent('일시중지됨')
    expect(group).toHaveTextContent('시작예정')
  })
})
