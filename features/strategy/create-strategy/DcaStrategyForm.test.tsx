import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
    code: 'DCA', availableTickers: ['UPRO', 'QLD'], requiresPrivacyBase: false, tickerFixed: false, supportsReverseMode: false,
    divisionCounts: [], orderTypes: ['MOO', 'MOC'], directions: ['BUY', 'SELL'],
    frequencies: ['DAILY', 'WEEKLY', 'MONTHLY'], conditionIndicators: ['AVG_PRICE', 'SMA', 'RSI', 'FEAR_GREED'],
  }],
}

const existing: Strategy = {
  id: 's1', accountId: 'a1', type: 'DCA', status: 'ACTIVE', ticker: 'QLD', cycleSeedType: 'NONE', isReverseMode: false,
  dca: { direction: 'SELL', amountUsd: 200, orderType: 'MOO', frequency: 'DAILY', dayOfWeek: null, dayOfMonth: null, conditions: [], nextExecution: null, lastExecution: null },
}

function renderForm(initial?: Strategy, defaultTicker = 'UPRO') {
  return render(
    <MetaProvider meta={meta}>
      <DcaStrategyForm accountId="a1" broker="KIS" initial={initial} availableTickers={['UPRO', 'QLD']} defaultTicker={defaultTicker} />
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
      expect.objectContaining({ type: 'DCA', ticker: 'UPRO', dca: expect.objectContaining({ amountUsd: 300, frequency: 'MONTHLY', dayOfMonth: null }) }),
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
      expect.objectContaining({ direction: 'SELL', amountUsd: 200, frequency: 'DAILY' }),
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
})
