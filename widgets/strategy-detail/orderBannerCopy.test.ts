import { describe, expect, it } from 'vitest'
import { ApiError } from '@shared/lib/api-client'
import type { OrderWarning } from '@entities/order'
import { directionUnplacedMessage, estimateSubtitle, nextOrderBannerText, pausedSkipReasonLabel, previewErrorMsg, recurringModeLabel } from './orderBannerCopy'

// 서버 OrderPreviewWarning이 만든 문장 그대로 — 클라는 다시 조립하지 않는다
const LEDGER: OrderWarning = { code: 'LEDGER_SHORTFALL', detail: '전략 원장 예수금이 부족해 매수가 접수되지 않습니다(원장 $50.00 / 필요 $100.00).' }
const CASH: OrderWarning = { code: 'ACCOUNT_CASH_SHORTFALL', detail: '계좌 예수금이 부족해 매수가 거절될 수 있습니다(주문가능 $30.00 / 계좌 전체 접수 필요 $200.00).' }
const CASH_PARTIAL: OrderWarning = { code: 'ACCOUNT_CASH_PARTIAL', detail: '계좌 예수금이 부족해 보정 주문이 거절될 수 있습니다(주문가능 $250.00 / 계좌 전체 접수 필요 $326.41 · 보정 주문 제외 $210.81).' }
const HOLDINGS: OrderWarning = { code: 'HOLDINGS_SHORTFALL', detail: '보유 수량이 부족해 매도가 거절될 수 있습니다(판매가능 5 / 종목 전체 필요 12).' }
const BUY_UNPLACED: OrderWarning = { code: 'BUY_UNPLACED', detail: '접수 시점이 지난 매수 주문이 오늘 접수되지 않았습니다.' }

describe('nextOrderBannerText', () => {
  it('skips empty warning details when joining the banner text', () => {
    expect(nextOrderBannerText(true, 'executed', false, null, [{ code: 'LEDGER_SHORTFALL', detail: '' }, { code: 'HOLDINGS_SHORTFALL', detail: '보유 부족' }])).toBe('보유 부족')
  })

  it('returns null when the strategy cannot execute, regardless of market status or warnings', () => {
    const result = nextOrderBannerText(false, 'preview', true, '미국 증시 휴장 여부를 확인하지 못했습니다', [LEDGER])

    expect(result).toBeNull()
  })

  it('surfaces the market status message in preview mode before the server warnings', () => {
    const result = nextOrderBannerText(true, 'preview', true, '미국 증시 휴장 여부를 확인하는 중입니다', [LEDGER])

    expect(result).toBe('미국 증시 휴장 여부를 확인하는 중입니다')
  })

  it('shows the fixed holiday message in preview mode (holiday wins over warnings)', () => {
    expect(nextOrderBannerText(true, 'preview', true, null, [])).toBe('오늘은 휴장일입니다')
    expect(nextOrderBannerText(true, 'preview', true, null, [LEDGER])).toBe('오늘은 휴장일입니다')
  })

  it.each(['preview', 'executed'] as const)('shows the server detail as-is for each shortfall in %s mode', (mode) => {
    expect(nextOrderBannerText(true, mode, false, null, [LEDGER])).toBe(LEDGER.detail)
    expect(nextOrderBannerText(true, mode, false, null, [CASH])).toBe(CASH.detail)
    expect(nextOrderBannerText(true, mode, false, null, [CASH_PARTIAL])).toBe(CASH_PARTIAL.detail)
  })

  it('puts each warning on its own line in the server order and leaves unplaced warnings to the unplaced list', () => {
    expect(nextOrderBannerText(true, 'executed', false, null, [CASH, HOLDINGS, BUY_UNPLACED])).toBe(`${CASH.detail}\n${HOLDINGS.detail}`)
  })

  it('returns null when there are no warnings or only unplaced warnings', () => {
    expect(nextOrderBannerText(true, 'preview', false, null, [])).toBeNull()
    expect(nextOrderBannerText(true, 'executed', false, null, [BUY_UNPLACED])).toBeNull()
  })
})

