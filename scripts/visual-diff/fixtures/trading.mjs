// kista-trading(8081) fixture — 실데이터로는 만들 수 없는 preview 분기(부족·불확실·체결·스킵·빈 주문)만 모드로 덮는다.
// 기본 모드 real은 dev 시드 실데이터를 그대로 통과시킨다
import { seed, tickerOf } from '../seed.mjs'

export const MODES = ['real', 'deficit', 'uncertain', 'executed', 'skip', 'empty']
let mode = 'real'
export const setMode = (m) => {
  if (!MODES.includes(m)) throw new Error(`unknown mode: ${m}`)
  mode = m
}

const ord = (ticker, direction, quantity, price, orderType = 'LOC') => ({ ticker, orderType, direction, quantity, price })
const placed = (id, ticker, direction, quantity, price, status = 'PLACED') => ({ id, ticker, direction, orderType: 'LOC', quantity, price, status })
const pos = (ticker) => ({ ticker, holdings: 42, averagePrice: '28.1500', usdDeposit: '1234.56', totalAssets: '3773.53', priceOffsetRate: '10.0', currentRound: 31.8, unitAmount: '125.00', referencePrice: '28.15', targetPrice: '30.97' })
const okComp = { sufficientBudget: true, availableDeposit: '1234.56', requiredForThisStrategy: '250.00', consumedByHigherPriority: '0', blockedByHigherPriority: [], uncertainStrategyIds: [], liveBalanceUnavailable: false }
const okSell = { sufficientQuantity: true, sellableQuantity: 42, reservedQuantity: 0, requiredQuantity: 42, liveQuantityUnavailable: false }

function preview(ticker) {
  const orders = [ord(ticker, 'BUY', 4, '28.15'), ord(ticker, 'BUY', 5, '27.50'), ord(ticker, 'SELL', 42, '30.97')]
  const base = { tradeDate: '2026-10-05', position: pos(ticker), orders, skipReason: null, todayOrders: [], otherStrategiesPlannedBuyUsd: '100.00', competition: okComp, sellSufficiency: okSell }
  switch (mode) {
    case 'deficit': return { ...base, competition: { ...okComp, sufficientBudget: false, availableDeposit: '100.00', consumedByHigherPriority: '50.00', blockedByHigherPriority: [{ strategyId: 'x', type: 'VR', ticker: 'TQQQ', requiredBuyUsd: '50.00', priority: 1 }] }, sellSufficiency: { ...okSell, sufficientQuantity: false, sellableQuantity: 10 } }
    case 'uncertain': return { ...base, competition: { ...okComp, liveBalanceUnavailable: true }, sellSufficiency: { ...okSell, liveQuantityUnavailable: true } }
    case 'executed': return { ...base, todayOrders: [placed('p1', ticker, 'BUY', 4, '28.15'), placed('p2', ticker, 'BUY', 5, '27.50', 'FILLED')] }
    case 'skip': return { ...base, orders: [], skipReason: 'SCHEDULED_START_NOT_REACHED' }
    case 'empty': return { ...base, orders: [] }
    default: throw new Error(`no fixture for mode ${mode}`)
  }
}

export function route(url) {
  if (mode === 'real') return
  let m
  if ((m = url.pathname.match(/^\/api\/trading-cycles\/([^/]+)\/preview$/))) return { body: preview(tickerOf(m[1])) }
  if ((m = url.pathname.match(/^\/api\/accounts\/([^/]+)\/trading-cycles\/previews$/)) && seed.accounts[m[1]]) {
    return { body: Object.fromEntries(Object.entries(seed.accounts[m[1]]).map(([id, ticker]) => [id, preview(ticker)])) }
  }
}
