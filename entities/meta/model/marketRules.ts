import type { TickerMeta } from './types'

const STOCK_MARKET = 'US_STOCK'

// 주식 시장에서 거래되는 티커인지 — 서버 메타가 주식 외 티커를 함께 보내는 동안 거르는 화이트리스트. markets가 없는 응답(1h 캐시)은 단수 market으로 폴백, 둘 다 없으면 주식
export function isStockTicker(ticker: TickerMeta | undefined): boolean {
  if (!ticker) return false
  return ticker.markets ? ticker.markets.includes(STOCK_MARKET) : (ticker.market ?? STOCK_MARKET) === STOCK_MARKET
}
