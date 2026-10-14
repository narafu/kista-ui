import type { AdminPrivacyBase } from '@entities/privacy'
import type { Candle } from '@entities/market'

export interface PrivacyChartRow {
  date: string
  close: number | null
  avgPrice: number | null
  cycleStart: number
  // 진행 중 사이클의 실현손익 — 사이클이 끝나면 0으로 돌아가고 그 금액은 사이클 시작금액으로 옮겨간다
  realizedPnl: number
  // 조회 기간 첫날 대비 종료된 사이클들의 손익 합(시작금액 증감분). 연초 재설정 전 누적은 이어받는다
  confirmedPnl: number
  // confirmedPnl + realizedPnl — 진행 중 사이클까지 포함한 누적 실현손익. 첫날은 그날의 진행 사이클 손익에서 시작한다
  cumulativePnl: number
  // 현금 ÷ (현금 + 보유수량 × 종가). 종가나 (보유 중인데) 평단가가 없으면 계산 불가 → null
  cashRatio: number | null
  // 직전 행과 사이클 시작금액이 달라진 날 — 새 사이클 시작 경계선
  cycleBoundary: boolean
  // 툴팁용 방향별 주문 가격 목록
  buys: number[]
  sells: number[]
  // 주문 가격 오버레이용. buy0·buy1…/sell0·sell1… 키로 펼쳐 recharts Line dot으로 찍는다
  // (카테고리 x축에서 날짜당 개수가 가변인 점을 그리는 가장 단순한 방법)
  [orderKey: `buy${number}` | `sell${number}`]: number | undefined
}

export interface PrivacyChartSeries {
  rows: PrivacyChartRow[]
  maxBuyOrders: number
  maxSellOrders: number
}

const CANDLE_LOOKBACK_DAYS = 10 // 첫 발표일 "직전" 거래일 종가까지 받도록 연휴를 덮는 여유
const MAX_CANDLE_RANGE_YEARS = 5 // kista-api candles 기간 조회 상한(초과 시 400)

function shiftDate(date: string, { years = 0, days = 0 }: { years?: number; days?: number }): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCFullYear(d.getUTCFullYear() + years)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// 매매표 발표일 범위를 덮는 종가 조회 기간. from = max(첫 발표일 − 여유, 마지막 발표일 − 5년 + 1일)
export function candleRangeFor(bases: AdminPrivacyBase[]): { from: string; to: string } | null {
  if (bases.length === 0) return null
  const dates = bases.map((b) => b.releaseDate).sort()
  const to = dates[dates.length - 1]
  const wanted = shiftDate(dates[0], { days: -CANDLE_LOOKBACK_DAYS })
  const floor = shiftDate(to, { years: -MAX_CANDLE_RANGE_YEARS, days: 1 })
  return { from: wanted > floor ? wanted : floor, to }
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
  // 사이클 시작금액은 매년 1월 첫 사이클 시작일에 1만 달러로 재설정된다(1월 1일이 아님 — 해를 넘긴 사이클은
  // 끝날 때까지 이전 시작금액을 유지). 그래서 "해가 바뀐 뒤 첫 사이클 경계"는 손익이 아니라 기준 재설정으로 본다 —
  // 직전 날까지의 누적을 carry로 넘기고 새 시작금액을 기준으로 삼는다.
  // ponytail: 조회 기간이 해를 넘긴 사이클 도중(재설정 전)에 시작하면 첫 행의 해를 기준으로 삼아 그 재설정을
  // 손익으로 오판한다 — 실제로 문제가 되면 서버가 재설정 여부를 내려주도록 바꾼다
  let carry = 0
  let baseline = sortedBases[0]?.currentCycleStart ?? 0
  let baselineYear = sortedBases[0]?.releaseDate.slice(0, 4) ?? ''

  const rows = sortedBases.map((base, index) => {
    const close = closeBefore(sortedCandles, base.releaseDate)
    const buyPrices = base.orders.filter((o) => o.direction === 'BUY').map((o) => o.price)
    const sellPrices = base.orders.filter((o) => o.direction === 'SELL').map((o) => o.price)
    const prev = index > 0 ? sortedBases[index - 1] : null
    const cycleBoundary = prev != null && prev.currentCycleStart !== base.currentCycleStart
    const year = base.releaseDate.slice(0, 4)
    if (prev && cycleBoundary && year > baselineYear) {
      // ponytail: 재설정 날 끝난 사이클의 마지막 체결 손익은 직전 행에 없어 누락된다(시작금액이 1만 달러로
      // 덮여 증감으로도 알 수 없음) — 문제가 되면 서버가 종료 사이클 확정 손익을 내려주도록 바꾼다
      carry += prev.currentCycleStart - baseline + prev.currentCycleRealizedPnl
      baseline = base.currentCycleStart
      baselineYear = year
    }
    const confirmedPnl = carry + base.currentCycleStart - baseline
    const row: PrivacyChartRow = {
      date: base.releaseDate,
      close,
      avgPrice: base.avgPrice,
      cycleStart: base.currentCycleStart,
      realizedPnl: base.currentCycleRealizedPnl,
      confirmedPnl,
      cumulativePnl: confirmedPnl + base.currentCycleRealizedPnl,
      cashRatio: cashRatioOf(base, close),
      cycleBoundary,
      buys: buyPrices,
      sells: sellPrices,
    }
    buyPrices.forEach((price, i) => { row[`buy${i}`] = price })
    sellPrices.forEach((price, i) => { row[`sell${i}`] = price })
    maxBuyOrders = Math.max(maxBuyOrders, buyPrices.length)
    maxSellOrders = Math.max(maxSellOrders, sellPrices.length)
    return row
  })

  return { rows, maxBuyOrders, maxSellOrders }
}