describe('directionUnplacedMessage', () => {
  it('explains the ledger rejection for BUY (no retry) and promises a retry otherwise', () => {
    expect(directionUnplacedMessage('BUY', [LEDGER])).toBe('전략 원장 예수금 부족으로 매수 미접수')
    expect(directionUnplacedMessage('BUY', [CASH])).toBe('계좌 예수금 부족으로 매수 거절 가능')
    expect(directionUnplacedMessage('BUY', [CASH_PARTIAL])).toBe('계좌 예수금 부족으로 보정 주문 거절 가능')
    expect(directionUnplacedMessage('BUY', [])).toBe('장 마감 시 매수 예정')
  })

  it('says SELL will be retried at market close unless holdings are short', () => {
    expect(directionUnplacedMessage('SELL', [LEDGER])).toBe('장 마감 시 매도 재시도 예정')
    expect(directionUnplacedMessage('SELL', [HOLDINGS])).toBe('보유 수량 부족으로 매도 거절 가능')
  })
})

describe('recurringModeLabel', () => {
  it('labels a positive recurring amount as saving mode with the amount', () => {
    expect(recurringModeLabel(200)).toBe('적립식($200.00)')
  })

  it('labels a zero recurring amount as hold mode', () => {
    expect(recurringModeLabel(0)).toBe('거치식')
  })

  it('labels a negative recurring amount as withdrawal mode with the absolute amount', () => {
    expect(recurringModeLabel(-100)).toBe('인출식($100.00)')
  })
})

describe('previewErrorMsg', () => {
  it('shows a not-found message for a 404 ApiError', () => {
    expect(previewErrorMsg(new ApiError(404, 'not found'))).toBe('전략 사이클 정보를 찾을 수 없습니다.')
  })

  it.each([
    [503, '증권사 API 조회에 실패했습니다. 잠시 후 다시 시도해주세요'],
    [422, '증권사 API 키가 유효하지 않습니다'],
  ])('shows the server detail for a %i ApiError', (status, detail) => {
    expect(previewErrorMsg(new ApiError(status, { detail }))).toBe(detail)
  })

  it('falls back to the generic message for a masked 5xx without detail', () => {
    expect(previewErrorMsg(new ApiError(500, { error: 'Failed' }))).toBe('주문 미리보기를 불러오는 중 오류가 발생했습니다.')
  })

  it('shows a generic message for any other error', () => {
    expect(previewErrorMsg(new Error('boom'))).toBe('주문 미리보기를 불러오는 중 오류가 발생했습니다.')
  })
})

describe('pausedSkipReasonLabel', () => {
  it('사이클 종료만 일시중지용 문구로 바꾼다', () => {
    expect(pausedSkipReasonLabel('CYCLE_ENDED')).toBe('사이클이 종료되었습니다.\n재개하면 새 사이클이 시작됩니다.')
    expect(pausedSkipReasonLabel('NO_PRIVACY_BASE')).toBe('P 매매표가 없습니다.')
  })
})

describe('휴장 표시 — 서버 marketClosedToday', () => {
  it.each([true, false])('서버 값(%s)이 있으면 클라 휴장 판정 배너를 쓰지 않고 경고만 남긴다', (closed) => {
    expect(nextOrderBannerText(true, 'preview', true, '미국 증시 휴장 여부를 확인하는 중입니다', [], closed)).toBeNull()
    expect(nextOrderBannerText(true, 'preview', true, null, [{ code: 'HOLDINGS_SHORTFALL', detail: '보유 부족' }], closed)).toBe('보유 부족')
  })

  it('부제는 거래일을 M/D(요일)로 쓴다', () => {
    expect(estimateSubtitle('2026-12-01')).toBe('12/1(화) 거래일 예상 주문')
  })
})
