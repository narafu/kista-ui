import type { AdminPrivacyBase } from '@entities/privacy'
import type { Candle } from '@entities/market'

export interface PrivacyChartRow {
  date: string
  close: number | null
  avgPrice: number | null
  holdings: number
  realizedPnl: number
  // 현금 ÷ (현금 + 보유수량 × 종가). 종가나 (보유 중인데) 평단가가 없으면 계산 불가 → null
  cashRatio: number | null
  // 직전 행과 사이클 시작금액이 달라진 날 — 새 사이클 시작 경계선
  cycleBoundary: boolean
  // 주문 가격 오버레이용. buy0·buy1…/sell0·sell1… 키로 펼쳐 recharts Line dot으로 찍는다
  // (카테고리 x축에서 날짜당 개수가 가변인 점을 그리는 가장 단순한 방법)
  [orderKey: `buy${number}` | `sell${number}`]: number | undefined
}

export interface PrivacyChartSeries {
  rows: PrivacyChartRow[]
  maxBuyOrders: number
  maxSellOrders: number
}

// 발표일 기준 평가 종가 = 발표일 "이전" 가장 최근 거래일 종가. 매매표는 직전 정규장 마감 후
// 상태라 같은 날짜의 종가(아직 열리지 않은 장)를 쓰면 미래 값이 섞인다.
function closeBefore(sortedCandles: Candle[], date: string): number | null {
  let close: number | null = null
  for (const candle of sortedCandles) {
    if (candle.date >= date) break
    close = candle.close
  }
  return close
}

// 현금 = 사이클 시작금액 + 사이클 실현손익 − 평단가 × 보유수량 (실현손익은 현금 회수, 별도 입출금 없음 가정)
function cashRatioOf(base: AdminPrivacyBase, close: number | null): number | null {
  if (close == null) return null
  if (base.holdings > 0 && base.avgPrice == null) return null
  const cost = base.holdings > 0 ? (base.avgPrice ?? 0) * base.holdings : 0
  const cash = base.currentCycleStart + base.currentCycleRealizedPnl - cost
  const equity = cash + base.holdings * close
  return equity > 0 ? cash / equity : null
}

export function buildPrivacyChartSeries(bases: AdminPrivacyBase[], candles: Candle[]): PrivacyChartSeries {
  const sortedCandles = [...candles].sort((a, b) => a.date.localeCompare(b.date))
  const sortedBases = [...bases].sort((a, b) => a.releaseDate.localeCompare(b.releaseDate))
  let maxBuyOrders = 0
  let maxSellOrders = 0

  const rows = sortedBases.map((base, index) => {
    const close = closeBefore(sortedCandles, base.releaseDate)
    const row: PrivacyChartRow = {
      date: base.releaseDate,
      close,
      avgPrice: base.avgPrice,
      holdings: base.holdings,
      realizedPnl: base.currentCycleRealizedPnl,
      cashRatio: cashRatioOf(base, close),
      cycleBoundary: index > 0 && sortedBases[index - 1].currentCycleStart !== base.currentCycleStart,
    }
    const buyPrices = base.orders.filter((o) => o.direction === 'BUY').map((o) => o.price)
    const sellPrices = base.orders.filter((o) => o.direction === 'SELL').map((o) => o.price)
    buyPrices.forEach((price, i) => { row[`buy${i}`] = price })
    sellPrices.forEach((price, i) => { row[`sell${i}`] = price })
    maxBuyOrders = Math.max(maxBuyOrders, buyPrices.length)
    maxSellOrders = Math.max(maxSellOrders, sellPrices.length)
    return row
  })

  return { rows, maxBuyOrders, maxSellOrders }
}
