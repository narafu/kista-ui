import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TradingMarket } from '@shared/lib/api-schema'
import { MetaProvider } from '@entities/meta'
import type { DcaRule, Strategy } from '@entities/strategy'
import { DcaStrategyForm } from './DcaStrategyForm'
import { dcaTestMeta } from './sections/__fixtures__/dcaTestMeta'

const createMutate = vi.fn()
const reconfigureMutate = vi.fn()
vi.mock('@entities/strategy', async (orig) => ({
  ...(await orig<typeof import('@entities/strategy')>()),
  useCreateStrategyMutation: () => ({ mutate: createMutate, isPending: false }),
  useReconfigureDcaMutation: () => ({ mutate: reconfigureMutate, isPending: false }),
}))

const meta = {
  ...dcaTestMeta,
  strategyTypes: [{
    code: 'DCA', availableTickers: ['UPRO', 'QLD', 'BTC'], requiresPrivacyBase: false, tickerFixed: false, supportsReverseMode: false,
    divisionCounts: [], orderTypes: ['MOO', 'MOC', 'MARKET'], directions: ['BUY', 'SELL'],
    frequencies: ['DAILY', 'WEEKLY', 'MONTHLY'], conditionIndicators: ['AVG_PRICE', 'SMA', 'RSI', 'FEAR_GREED'],
  }],
}

function rule(ruleKey: string, amount: number, o: Partial<DcaRule> = {}): DcaRule {
  return {
    ruleKey, direction: 'BUY', frequency: 'DAILY', dayOfWeek: null, dayOfMonth: null, orderType: 'MOO', executionHour: null,
    sizing: { type: 'AMOUNT', amount, percent: null }, shortfall: 'PARTIAL', conditions: [], nextExecution: null, lastExecution: null, ...o,
  }
}

function existing(rules: DcaRule[]): Strategy {
  return {
    id: 's1', accountId: 'a1', type: 'DCA', status: 'ACTIVE', ticker: 'QLD', cycleSeedType: 'NONE', isReverseMode: false,
    dca: { rules, currentHoldings: null, avgPrice: null },
  }
}

function renderForm(initial?: Strategy, defaultTicker = 'UPRO', market: TradingMarket = 'US_STOCK') {
  return render(
    <MetaProvider meta={meta}>
      <DcaStrategyForm accountId="a1" initial={initial} availableTickers={market === 'CRYPTO_KRW' ? ['BTC'] : ['UPRO', 'QLD']} defaultTicker={defaultTicker} market={market} />
    </MetaProvider>,
  )
}

const row = (name: RegExp) => screen.getByRole('button', { name })

