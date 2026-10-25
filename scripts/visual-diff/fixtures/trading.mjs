// kista-trading(8081) fixture — 실데이터로는 만들 수 없는 preview 분기(원장 부족·축소·체결·스킵·빈 주문)만 모드로 덮는다.
// 기본 모드 real은 dev 시드 실데이터를 그대로 통과시킨다
import { seed, tickerOf } from '../../shared/seed.mjs'

const MODES = ['real', 'deficit', 'trimmed', 'executed', 'skip', 'empty', 'crypto', 'binance']
let mode = 'real'
export const setMode = (m) => {
  if (!MODES.includes(m)) throw new Error(`unknown mode: ${m}`)
  mode = m
}

const ord = (ticker, direction, quantity, price, orderType = 'LOC') => ({ ticker, orderType, direction, quantity, price })
const placed = (id, ticker, direction, quantity, price, status = 'PLACED') => ({ id, ticker, direction, orderType: 'LOC', quantity, price, status })
const pos = (ticker) => ({ ticker, holdings: 42, averagePrice: '28.1500', usdDeposit: '1234.56', totalAssets: '3773.53', priceOffsetRate: '10.0', currentRound: 31.8, unitAmount: '125.00', referencePrice: '28.15', targetPrice: '30.97' })
const okLedger = { remainingLedger: 1234.56, requiredBuyUsd: 250, sufficient: true, trimmed: false }

function preview(ticker) {
  const orders = [ord(ticker, 'BUY', 4, '28.15'), ord(ticker, 'BUY', 5, '27.50'), ord(ticker, 'SELL', 42, '30.97')]
  const base = { tradeDate: '2026-10-05', position: pos(ticker), orders, skipReason: null, todayOrders: [], otherStrategiesPlannedBuyUsd: '100.00', ledgerCheck: okLedger }
  switch (mode) {
    case 'deficit': return { ...base, ledgerCheck: { ...okLedger, remainingLedger: 177, requiredBuyUsd: 304, sufficient: false } }
    case 'trimmed': return { ...base, ledgerCheck: { ...okLedger, trimmed: true } }
    case 'executed': return { ...base, todayOrders: [placed('p1', ticker, 'BUY', 4, '28.15'), placed('p2', ticker, 'BUY', 5, '27.50', 'FILLED')] }
    case 'skip': return { ...base, orders: [], skipReason: 'SCHEDULED_START_NOT_REACHED' }
    case 'empty': return { ...base, orders: [] }
    default: throw new Error(`no fixture for mode ${mode}`)
  }
}

// crypto: 로컬 DB에 없는 UPBIT 코인 계좌를 합성한다 — 계좌 목록 끝에 붙이고, 이 계좌의 조회는 코인용 응답으로 덮는다.
// 주식 전용 조회(portfolio·margin·prices·daily-trades)가 오면 400 + CRYPTO_GATE_VIOLATION 로그(확인 후 0건이어야 한다)
// binance: 같은 합성 계좌·전략을 BINANCE(USDT)로 바꾼다 — 계좌 통화 USDT·만료일 없음, DCA 금액 10.50, 평단 없는 보유 행.
// meta(BINANCE·최소 주문 금액·시장)와 runtime-config는 브라우저·서버 모두 보므로 fixtures/api.mjs가 같은 모드에서 보강한다
const CRYPTO_ACCOUNT_ID = '00000000-0000-4000-8000-0000000c0170'
const CRYPTO_STRATEGY_ID = '00000000-0000-4000-8000-0000000c0171'
const cryptoAccount = () => mode === 'binance'
  ? { id: CRYPTO_ACCOUNT_ID, nickname: '바이낸스 계좌', accountNoMasked: null, accountNo: null, broker: 'BINANCE', currency: 'USDT', apiKeyExpiresAt: null }
  : { id: CRYPTO_ACCOUNT_ID, nickname: '코인 계좌', accountNoMasked: null, accountNo: null, broker: 'UPBIT', currency: 'KRW', apiKeyExpiresAt: new Date(Date.now() + 10 * 86400_000).toISOString() }
