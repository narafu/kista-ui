import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MetaProvider } from '@entities/meta'
import type { DcaRule, Strategy } from '@entities/strategy'
import type { BrokerCode } from '@shared/lib/api-schema'
import { fmtDate, todayKst } from '@shared/lib/format'
import { DcaStrategyDetail } from './DcaStrategyDetail'
import { testMeta } from '@entities/meta/__fixtures__/testMeta'

const cryptoPortfolio = vi.hoisted(() => ({ result: null as unknown }))
// 공개 시세 폴백 — beforeEach가 실패로 되돌린다(폴백 없는 기존 테스트가 확인 불가를 그대로 기대한다)
const cryptoPrices = vi.hoisted(() => ({ result: new Error('fail') as unknown, calls: 0 }))
vi.mock('@entities/trade', async (orig) => ({
  ...(await orig<typeof import('@entities/trade')>()),
  cryptoPortfolioQueryOptions: (accountId: string) => ({
    queryKey: ['crypto-portfolio', accountId],
    queryFn: () => (cryptoPortfolio.result instanceof Error ? Promise.reject(cryptoPortfolio.result) : Promise.resolve(cryptoPortfolio.result)),
  }),
  cryptoPricesQueryOptions: (accountId: string, tickers: string[]) => ({
    queryKey: ['crypto-prices', accountId, tickers],
    queryFn: () => {
      cryptoPrices.calls++
      return cryptoPrices.result instanceof Error ? Promise.reject(cryptoPrices.result) : Promise.resolve(cryptoPrices.result)
    },
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
      { ruleKey: 'r1', direction: 'BUY', kstTradeDate: '2026-09-30', status: 'ORDERED', skipReason: null, detail: null, quantity: 3, order: { id: 'o1', status: 'FILLED', filledQuantity: 3, filledPrice: 87.4 } },
      { ruleKey: 'gone', direction: 'SELL', kstTradeDate: '2026-08-29', status: 'SKIPPED', skipReason: 'CONDITION_NOT_MET', detail: 'RSI(14) 48.20 > 35', referencePrice: 86.5, order: null },
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
const portfolio = (currentPrice: number | null) => ({ currency: 'KRW', cash: 0, totalAsset: 0, holdings: [{ ticker: 'ETH', quantity: 0.5, avgBuyPrice: 1, currentPrice, evalAmount: 1 }] })

// broker를 생략하면 ETH는 업비트, 그 외는 주식 계좌로 둔다
function renderDetail(s: Strategy = strategy, broker: BrokerCode = s.ticker === 'ETH' ? 'UPBIT' : 'KIS') {
  const tickers = [{ code: 'ETH', exchangeCode: 'UPBIT', targetProfitRate: '0', market: 'CRYPTO_KRW' }]
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MetaProvider meta={{
        ...testMeta, tickers,
        dcaSizingTypes: [{ code: 'AMOUNT', label: '고정 금액' }, { code: 'HOLDING_PERCENT', label: '보유 비율' }],
        dcaShortfallPolicies: [{ code: 'PARTIAL', label: '가용만큼 주문' }, { code: 'REJECT', label: '주문하지 않음' }],
      }}>
        <DcaStrategyDetail accountId="a1" broker={broker} strategy={s} />
      </MetaProvider>
    </QueryClientProvider>,
  )
}

// 규칙 카드의 라벨(dt)에 딸린 값(dd)
const ruleField = (label: string) => screen.getByText(label, { selector: 'dt' }).nextElementSibling as HTMLElement

describe('DcaStrategyDetail', () => {
  beforeEach(() => {
    cryptoPrices.result = new Error('fail')
    cryptoPrices.calls = 0
  })

  it('크립토: 원장 보유 수량·평단가와 현재가로 평가금액·수익률을 계산하고 prices는 호출하지 않는다', async () => {
    cryptoPortfolio.result = portfolio(4_400_000)
    prices.calls = []
    renderDetail(ethStrategy)
    expect(screen.getByText('0.5 ETH')).toBeInTheDocument()
    expect(screen.queryByText('이 전략 체결 기준')).not.toBeInTheDocument()
    expect(screen.getByText('4,000,000원')).toBeInTheDocument()
    expect(await screen.findByText('2,200,000원')).toBeInTheDocument()
    expect(screen.getByText('+10.0%')).toHaveClass('text-pos')
    expect(prices.calls.every((c) => (c[2] as { enabled?: boolean }).enabled === false)).toBe(true)
  })
  it('크립토: 실잔고에 현재가가 있으면 공개 시세를 조회하지 않는다', async () => {
    cryptoPortfolio.result = portfolio(4_400_000)
    renderDetail(ethStrategy)
    expect(await screen.findByText('2,200,000원')).toBeInTheDocument()
    expect(cryptoPrices.calls).toBe(0)
  })
  it('크립토: 실잔고에 종목이 없으면 공개 시세로 평가금액·수익률을 계산한다', async () => {
    cryptoPortfolio.result = { currency: 'KRW', cash: 0, totalAsset: 0, holdings: [] }
    cryptoPrices.result = { ETH: 4_400_001 }
    renderDetail(ethStrategy)
    expect(await screen.findByText('2,200,001원')).toBeInTheDocument()
    expect(screen.getByText('+10.0%')).toBeInTheDocument()
  })
  it('크립토: 포트폴리오 조회가 실패해도 공개 시세로 평가금액을 계산한다', async () => {
    cryptoPortfolio.result = new Error('fail')
    cryptoPrices.result = { ETH: 4_400_000 }
    renderDetail(ethStrategy)
    expect(await screen.findByText('2,200,000원')).toBeInTheDocument()
  })
  it('크립토: 공개 시세 응답에 종목이 없으면 확인 불가', async () => {
    cryptoPortfolio.result = { currency: 'KRW', cash: 0, totalAsset: 0, holdings: [] }
    cryptoPrices.result = {}
    renderDetail(ethStrategy)
    expect(await screen.findAllByText('확인 불가')).toHaveLength(2)
  })
  it('바이낸스 계좌: USDT로 평가금액을 소수 2자리까지 반올림해 표시한다', async () => {
    cryptoPortfolio.result = { currency: 'USDT', cash: 0, totalAsset: 0, holdings: [{ ticker: 'ETH', quantity: 0.5, avgBuyPrice: 1, currentPrice: 3001.111, evalAmount: 1 }] }
    renderDetail({ ...ethStrategy, dca: { ...ethStrategy.dca!, avgPrice: 2500.5 } }, 'BINANCE')
    expect(screen.getByText('2,500.50 USDT')).toBeInTheDocument()
    expect(await screen.findByText('1,500.56 USDT')).toBeInTheDocument()
    expect(screen.queryByText(/원$/)).not.toBeInTheDocument()
  })
  it('업비트 계좌: 계좌 기준으로도 원 단위로 표시한다', async () => {
    cryptoPortfolio.result = portfolio(4_400_001)
    renderDetail(ethStrategy, 'UPBIT')
    expect(await screen.findByText('2,200,001원')).toBeInTheDocument()
  })
  it('크립토 평가금액은 원 단위로 반올림한다', async () => {
    cryptoPortfolio.result = portfolio(4_400_001)
    renderDetail(ethStrategy)
    expect(await screen.findByText('2,200,001원')).toBeInTheDocument()
  })

  it('크립토 포트폴리오·공개 시세 조회가 모두 실패해도 보유·평단은 보이고 평가금액·수익률만 확인 불가', async () => {
    cryptoPortfolio.result = new Error('fail')
    renderDetail(ethStrategy)
    expect(await screen.findAllByText('확인 불가')).toHaveLength(2)
    expect(screen.getByText('0.5 ETH')).toBeInTheDocument()
    expect(screen.getByText('4,000,000원')).toBeInTheDocument()
  })
  it('크립토 현재가가 null이고 공개 시세도 실패하면 평가금액·수익률은 확인 불가', async () => {
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
    expect(screen.queryByText('이 전략 체결 기준')).not.toBeInTheDocument()
  })
  it('currentHoldings가 null이면 보유 수량 0, 나머지는 -', () => {
    renderDetail({ ...strategy, dca: { rules: [rule], currentHoldings: null, avgPrice: null } })
    const tile = (label: string) => screen.getByText(label).parentElement!.parentElement!
    expect(tile('보유 수량')).toHaveTextContent('0주')
    for (const l of ['평단가', '평가금액', '수익률']) expect(tile(l)).toHaveTextContent('-')
  })
  it('규칙 카드: 요약·조건·부족 정책·다음 판정일, 옛 방향 타일·설정 그리드·추가 조건 카드는 없다', () => {
    renderDetail()
    const card = screen.getByRole('heading', { name: '규칙' }).closest('[data-slot="card"]') as HTMLElement
    expect(within(card).getByText('매월 말일 · MOC(종가시장가) · $300.00')).toBeInTheDocument()
    expect(within(card).getByText('매수')).toBeInTheDocument()
    expect(ruleField('조건')).toHaveTextContent('RSI(14) 35 이하')
    expect(ruleField('잔고가 부족할 때')).toHaveTextContent('잔량')
    expect(ruleField('다음 판정일')).toHaveTextContent(fmtDate('2026-10-31'))
    expect(ruleField('최근 결과')).toHaveTextContent('-')
    expect(within(card).queryByText('방향')).not.toBeInTheDocument()
    expect(screen.queryByTestId('dca-config-grid')).not.toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['전략 정보', '규칙', '회차별 실행 이력'])
  })
  it('규칙 카드: 크립토는 다음 실행 + 시각, 최근 결과와 skip 사유, 조건 없음 문구', () => {
    cryptoPortfolio.result = portfolio(1)
    const r = { ...ethRule, conditions: [], shortfall: 'REJECT' as const, lastExecution: { kstTradeDate: '2026-10-21', status: 'SKIPPED', skipReason: 'CONDITION_NOT_MET' } }
    renderDetail({ ...ethStrategy, dca: { ...ethStrategy.dca!, rules: [r] } })
    expect(ruleField('다음 실행')).toHaveTextContent('11/1 09시')
    expect(ruleField('최근 결과')).toHaveTextContent('조건 미충족')
    expect(ruleField('최근 결과')).not.toHaveTextContent('건너뜀')
    expect(screen.getByText('조건 없이 매 회차 주문')).toBeInTheDocument()
    expect(ruleField('잔고가 부족할 때')).toHaveTextContent('없음')
    expect(screen.queryByText(/다음 판정일/)).not.toBeInTheDocument()
  })
  it('규칙 카드: 주문된 최근 결과는 상태 라벨을 보여 준다', () => {
    renderDetail({ ...strategy, dca: { ...strategy.dca!, rules: [{ ...rule, lastExecution: { kstTradeDate: '2026-10-21', status: 'ORDERED', skipReason: null } }] } })
    expect(ruleField('최근 결과')).toHaveTextContent('주문됨')
  })
  it('규칙 카드: 매도 규칙은 주식이어도 보유 부족 정책을 보여 준다', () => {
    renderDetail({ ...strategy, dca: { ...strategy.dca!, rules: [{ ...rule, direction: 'SELL' }] } })
    expect(ruleField('보유가 부족할 때')).toHaveTextContent('잔량')
  })
  it('nextExecution이 null이면 미정', () => {
    renderDetail({ ...strategy, dca: { ...strategy.dca!, rules: [{ ...rule, nextExecution: null }] } })
    expect(ruleField('다음 판정일')).toHaveTextContent('미정')
  })
  it('공포탐욕지수 조건은 주식이면 (CNN), 크립토면 (Crypto) 출처를 붙인다', () => {
    const fg = { indicator: 'FEAR_GREED' as const, operator: 'LTE' as const, threshold: 20 }
    const { unmount } = renderDetail({ ...strategy, dca: { ...strategy.dca!, rules: [{ ...rule, conditions: [fg] }] } })
    expect(ruleField('조건')).toHaveTextContent(/공포탐욕지수\(CNN\) 20/)
    unmount()
    cryptoPortfolio.result = portfolio(1)
    renderDetail({ ...ethStrategy, dca: { ...ethStrategy.dca!, rules: [{ ...ethRule, conditions: [fg] }] } })
    expect(ruleField('조건')).toHaveTextContent(/공포탐욕지수\(Crypto\) 20/)
  })
  it('바로 주문 버튼이 없다', () => {
    renderDetail()
    expect(screen.queryByRole('button', { name: /바로 주문/ })).not.toBeInTheDocument()
  })
  it('회차 이력: 주문됨/건너뜀 + 사유·detail', () => {
    renderDetail()
    const region = screen.getByRole('region', { name: '회차별 실행 이력' })
    expect(within(region).getByText('주문됨')).toBeInTheDocument()
    expect(within(region).getByText('조건 미충족')).toBeInTheDocument()
    expect(within(region).getByText('RSI(14) 48.20 > 35')).toBeInTheDocument()
    expect(region).toHaveAttribute('tabindex', '0')
  })
  it('회차 이력 표: 방향·주기·규칙(조건)을 칸으로 나누고, 삭제된 규칙은 주기 자리에 표시·조건은 -', () => {
    renderDetail()
    const region = screen.getByRole('region', { name: '회차별 실행 이력' })
    const [, ordered, skipped] = within(region).getAllByRole('row')
    const cells = (row: HTMLElement) => within(row).getAllByRole('cell').map((c) => c.textContent)
    expect(cells(ordered).slice(1, 4)).toEqual(['매수', '매월 말일', 'RSI(14) 35 이하'])
    expect(cells(skipped).slice(1, 4)).toEqual(['매도', '삭제된 규칙', '-'])
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
    expect(group).toHaveTextContent('일시중지')
    expect(group).toHaveTextContent('시작예정')
  })
})
