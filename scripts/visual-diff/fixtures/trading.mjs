// kista-trading(8081) fixture — 실데이터로는 만들 수 없는 preview 분기(부족·불확실·체결·스킵·빈 주문)만 모드로 덮는다.
// 기본 모드 real은 dev 시드 실데이터를 그대로 통과시킨다
import { seed, tickerOf } from '../../shared/seed.mjs'

const MODES = ['real', 'deficit', 'uncertain', 'executed', 'skip', 'empty', 'crypto']
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

// crypto: 로컬 DB에 없는 UPBIT 코인 계좌를 합성한다 — 계좌 목록 끝에 붙이고, 이 계좌의 조회는 코인용 응답으로 덮는다.
// 주식 전용 조회(portfolio·margin·prices·daily-trades)가 오면 400 + CRYPTO_GATE_VIOLATION 로그(확인 후 0건이어야 한다)
const CRYPTO_ACCOUNT_ID = '00000000-0000-4000-8000-0000000c0170'
const CRYPTO_STRATEGY_ID = '00000000-0000-4000-8000-0000000c0171'
const cryptoAccount = () => ({ id: CRYPTO_ACCOUNT_ID, nickname: '코인 계좌', accountNoMasked: null, accountNo: null, broker: 'UPBIT', currency: 'KRW', apiKeyExpiresAt: new Date(Date.now() + 10 * 86400_000).toISOString() })
const cryptoStrategy = () => ({
  id: CRYPTO_STRATEGY_ID, accountId: CRYPTO_ACCOUNT_ID, type: 'DCA', status: 'ACTIVE', ticker: 'BTC', cycleSeedType: 'NONE', isReverseMode: false,
  dca: { direction: 'BUY', amount: 50000, orderType: 'MARKET', frequency: 'DAILY', dayOfWeek: null, dayOfMonth: null, executionHour: 9, conditions: [], nextExecution: { usSessionDate: '2026-10-19', kstTradeDate: '2026-10-19' }, lastExecution: null },
})
// 시드에 주식 DCA 전략이 없어 대조용으로 MOCK 계좌에 합성한다("$" 금액, 시각 없음 확인용)
const STOCK_DCA_ID = '00000000-0000-4000-8000-0000000c0172'
const stockAccountId = seed.infinite.accountId
const stockDca = () => ({
  id: STOCK_DCA_ID, accountId: stockAccountId, type: 'DCA', status: 'ACTIVE', ticker: 'UPRO', cycleSeedType: 'NONE', isReverseMode: false,
  dca: { direction: 'BUY', amount: '300.00', orderType: 'MOC', frequency: 'WEEKLY', dayOfWeek: 'FRIDAY', dayOfMonth: null, executionHour: null, conditions: [], nextExecution: { usSessionDate: '2026-10-09', kstTradeDate: '2026-10-10' }, lastExecution: null },
})
const cryptoPortfolio = { krwCash: 120000, totalAssetKrw: 1478024, holdings: [
  { ticker: 'BTC', quantity: 0.01234567, avgBuyPrice: 100000000, currentPrice: 110000000, evalAmountKrw: 1358024 },
  { ticker: 'ETH', quantity: 0.5, avgBuyPrice: 5000000, currentPrice: null, evalAmountKrw: 0 },
] }
const emptyPage = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, last: true, hasNext: false }
// 실패를 []로 삼키지 않는다 — 던지면 프록시의 catch가 502로 응답하고 proxy.log에 남긴다
const upstreamList = async (url, req, upstream) => {
  const headers = { authorization: req.headers.authorization ?? '', cookie: req.headers.cookie ?? '' }
  const r = await fetch(upstream + url.pathname, { headers })
  if (!r.ok) throw new Error(`upstream ${r.status} ${url.pathname}`)
  return r.json()
}

export async function route(url, req, { upstream, log }) {
  if (mode === 'crypto') {
    const p = url.pathname
    if (p === '/api/accounts') return { body: [...(await upstreamList(url, req, upstream)), cryptoAccount()] }
    if (p === '/api/trading-cycles') return { body: [...(await upstreamList(url, req, upstream)), cryptoStrategy(), stockDca()] }
    if (p === `/api/accounts/${stockAccountId}/trading-cycles`) return { body: [...(await upstreamList(url, req, upstream)), stockDca()] }
    if (p === `/api/trading-cycles/${CRYPTO_STRATEGY_ID}/dca-executions`) return { body: emptyPage }
    if (p === `/api/trading-cycles/${CRYPTO_STRATEGY_ID}/history`) return { body: emptyPage }
    const m = p.match(/^\/api\/accounts\/([^/]+)\/(.+)$/)
    if (m?.[1] === CRYPTO_ACCOUNT_ID) {
      switch (m[2]) {
        case 'crypto-portfolio': return { body: cryptoPortfolio }
        case 'trading-cycles': return { body: [cryptoStrategy()] }
        case 'trading-cycles/previews': return { body: {} }
        case 'cycle-history': return { body: emptyPage }
        case 'portfolio': case 'margin': case 'prices': case 'daily-trades':
          log(`CRYPTO_GATE_VIOLATION ${p}`)
          return { status: 400, body: { title: 'CRYPTO_GATE_VIOLATION' } }
      }
    }
    return
  }
  if (mode === 'real') return
  let m
  if ((m = url.pathname.match(/^\/api\/trading-cycles\/([^/]+)\/preview$/))) return { body: preview(tickerOf(m[1])) }
  if ((m = url.pathname.match(/^\/api\/accounts\/([^/]+)\/trading-cycles\/previews$/)) && seed.accounts[m[1]]) {
    return { body: Object.fromEntries(Object.entries(seed.accounts[m[1]]).map(([id, ticker]) => [id, preview(ticker)])) }
  }
}
