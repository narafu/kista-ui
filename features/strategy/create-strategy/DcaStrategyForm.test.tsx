import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TradingMarket } from '@shared/lib/api-schema'
import { MetaProvider } from '@entities/meta'
import type { Strategy } from '@entities/strategy'
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

const existing: Strategy = {
  id: 's1', accountId: 'a1', type: 'DCA', status: 'ACTIVE', ticker: 'QLD', cycleSeedType: 'NONE', isReverseMode: false,
  dca: { direction: 'SELL', amount: 200, orderType: 'MOO', frequency: 'DAILY', dayOfWeek: null, dayOfMonth: null, executionHour: null, conditions: [], nextExecution: null, lastExecution: null },
}

function renderForm(initial?: Strategy, defaultTicker = 'UPRO', market: TradingMarket = 'US_STOCK') {
  return render(
    <MetaProvider meta={meta}>
      <DcaStrategyForm accountId="a1" initial={initial} availableTickers={market === 'CRYPTO_KRW' ? ['BTC'] : ['UPRO', 'QLD']} defaultTicker={defaultTicker} market={market} />
    </MetaProvider>,
  )
}

describe('DcaStrategyForm', () => {
  beforeEach(() => { createMutate.mockClear(); reconfigureMutate.mockClear() })

  it('등록: 금액 입력 후 제출하면 create mutation에 DCA payload', async () => {
    renderForm()
    fireEvent.change(screen.getByLabelText('회차당 금액 (USD)'), { target: { value: '300' } })
    fireEvent.click(screen.getByRole('button', { name: '등록' }))
    await waitFor(() => expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'DCA', ticker: 'UPRO', dca: expect.objectContaining({ amount: 300, frequency: 'MONTHLY', dayOfMonth: null }) }),
      expect.anything(),
    ))
    expect(reconfigureMutate).not.toHaveBeenCalled()
  })

  it('등록: 런타임 설정 기본 티커가 있으면 첫 허용값 대신 그 티커로 시작한다', async () => {
    renderForm(undefined, 'QLD')
    fireEvent.change(screen.getByLabelText('회차당 금액 (USD)'), { target: { value: '300' } })
    fireEvent.click(screen.getByRole('button', { name: '등록' }))
    await waitFor(() => expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ ticker: 'QLD' }),
      expect.anything(),
    ))
  })

  it('수정: PUT dca-config(reconfigure) 경로로 dca 객체만, 종목·방향 변경 UI 없음', async () => {
    renderForm(existing)
    expect(screen.queryByRole('button', { name: 'UPRO' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '매수' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '수정' }))
    await waitFor(() => expect(reconfigureMutate).toHaveBeenCalledWith(
      expect.objectContaining({ direction: 'SELL', amount: 200, frequency: 'DAILY' }),
      expect.anything(),
    ))
    expect(createMutate).not.toHaveBeenCalled()
  })

  it('금액 미입력이면 제출 안 됨', async () => {
    renderForm()
    fireEvent.click(screen.getByRole('button', { name: '등록' }))
    await waitFor(() => expect(screen.getByText('금액을 입력하세요.')).toBeInTheDocument())
    expect(createMutate).not.toHaveBeenCalled()
  })

  it('주식 등록 payload는 amount만 보내고 amountUsd·executionHour 키를 만들지 않는다', async () => {
    renderForm()
    fireEvent.change(screen.getByLabelText('회차당 금액 (USD)'), { target: { value: '300' } })
    fireEvent.click(screen.getByRole('button', { name: '등록' }))
    await waitFor(() => expect(createMutate).toHaveBeenCalled())
    const dca = createMutate.mock.calls[0][0].dca
    expect(dca).not.toHaveProperty('amountUsd')
    expect(dca).not.toHaveProperty('executionHour')
    expect(dca.orderType).toBe('MOC')
  })

  it('코인 등록: 원화 금액·시장가·기본 09시를 보낸다', async () => {
    renderForm(undefined, 'BTC', 'CRYPTO_KRW')
    expect(screen.queryByText('주문 방식')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('회차당 금액 (원)'), { target: { value: '5000' } })
    fireEvent.click(screen.getByRole('button', { name: '등록' }))
    await waitFor(() => expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ ticker: 'BTC', dca: expect.objectContaining({ amount: 5000, orderType: 'MARKET', executionHour: 9 }) }),
      expect.anything(),
    ))
    expect(createMutate.mock.calls[0][0].dca).not.toHaveProperty('amountUsd')
  })

  it('코인 등록: 최소 금액 미만이면 제출 안 됨', async () => {
    renderForm(undefined, 'BTC', 'CRYPTO_KRW')
    fireEvent.change(screen.getByLabelText('회차당 금액 (원)'), { target: { value: '4999' } })
    fireEvent.click(screen.getByRole('button', { name: '등록' }))
    await waitFor(() => expect(screen.getByText('최소 주문 금액은 5,000원입니다.')).toBeInTheDocument())
    expect(createMutate).not.toHaveBeenCalled()
  })

  it('코인 수정: 실행 시각 00시를 유지해 보낸다', async () => {
    const crypto: Strategy = { ...existing, ticker: 'BTC', dca: { ...existing.dca!, amount: 10000, orderType: 'MARKET', executionHour: 0 } }
    renderForm(crypto, 'BTC', 'CRYPTO_KRW')
    fireEvent.click(screen.getByRole('button', { name: '수정' }))
    await waitFor(() => expect(reconfigureMutate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 10000, orderType: 'MARKET', executionHour: 0 }),
      expect.anything(),
    ))
  })
})