describe('DcaStrategyForm', () => {
  beforeEach(() => {
    createMutate.mockClear()
    reconfigureMutate.mockClear()
    // jsdom의 history.back은 popstate를 비동기로 쏘거나 생략할 수 있어 동기 popstate로 고정한다
    vi.spyOn(window.history, 'back').mockImplementation(() => window.dispatchEvent(new PopStateEvent('popstate', { state: null })))
  })
  afterEach(() => {
    window.history.replaceState(null, '')
    vi.restoreAllMocks()
  })

  it('등록: 규칙 0개면 제출을 막고 안내한다', async () => {
    renderForm()
    expect(screen.getByText('규칙을 추가하세요.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '등록' }))
    await waitFor(() => expect(screen.getByText('규칙을 추가하세요.')).toHaveClass('text-[var(--status-error)]'))
    expect(createMutate).not.toHaveBeenCalled()
  })

  it('등록: 매수 규칙 추가 → 완료 → 요약 줄 → 등록 payload에 ruleKey 키가 없다', async () => {
    renderForm()
    fireEvent.click(screen.getByRole('button', { name: '+ 매수 규칙 추가' }))
    expect(screen.getByRole('heading', { level: 2, name: '매수 규칙' })).toHaveFocus()
    expect(screen.queryByRole('button', { name: '등록' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('회차당 금액 (USD)'), { target: { value: '300' } })
    fireEvent.click(screen.getByRole('button', { name: '완료' }))

    const summary = await screen.findByRole('button', { name: /매월 말일 · 장 마감 시장가 · \$300/ })
    await waitFor(() => expect(summary).toHaveFocus())
    expect(screen.getByText('규칙 (1/10)')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '등록' }))
    await waitFor(() => expect(createMutate).toHaveBeenCalled())
    const payload = createMutate.mock.calls[0][0]
    expect(payload).toMatchObject({ type: 'DCA', ticker: 'UPRO', dca: { rules: [{ direction: 'BUY', sizing: { type: 'AMOUNT', amount: 300, percent: null } }] } })
    expect(payload.dca.rules[0]).not.toHaveProperty('ruleKey')
    expect(reconfigureMutate).not.toHaveBeenCalled()
  })

  it('크립토 등록: 새 규칙은 부모 시장으로 실행 시각 09시·시장가를 보낸다', async () => {
    renderForm(undefined, 'BTC', 'CRYPTO_KRW')
    fireEvent.click(screen.getByRole('button', { name: '+ 매수 규칙 추가' }))
    fireEvent.change(screen.getByLabelText('회차당 금액 (원)'), { target: { value: '5000' } })
    fireEvent.click(screen.getByRole('button', { name: '완료' }))
    await screen.findByText('규칙 (1/10)')
    fireEvent.click(screen.getByRole('button', { name: '등록' }))
    await waitFor(() => expect(createMutate).toHaveBeenCalled())
    expect(createMutate.mock.calls[0][0].dca.rules[0]).toMatchObject({ orderType: 'MARKET', executionHour: 9, sizing: { amount: 5000 } })
  })

  it('수정: 편집·삭제·추가 후 기존 ruleKey는 보존하고 새 규칙은 null로 보낸다', async () => {
    renderForm(existing([rule('a', 100), rule('b', 200)]))
    fireEvent.click(row(/\$200/))
    fireEvent.change(screen.getByLabelText('회차당 금액 (USD)'), { target: { value: '250' } })
    fireEvent.click(screen.getByRole('button', { name: '완료' }))
    await screen.findByRole('button', { name: /\$250/ })

    fireEvent.click(row(/\$100/))
    fireEvent.click(screen.getByRole('button', { name: '규칙 삭제' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: /\$100/ })).not.toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: '+ 매도 규칙 추가' }))
    fireEvent.change(screen.getByLabelText('회차당 금액 (USD)'), { target: { value: '50' } })
    fireEvent.click(screen.getByRole('button', { name: '완료' }))
    await screen.findByText('규칙 (2/10)')

    fireEvent.click(screen.getByRole('button', { name: '수정' }))
    await waitFor(() => expect(reconfigureMutate).toHaveBeenCalled())
    expect(reconfigureMutate.mock.calls[0][0]).toEqual({
      rules: [
        expect.objectContaining({ ruleKey: 'b', direction: 'BUY', sizing: { type: 'AMOUNT', amount: 250, percent: null } }),
        expect.objectContaining({ ruleKey: null, direction: 'SELL', sizing: { type: 'AMOUNT', amount: 50, percent: null } }),
      ],
    })
    expect(createMutate).not.toHaveBeenCalled()
  })

  it('취소·← 규칙 목록은 편집 내용을 버리고 해당 줄로 포커스를 돌린다', async () => {
    renderForm(existing([rule('a', 100)]))
    fireEvent.click(row(/\$100/))
    fireEvent.change(screen.getByLabelText('회차당 금액 (USD)'), { target: { value: '999' } })
    fireEvent.click(screen.getByRole('button', { name: '취소' }))
    await waitFor(() => expect(row(/\$100/)).toHaveFocus())

    fireEvent.click(row(/\$100/))
    fireEvent.change(screen.getByLabelText('회차당 금액 (USD)'), { target: { value: '999' } })
    fireEvent.click(screen.getByRole('button', { name: '← 규칙 목록' }))
    await waitFor(() => expect(row(/\$100/)).toHaveFocus())
    expect(screen.queryByRole('button', { name: /\$999/ })).not.toBeInTheDocument()
  })

  it('새 규칙을 취소하면 규칙이 늘지 않고 누른 추가 버튼으로 포커스가 돌아간다', async () => {
    renderForm()
    fireEvent.click(screen.getByRole('button', { name: '+ 매도 규칙 추가' }))
    fireEvent.click(screen.getByRole('button', { name: '취소' }))
    await waitFor(() => expect(screen.getByRole('button', { name: '+ 매도 규칙 추가' })).toHaveFocus())
    expect(screen.getByText('규칙 (0/10)')).toBeInTheDocument()
  })

  it('브라우저 뒤로가기(표식 없는 popstate)도 취소와 같다', async () => {
    renderForm(existing([rule('a', 100)]))
    fireEvent.click(row(/\$100/))
    expect(screen.getByRole('heading', { level: 2, name: '매수 규칙' })).toBeInTheDocument()
    window.dispatchEvent(new PopStateEvent('popstate', { state: null }))
    await waitFor(() => expect(row(/\$100/)).toHaveFocus())
  })

  it('편집 진입 시 이력을 한 칸 쌓는다', () => {
    const push = vi.spyOn(window.history, 'pushState')
    renderForm(existing([rule('a', 100)]))
    fireEvent.click(row(/\$100/))
    expect(push).toHaveBeenCalledTimes(1)
  })

  it('규칙 10개면 추가 버튼 두 개 모두 숨긴다', () => {
    renderForm(existing(Array.from({ length: 10 }, (_, i) => rule(`r${i}`, 100 + i))))
    expect(screen.getByText('규칙 (10/10)')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '+ 매수 규칙 추가' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '+ 매도 규칙 추가' })).not.toBeInTheDocument()
  })

  it('수정: 종목 변경 UI가 없다', () => {
    renderForm(existing([rule('a', 100)]))
    expect(screen.queryByRole('button', { name: 'UPRO' })).not.toBeInTheDocument()
  })

  it('줄 2행에 조건과 부족 시 정책 라벨을 보여 준다', () => {
    renderForm(existing([rule('a', 100, { shortfall: 'REJECT', conditions: [{ indicator: 'RSI', operator: 'LTE', threshold: 30 }] })]))
    expect(row(/RSI\(14\) 30 이하 · 주문하지 않음/)).toBeInTheDocument()
  })
})
