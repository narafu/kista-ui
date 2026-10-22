import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { TradingMarket } from '@shared/lib/api-schema'
import { MetaProvider } from '@entities/meta'
import { DcaRuleEditor } from './DcaRuleEditor'
import { buildDcaRuleDefaults, type DcaRuleFormValues } from '../model/dcaFormSchema'
import { dcaTestMeta } from './__fixtures__/dcaTestMeta'

const meta = {
  ...dcaTestMeta,
  strategyTypes: [{
    code: 'DCA', availableTickers: ['UPRO', 'BTC'], requiresPrivacyBase: false, tickerFixed: false, supportsReverseMode: false,
    divisionCounts: [], orderTypes: ['MOO', 'MOC', 'MARKET'], directions: ['BUY', 'SELL'],
    frequencies: ['DAILY', 'WEEKLY', 'MONTHLY'], conditionIndicators: ['AVG_PRICE', 'SMA', 'RSI', 'FEAR_GREED'],
  }],
}

function renderEditor({ direction = 'BUY', market = 'US_STOCK', isNew = true, initial }: {
  direction?: DcaRuleFormValues['direction']; market?: TradingMarket; isNew?: boolean; initial?: Partial<DcaRuleFormValues>
} = {}) {
  const onDone = vi.fn()
  const onDelete = vi.fn()
  const onCancel = vi.fn()
  render(
    <MetaProvider meta={meta}>
      <DcaRuleEditor market={market} initial={{ ...buildDcaRuleDefaults(direction, market), ...initial }} isNew={isNew}
        onDone={onDone} onDelete={onDelete} onCancel={onCancel} />
    </MetaProvider>,
  )
  return { onDone, onDelete, onCancel }
}

describe('DcaRuleEditor', () => {
  it('마운트 시 방향 제목(h2)에 포커스', () => {
    renderEditor({ direction: 'SELL' })
    expect(screen.getByRole('heading', { level: 2, name: '매도 규칙' })).toHaveFocus()
  })

  it('매수: 규모 토글 없이 금액만, 부족 시 정책은 주식 달러·크립토 원화 라벨, 기본 PARTIAL', () => {
    renderEditor()
    expect(screen.queryByRole('button', { name: '보유 비율 %' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('회차당 금액 (USD)')).toBeInTheDocument()
    expect(screen.getByText('달러가 부족할 때')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '남은 금액만큼 매수' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '주문 안 함' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('크립토 매수 부족 시 라벨은 원화', () => {
    renderEditor({ market: 'CRYPTO_KRW' })
    expect(screen.getByText('원화가 부족할 때')).toBeInTheDocument()
    expect(screen.getByLabelText('회차당 금액 (원)')).toBeInTheDocument()
  })

  it('매도: 금액/보유 비율 토글, 비율 선택 시 비율 입력과 캡션', () => {
    renderEditor({ direction: 'SELL' })
    expect(screen.getByText('보유가 부족할 때')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '잔량 전부 매도' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '금액' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: '보유 비율 %' }))
    expect(screen.queryByLabelText('회차당 금액 (USD)')).not.toBeInTheDocument()
    expect(screen.getByLabelText('보유 비율 (%)')).toBeInTheDocument()
    expect(screen.getByText('100% = 보유 전량')).toBeInTheDocument()
  })

  it('매도 비율로 완료하면 sizingType·percent·shortfall이 담긴다', async () => {
    const { onDone } = renderEditor({ direction: 'SELL' })
    fireEvent.click(screen.getByRole('button', { name: '보유 비율 %' }))
    fireEvent.change(screen.getByLabelText('보유 비율 (%)'), { target: { value: '25' } })
    fireEvent.click(screen.getByRole('button', { name: '주문 안 함' }))
    fireEvent.click(screen.getByRole('button', { name: '완료' }))
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ sizingType: 'HOLDING_PERCENT', percent: 25, shortfall: 'REJECT' })))
  })

  it('완료: 금액이 비면 onDone 미호출·오류 표시, 채우면 onDone(values)', async () => {
    const { onDone } = renderEditor()
    fireEvent.click(screen.getByRole('button', { name: '완료' }))
    expect(await screen.findByText('금액을 입력하세요.')).toBeInTheDocument()
    expect(onDone).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('회차당 금액 (USD)'), { target: { value: '300' } })
    fireEvent.click(screen.getByRole('button', { name: '완료' }))
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ direction: 'BUY', amount: 300, sizingType: 'AMOUNT' })))
  })

  it('기존 규칙이면 규칙 삭제 버튼 → onDelete, 새 규칙이면 없음', () => {
    const { onDelete } = renderEditor({ isNew: false, initial: { ruleKey: 'a', amount: 100 } })
    fireEvent.click(screen.getByRole('button', { name: '규칙 삭제' }))
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('새 규칙이면 규칙 삭제 버튼이 없다', () => {
    renderEditor()
    expect(screen.queryByRole('button', { name: '규칙 삭제' })).not.toBeInTheDocument()
  })

  it('취소·← 규칙 목록은 onCancel', () => {
    const { onCancel } = renderEditor()
    fireEvent.click(screen.getByRole('button', { name: '← 규칙 목록' }))
    fireEvent.click(screen.getByRole('button', { name: '취소' }))
    expect(onCancel).toHaveBeenCalledTimes(2)
  })

  it('실행 시점이 주기보다 위에 온다', () => {
    renderEditor()
    const orderType = screen.getByText('주문 방식')
    const frequency = screen.getByText('주기')
    expect(orderType.compareDocumentPosition(frequency) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
