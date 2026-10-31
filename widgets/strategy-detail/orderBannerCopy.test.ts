import { describe, expect, it } from 'vitest'
import { ApiError } from '@shared/lib/api-client'
import type { DirectionReadiness, LedgerCheck, OrderReadiness } from '@entities/order'
import { directionUnplacedMessage, nextOrderBannerText, pausedSkipReasonLabel, previewErrorMsg, recurringModeLabel } from './orderBannerCopy'

const BUY_DIRECTION: DirectionReadiness = { hasOrders: true, unplaced: false }
const NO_DIRECTION: DirectionReadiness = { hasOrders: false, unplaced: false }
const SHORT: LedgerCheck = { remainingLedger: 50, requiredBuyUsd: 100, sufficient: false, trimmed: false }
const CASH_SHORT = { availableUsd: 30, requiredBuyUsd: 200, correctionBuyUsd: 0, sufficient: false }
const HOLDINGS_SHORT = { availableQuantity: 5, requiredSellQuantity: 12, sufficient: false }

function readiness(overrides: Partial<OrderReadiness> = {}): OrderReadiness {
  return {
    buy: NO_DIRECTION,
    sell: NO_DIRECTION,
    ledgerShortfall: null,
    ledgerTrimmed: false,
    accountCashShortfall: null,
    accountCashPartial: false,
    correctionExcludedBuyUsd: null,
    holdingsShortfall: null,
    ...overrides,
  }
}

describe('nextOrderBannerText', () => {
  it('returns null when the strategy cannot execute, regardless of market status or shortfall', () => {
    const result = nextOrderBannerText(false, 'preview', true, '미국 증시 휴장 여부를 확인하지 못했습니다', readiness({ buy: BUY_DIRECTION, ledgerShortfall: SHORT }))

    expect(result).toBeNull()
  })

  it('surfaces the market status message in preview mode before checking holiday/shortfall state', () => {
    const result = nextOrderBannerText(true, 'preview', true, '미국 증시 휴장 여부를 확인하는 중입니다', readiness({ buy: BUY_DIRECTION, ledgerShortfall: SHORT }))

    expect(result).toBe('미국 증시 휴장 여부를 확인하는 중입니다')
  })

  it('shows the fixed holiday message in preview mode when the market status is confirmed but no loading/error message exists', () => {
    const result = nextOrderBannerText(true, 'preview', true, null, readiness())

    expect(result).toBe('오늘은 휴장일입니다')
  })

  it.each(['preview', 'executed'] as const)('shows the ledger shortfall without a retry promise in %s mode', (mode) => {
    const result = nextOrderBannerText(true, mode, false, null, readiness({ buy: BUY_DIRECTION, ledgerShortfall: SHORT }))

    expect(result).toBe('전략 원장 예수금 부족(원장 $50.00 / 필요 $100.00)')
  })

  it.each(['preview', 'executed'] as const)('shows the account cash shortfall with the account-wide requirement in %s mode', (mode) => {
    const result = nextOrderBannerText(true, mode, false, null, readiness({ buy: BUY_DIRECTION, accountCashShortfall: CASH_SHORT }))

    expect(result).toBe('계좌 예수금 부족(주문가능 $30.00 / 계좌 전체 접수 필요 $200.00)')
  })

  it('adds the amount excluding correction orders to the account cash shortfall', () => {
    const cash = { availableUsd: 100, requiredBuyUsd: 326.41, correctionBuyUsd: 115.6, sufficient: false }

    expect(nextOrderBannerText(true, 'executed', false, null, readiness({ buy: BUY_DIRECTION, accountCashShortfall: cash, correctionExcludedBuyUsd: 210.81 })))
      .toBe('계좌 예수금 부족(주문가능 $100.00 / 계좌 전체 접수 필요 $326.41 · 보정 주문 제외 $210.81)')
  })

  it('softens to a partial rejection warning when excluding correction orders makes the cash sufficient', () => {
    const cash = { availableUsd: 250, requiredBuyUsd: 326.41, correctionBuyUsd: 115.6, sufficient: false }

    expect(nextOrderBannerText(true, 'executed', false, null, readiness({ buy: BUY_DIRECTION, accountCashShortfall: cash, accountCashPartial: true, correctionExcludedBuyUsd: 210.81 })))
      .toBe('일부 매수 주문 접수 거절 가능(주문가능 $250.00 / 계좌 전체 접수 필요 $326.41 · 보정 주문 제외 $210.81)')
  })

  it('shows the holdings shortfall on its own line under a buy shortfall', () => {
    const result = nextOrderBannerText(true, 'executed', false, null, readiness({ buy: BUY_DIRECTION, accountCashShortfall: CASH_SHORT, holdingsShortfall: HOLDINGS_SHORT }))

    expect(result).toBe('계좌 예수금 부족(주문가능 $30.00 / 계좌 전체 접수 필요 $200.00)\n보유 수량 부족(판매가능 5주 / 종목 전체 필요 12주)')
  })

  it('returns null when the ledger is sufficient', () => {
    expect(nextOrderBannerText(true, 'preview', false, null, readiness({ buy: BUY_DIRECTION }))).toBeNull()
  })
})

describe('directionUnplacedMessage', () => {
  it('explains the ledger rejection for BUY (no retry) and promises a retry otherwise', () => {
    expect(directionUnplacedMessage('BUY', readiness({ ledgerShortfall: SHORT }))).toBe('전략 원장 예수금 부족으로 매수 미접수')
    expect(directionUnplacedMessage('BUY', readiness({ accountCashShortfall: CASH_SHORT }))).toBe('계좌 예수금 부족으로 매수 거절 가능')
    expect(directionUnplacedMessage('BUY', readiness({ accountCashShortfall: CASH_SHORT, accountCashPartial: true }))).toBe('계좌 예수금 부족으로 일부 매수 주문 접수 거절 가능')
    expect(directionUnplacedMessage('BUY', readiness())).toBe('장 마감 시 매수 예정')
  })

  it('always says SELL will be retried at market close', () => {
    expect(directionUnplacedMessage('SELL', readiness({ ledgerShortfall: SHORT }))).toBe('장 마감 시 매도 재시도 예정')
    expect(directionUnplacedMessage('SELL', readiness({ holdingsShortfall: HOLDINGS_SHORT }))).toBe('보유 수량 부족으로 매도 거절 가능')
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
