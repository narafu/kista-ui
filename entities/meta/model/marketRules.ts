import { brokerCurrency, CURRENCY_SCALE, type Currency, type TradingMarket } from '@shared/lib/api-schema'
import type { BrokerMeta, TickerMeta } from './types'

export interface OrderAmountRule {
  min: number
  scale: number
  currency: Currency
}

// 메타 필드가 빠진 응답(배포 직후 1h 메타 캐시)에서만 쓰는 폴백 — 값은 kista-api 시장 최소 주문 금액과 같다
const FALLBACK_MIN_ORDER: Record<Currency, number> = { KRW: 5000, USDT: 5, USD: 0 }

// 코인 DCA 회차 금액 제약 — 메타가 SSOT, 필드가 빠지면 통화별 폴백. 서버 400이 최종 방어선이다
export function orderAmountRuleOf(broker: string, meta: BrokerMeta | undefined): OrderAmountRule {
  const currency = brokerCurrency(broker)
  const min = Number(meta?.minOrderAmount ?? FALLBACK_MIN_ORDER[currency])
  return { min: Number.isFinite(min) ? min : FALLBACK_MIN_ORDER[currency], scale: meta?.amountScale ?? CURRENCY_SCALE[currency], currency }
}

// 티커가 그 시장에서 거래되는지 — markets가 없는 응답(1h 캐시)은 단수 market으로 폴백
export function tickerTradesIn(ticker: TickerMeta | undefined, market: TradingMarket): boolean {
  if (!ticker) return false
  return ticker.markets ? ticker.markets.includes(market) : (ticker.market ?? 'US_STOCK') === market
}
