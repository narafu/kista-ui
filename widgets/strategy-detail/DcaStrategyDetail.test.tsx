import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MetaProvider } from '@entities/meta'
import type { DcaRule, Strategy } from '@entities/strategy'
import { fmtDate, todayKst } from '@shared/lib/format'
import { DcaStrategyDetail } from './DcaStrategyDetail'
import { testMeta } from '@entities/meta/__fixtures__/testMeta'

const prices = vi.hoisted(() => ({ calls: [] as unknown[][], data: { UPRO: 100 } as Record<string, number> | undefined }))
vi.mock('@entities/account', async (orig) => ({
  ...(await orig<typeof import('@entities/account')>()),
  useAccountPricesQuery: (...args: unknown[]) => { prices.calls.push(args); return { data: prices.data } },
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@features/strategy/manage-strategy', async (orig) => ({
  ...(await orig<typeof import('@features/strategy/manage-strategy')>()),
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
  ruleKey: 'r1', direction: 'BUY', frequency: 'MONTHLY', dayOfWeek: null, dayOfMonth: null, orderType: 'MOC',
  sizing: { type: 'AMOUNT', amount: 300, percent: null }, shortfall: 'PARTIAL',
  conditions: [{ indicator: 'RSI', operator: 'LTE', threshold: 35 }],
  nextExecution: { usSessionDate: '2026-10-30', kstTradeDate: '2026-10-31' }, lastExecution: null,
}
const strategy: Strategy = {
  id: 'd1', accountId: 'a1', type: 'DCA', status: 'ACTIVE', ticker: 'UPRO', cycleSeedType: 'NONE', isReverseMode: false,
  dca: { rules: [rule], currentHoldings: 3, avgPrice: 80 },
} as Strategy
function renderDetail(s: Strategy = strategy) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MetaProvider meta={{
        ...testMeta,
        dcaSizingTypes: [{ code: 'AMOUNT', label: '고정 금액' }, { code: 'HOLDING_PERCENT', label: '보유 비율' }],
        dcaShortfallPolicies: [{ code: 'PARTIAL', label: '가용만큼 주문' }, { code: 'REJECT', label: '주문하지 않음' }],
      }}>
        <DcaStrategyDetail accountId="a1" broker="TOSS" strategy={s} />
      </MetaProvider>
    </QueryClientProvider>,
  )
}

// 규칙 카드의 라벨(dt)에 딸린 값(dd)
const ruleSummary = () => screen.getByTestId('rule-summary')
const ruleFooter = () => screen.getByTestId('rule-footer')
const ruleField = (label: string) => screen.getByText(label, { selector: 'dt' }).nextElementSibling as HTMLElement
// KpiCard 타일 — 라벨 span → 라벨 줄 div → 타일
const tile = (label: string) => screen.getByText(label).parentElement!.parentElement!

