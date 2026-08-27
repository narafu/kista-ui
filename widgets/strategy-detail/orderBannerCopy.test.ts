import { describe, expect, it } from 'vitest'
import { ApiError } from '@shared/lib/api-client'
import type { DirectionReadiness, OrderReadiness } from '@entities/order'
import { nextOrderBannerText, previewErrorMsg, recurringModeLabel } from './orderBannerCopy'

function direction(overrides: Partial<DirectionReadiness> = {}): DirectionReadiness {
  return {
    hasOrders: false,
    unplaced: false,
    hasDeficit: false,
    uncertain: false,
    deficitAmount: 0,
    ...overrides,
  }
}

function readiness(overrides: Partial<OrderReadiness> = {}): OrderReadiness {
  return {
    buy: direction(),
    sell: direction(),
    ...overrides,
  }
}

describe('nextOrderBannerText', () => {
  it('returns null when the strategy cannot execute, regardless of market status or deficits', () => {
    const result = nextOrderBannerText(
      false,
      'preview',
      true,
      '미국 증시 휴장 여부를 확인하지 못했습니다',
      readiness({ buy: direction({ hasOrders: true, hasDeficit: true, deficitAmount: 100 }) }),
    )

    expect(result).toBeNull()
  })

  it('surfaces the market status message in preview mode before checking holiday/deficit state', () => {
    const result = nextOrderBannerText(
      true,
      'preview',
      true,
      '미국 증시 휴장 여부를 확인하는 중입니다',
      readiness({ buy: direction({ hasOrders: true, hasDeficit: true, deficitAmount: 100 }) }),
    )

    expect(result).toBe('미국 증시 휴장 여부를 확인하는 중입니다')
  })

  it('shows the fixed holiday message in preview mode when the market status is confirmed but no loading/error message exists', () => {
    const result = nextOrderBannerText(true, 'preview', true, null, readiness())

    expect(result).toBe('오늘은 휴장일입니다')
  })

  it('joins BUY deficit and SELL deficit messages with a middle dot when both occur simultaneously (preview mode has no attempt to retry yet)', () => {
    const result = nextOrderBannerText(
      true,
      'preview',
      false,
      null,
      readiness({
        buy: direction({ hasOrders: true, hasDeficit: true, deficitAmount: 100 }),
        sell: direction({ hasOrders: true, hasDeficit: true, deficitAmount: 3 }),
      }),
    )

    expect(result).toBe('예수금 $100.00 부족 · 판매가능수량 3주 부족')
  })

  it('appends the schedule-specific follow-up wording in executed mode (BUY has not been attempted yet, SELL will be retried)', () => {
    const result = nextOrderBannerText(
      true,
      'executed',
      false,
      null,
      readiness({
        buy: direction({ hasOrders: true, hasDeficit: true, deficitAmount: 100 }),
        sell: direction({ hasOrders: true, hasDeficit: true, deficitAmount: 3 }),
      }),
    )

    expect(result).toBe('예수금 $100.00 부족(장 마감 시 매수 예정) · 판매가능수량 3주 부족(장 마감 시 매도 재시도 예정)')
  })

  it('shows the uncertain check-failed message in preview mode when the live balance lookup failed', () => {
    const result = nextOrderBannerText(
      true,
      'preview',
      false,
      null,
      readiness({ buy: direction({ hasOrders: true, uncertain: true }) }),
    )

    expect(result).toBe('예수금 확인 실패 — 잠시 후 다시 확인해주세요')
  })

  it('does not surface the uncertain check-failed message in executed mode (the unplaced-direction list already covers it)', () => {
    const result = nextOrderBannerText(
      true,
      'executed',
      false,
      null,
      readiness({ buy: direction({ hasOrders: true, uncertain: true }) }),
    )

    expect(result).toBeNull()
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

  it('shows a broker-outage message for a 503 ApiError', () => {
    expect(previewErrorMsg(new ApiError(503, 'unavailable'))).toBe('증권사 API에 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
  })

  it('shows a generic message for any other error', () => {
    expect(previewErrorMsg(new Error('boom'))).toBe('주문 미리보기를 불러오는 중 오류가 발생했습니다.')
  })
})
