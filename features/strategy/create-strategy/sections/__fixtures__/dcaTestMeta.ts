import type { TradingMarket } from '@shared/lib/api-schema'
import type { OrderAmountRule } from '@entities/meta'

// 테스트 기본 금액 제약 — 업비트(5,000원 정수)와 주식(USD, 하한 없음)
export const testOrderAmount = (market: TradingMarket): OrderAmountRule =>
  market === 'CRYPTO_KRW' ? { min: 5000, scale: 0, currency: 'KRW' } : { min: 0, scale: 2, currency: 'USD' }