// DCA 다중 규칙 응답 형태(kista-api 6668fafc) — 규칙별 다음 실행·최근 결과를 포함한다
const dcaRule = (ruleKey, direction, orderType, executionHour, sizing, conditions, nextDate, frequency = 'DAILY') => ({
  ruleKey, direction, frequency, dayOfWeek: frequency === 'WEEKLY' ? 'FRIDAY' : null, dayOfMonth: null, orderType, executionHour, sizing, shortfall: 'PARTIAL', conditions,
  nextExecution: { usSessionDate: nextDate, kstTradeDate: nextDate }, lastExecution: null,
})
const cryptoStrategy = () => ({
  id: CRYPTO_STRATEGY_ID, accountId: CRYPTO_ACCOUNT_ID, type: 'DCA', status: 'ACTIVE', ticker: 'BTC', cycleSeedType: 'NONE', isReverseMode: false,
  dca: {
    currentHoldings: '0.01234567', avgPrice: mode === 'binance' ? '100000.12' : '100000000',
    rules: [
      dcaRule('c-buy', 'BUY', 'MARKET', 9, { type: 'AMOUNT', amount: mode === 'binance' ? '10.50' : 50000, percent: null }, [{ indicator: 'RSI', operator: 'LTE', threshold: 30 }], '2026-10-19'),
      dcaRule('c-sell', 'SELL', 'MARKET', 10, { type: 'HOLDING_PERCENT', amount: null, percent: '50.00' }, [{ indicator: 'AVG_PRICE', operator: 'GTE', threshold: 20 }], '2026-10-19'),
    ],
  },
})
// 시드에 주식 DCA 전략이 없어 대조용으로 MOCK 계좌에 합성한다("$" 금액, 시각 없음 확인용)
const STOCK_DCA_ID = '00000000-0000-4000-8000-0000000c0172'
const stockAccountId = seed.infinite.accountId
const stockDca = () => ({
  id: STOCK_DCA_ID, accountId: stockAccountId, type: 'DCA', status: 'ACTIVE', ticker: 'UPRO', cycleSeedType: 'NONE', isReverseMode: false,
  dca: {
    currentHoldings: '3', avgPrice: '80.00',
    rules: [dcaRule('s-buy', 'BUY', 'MOC', null, { type: 'AMOUNT', amount: '300.00', percent: null }, [], '2026-10-10', 'WEEKLY')],
  },
})
const cryptoPortfolio = () => mode === 'binance'
  ? { currency: 'USDT', cash: 120.5, totalAsset: 1478.03, holdings: [
    { ticker: 'BTC', quantity: 0.01234567, avgBuyPrice: 100000.12, currentPrice: 110000.55, evalAmount: 1358.03 },
    { ticker: 'ETH', quantity: 0.5, avgBuyPrice: null, currentPrice: null, evalAmount: null },
  ] }
  : { krwCash: 120000, totalAssetKrw: 1478024, holdings: [
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
  if (mode === 'crypto' || mode === 'binance') {
    const p = url.pathname
    if (p === '/api/accounts') return { body: [...(await upstreamList(url, req, upstream)), cryptoAccount()] }
    if (p === '/api/trading-cycles') return { body: [...(await upstreamList(url, req, upstream)), cryptoStrategy(), stockDca()] }
    if (p === `/api/accounts/${stockAccountId}/trading-cycles`) return { body: [...(await upstreamList(url, req, upstream)), stockDca()] }
    if (p === `/api/trading-cycles/${CRYPTO_STRATEGY_ID}/dca-executions`) return { body: emptyPage }
    if (p === `/api/trading-cycles/${CRYPTO_STRATEGY_ID}/history`) return { body: emptyPage }
    // 같은 날 현재 규칙 1건 + 삭제된 규칙 1건 — 이력의 규칙 열·"삭제된 규칙" 표시 확인용
    if (p === `/api/trading-cycles/${STOCK_DCA_ID}/dca-executions`) return { body: { ...emptyPage, totalElements: 2, content: [
      { ruleKey: 's-buy', direction: 'BUY', kstTradeDate: '2026-10-03', usSessionDate: '2026-10-02', status: 'ORDERED', skipReason: null, detail: null, referencePrice: '98.50', quantity: 3, order: null },
      { ruleKey: 'gone', direction: 'SELL', kstTradeDate: '2026-10-03', usSessionDate: '2026-10-02', status: 'SKIPPED', skipReason: 'INSUFFICIENT_HOLDINGS', detail: null, referencePrice: null, quantity: null, order: null },
    ] } }
    const m = p.match(/^\/api\/accounts\/([^/]+)\/(.+)$/)
    if (m?.[1] === CRYPTO_ACCOUNT_ID) {
      switch (m[2]) {
        case 'crypto-portfolio': return { body: cryptoPortfolio() }
        case 'crypto-prices': return { body: { prices: [{ ticker: 'BTC', price: mode === 'binance' ? 110000.55 : 110000000 }] } }
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