describe('DcaStrategyDetail', () => {
  it('예수금: 원장 예수금을 계좌 통화로, 모르면 -', () => {
    const { unmount } = renderDetail({ ...strategy, ledgerDeposit: 1500 })
    expect(tile('예수금')).toHaveTextContent('$1,500.00')
    unmount()
    renderDetail()
    expect(tile('예수금')).toHaveTextContent('-')
  })
  it('주식: prices 현재가로 평가금액·수익률을 계산한다', () => {
    prices.data = { UPRO: 100 }
    renderDetail()
    expect(screen.getAllByText('3주').length).toBeGreaterThan(0) // 보유 타일 + 이력 수량
    expect(screen.getByText('$80.00')).toBeInTheDocument()
    expect(screen.getAllByText('$300.00').length).toBeGreaterThan(0) // 보유 타일 + 규칙 금액
    expect(screen.getByText('+25.0%')).toBeInTheDocument()
    expect(screen.queryByText('이 전략 체결 기준')).not.toBeInTheDocument()
  })
  it('currentHoldings가 null이면 보유 수량 0, 나머지는 -', () => {
    renderDetail({ ...strategy, dca: { rules: [rule], currentHoldings: null, avgPrice: null } })
    expect(tile('보유 수량')).toHaveTextContent('0주')
    for (const l of ['평단가', '평가금액', '수익률']) expect(tile(l)).toHaveTextContent('-')
  })
  it('규칙 카드: 요약·조건·부족 정책·다음 판정, 옛 방향 타일·설정 그리드·추가 조건 카드는 없다', () => {
    renderDetail()
    const card = screen.getByRole('heading', { name: '규칙' }).closest('[data-slot="card"]') as HTMLElement
    expect(within(card).getByText('$300.00')).toBeInTheDocument() // 금액은 오른쪽 열
    // 주기·주문 방식은 배지 옆 요약 한 줄, 금액·조건은 라벨 행이다
    expect(ruleSummary()).toHaveTextContent('매월 말일 · MOC')
    expect(ruleField('금액')).toHaveTextContent('$300.00')
    expect(within(card).getByText('매수')).toBeInTheDocument()
    expect(ruleField('조건')).toHaveTextContent('RSI(14) 35 이하')
    expect(ruleField('잔고 부족 시')).toHaveTextContent('잔량')
    expect(ruleFooter()).toHaveTextContent(`다음 판정 ${fmtDate('2026-10-31')} · 최근 -`)
    expect(within(card).queryByText('방향')).not.toBeInTheDocument()
    expect(screen.queryByTestId('dca-config-grid')).not.toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['전략 정보', '규칙', '회차별 실행 이력'])
  })
  it('규칙 카드: 최근 결과는 skip 사유만, 조건 없음 문구', () => {
    const r = { ...rule, conditions: [], shortfall: 'REJECT' as const, lastExecution: { kstTradeDate: '2026-10-21', status: 'SKIPPED', skipReason: 'CONDITION_NOT_MET' } }
    renderDetail({ ...strategy, dca: { ...strategy.dca!, rules: [r] } })
    expect(ruleFooter()).toHaveTextContent(`다음 판정 ${fmtDate('2026-10-31')} · 최근 조건 미충족`)
    expect(ruleFooter()).not.toHaveTextContent('건너뜀')
    expect(screen.getByText('조건 없이 매 회차 주문')).toBeInTheDocument()
    expect(ruleField('잔고 부족 시')).toHaveTextContent('주문 안 함')
  })
  it('규칙 카드: 주문된 최근 결과는 상태 라벨을 보여 준다', () => {
    renderDetail({ ...strategy, dca: { ...strategy.dca!, rules: [{ ...rule, lastExecution: { kstTradeDate: '2026-10-21', status: 'ORDERED', skipReason: null } }] } })
    expect(ruleFooter()).toHaveTextContent('최근 주문됨')
  })
  it('규칙 카드: 매도 규칙은 주식이어도 보유 부족 정책을 보여 준다', () => {
    renderDetail({ ...strategy, dca: { ...strategy.dca!, rules: [{ ...rule, direction: 'SELL' }] } })
    expect(ruleField('보유 부족 시')).toHaveTextContent('잔량')
  })
  it('nextExecution이 null이면 미정', () => {
    renderDetail({ ...strategy, dca: { ...strategy.dca!, rules: [{ ...rule, nextExecution: null }] } })
    expect(ruleFooter()).toHaveTextContent('다음 판정 미정')
  })
  it('공포탐욕지수 조건은 (CNN) 출처를 붙인다', () => {
    const fg = { indicator: 'FEAR_GREED' as const, operator: 'LTE' as const, threshold: 20 }
    renderDetail({ ...strategy, dca: { ...strategy.dca!, rules: [{ ...rule, conditions: [fg] }] } })
    expect(ruleField('조건')).toHaveTextContent(/공포탐욕지수\(CNN\) 20/)
  })
  it('바로 주문 버튼이 없다', () => {
    renderDetail()
    expect(screen.queryByRole('button', { name: /바로 주문/ })).not.toBeInTheDocument()
  })
  it('회차 이력: 건너뜀 사유·detail (결과 열 없음)', () => {
    renderDetail()
    const region = screen.getByRole('region', { name: '회차별 실행 이력' })
    expect(within(region).getByText('조건 미충족')).toBeInTheDocument()
    expect(within(region).getByText('RSI(14) 48.20 > 35')).toBeInTheDocument()
    expect(region).toHaveAttribute('tabindex', '0')
  })
  it('회차 이력 표: 방향·주기·규칙(조건)을 칸으로 나누고, 삭제된 규칙은 주기 자리에 표시·조건은 -', () => {
    renderDetail()
    const region = screen.getByRole('region', { name: '회차별 실행 이력' })
    const [ordered, skipped] = within(region).getAllByRole('row').filter((tr) => tr.querySelector('td')) // 머리글 행 제외
    const cells = (row: HTMLElement) => within(row).getAllByRole('cell').map((c) => c.textContent)
    expect(cells(ordered).slice(0, 3)).toEqual(['매수', '매월 말일', 'RSI(14) 35 이하'])
    expect(cells(skipped).slice(0, 3)).toEqual(['매도', '삭제된 규칙', '-'])
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
