// kista-trading(8081) fixture — 실데이터로는 만들 수 없는 preview 분기(원장 부족·축소·체결·스킵·빈 주문)만 모드로 덮는다.
// 기본 모드 real은 dev 시드 실데이터를 그대로 통과시킨다
import { seed, tickerOf } from '../../shared/seed.mjs'

const MODES = ['real', 'deficit', 'trimmed', 'executed', 'skip', 'empty', 'dca']
let mode = 'real'
export const setMode = (m) => {
  if (!MODES.includes(m)) throw new Error(`unknown mode: ${m}`)
  mode = m
}

const ord = (ticker, direction, quantity, price, orderType = 'LOC', timing = 'AT_CLOSE') => ({ ticker, orderType, timing, direction, quantity, price })
const placed = (id, ticker, direction, quantity, price, status = 'PLACED') => ({ id, ticker, direction, orderType: 'LOC', timing: 'AT_CLOSE', quantity, price, status })
const pos = (ticker) => ({ ticker, holdings: 42, averagePrice: '28.1500', deposit: '1234.56', totalAssets: '3773.53', priceOffsetRate: '10.0', currentRound: 31.8, unitAmount: '125.00', referencePrice: '28.15', targetPrice: '30.97' })
const okLedger = { remainingLedger: 1234.56, requiredBuyUsd: 250, sufficient: true, trimmed: false }

function preview(ticker) {
  const orders = [ord(ticker, 'BUY', 4, '28.15'), ord(ticker, 'BUY', 5, '27.50'), ord(ticker, 'SELL', 42, '30.97', 'LIMIT', 'AT_OPEN')] // INFINITE 목표가 매도 = LIMIT 개장 선접수
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

// dca: 시드 무한매수 계좌에 주식 DCA 전략 1건을 합성한다 — 상세·목록의 규칙 요약·실행 이력 확인용. 런타임 설정의 DCA 활성화는 fixtures/api.mjs가 같은 모드에서 보강한다
// DCA 다중 규칙 응답 형태(kista-api 6668fafc) — 규칙별 다음 실행·최근 결과를 포함한다
const dcaRule = (ruleKey, direction, orderType, sizing, conditions, nextDate, frequency = 'DAILY') => ({
  ruleKey, direction, frequency, dayOfWeek: frequency === 'WEEKLY' ? 'FRIDAY' : null, dayOfMonth: null, orderType, sizing, shortfall: 'PARTIAL', conditions,
  nextExecution: { usSessionDate: nextDate, kstTradeDate: nextDate }, lastExecution: null,
})
// 시드에 주식 DCA 전략이 없어 MOCK 계좌에 합성한다("$" 금액 확인용)
const STOCK_DCA_ID = '00000000-0000-4000-8000-0000000c0172'
const stockAccountId = seed.infinite.accountId
const stockDca = () => ({
  id: STOCK_DCA_ID, accountId: stockAccountId, type: 'DCA', status: 'ACTIVE', ticker: 'UPRO', cycleSeedType: 'NONE', isReverseMode: false,
  dca: {
    currentHoldings: '3', avgPrice: '80.00',
    rules: [dcaRule('s-buy', 'BUY', 'MOC', { type: 'AMOUNT', amount: '300.00', percent: null }, [], '2026-10-10', 'WEEKLY')],
  },
})
const emptyPage = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, last: true, hasNext: false }
// 실패를 []로 삼키지 않는다 — 던지면 프록시의 catch가 502로 응답하고 proxy.log에 남긴다
const upstreamList = async (url, req, upstream) => {
  const headers = { authorization: req.headers.authorization ?? '', cookie: req.headers.cookie ?? '' }
  const r = await fetch(upstream + url.pathname, { headers })
  if (!r.ok) throw new Error(`upstream ${r.status} ${url.pathname}`)
  return r.json()
}

export async function route(url, req, { upstream }) {
  if (mode === 'dca') {
    const p = url.pathname
    if (p === '/api/trading-cycles') return { body: [...(await upstreamList(url, req, upstream)), stockDca()] }
    if (p === `/api/accounts/${stockAccountId}/trading-cycles`) return { body: [...(await upstreamList(url, req, upstream)), stockDca()] }
    // 같은 날 현재 규칙 1건 + 삭제된 규칙 1건 — 이력의 규칙 열·"삭제된 규칙" 표시 확인용
    if (p === `/api/trading-cycles/${STOCK_DCA_ID}/dca-executions`) return { body: { ...emptyPage, totalElements: 2, content: [
      { ruleKey: 's-buy', direction: 'BUY', kstTradeDate: '2026-10-03', usSessionDate: '2026-10-02', status: 'ORDERED', skipReason: null, detail: null, referencePrice: '98.50', quantity: 3, order: null },
      { ruleKey: 'gone', direction: 'SELL', kstTradeDate: '2026-10-03', usSessionDate: '2026-10-02', status: 'SKIPPED', skipReason: 'INSUFFICIENT_HOLDINGS', detail: null, referencePrice: null, quantity: null, order: null },
    ] } }
    return
  }
  if (mode === 'real') return
  let m
  if ((m = url.pathname.match(/^\/api\/trading-cycles\/([^/]+)\/preview$/))) return { body: preview(tickerOf(m[1])) }
  if ((m = url.pathname.match(/^\/api\/accounts\/([^/]+)\/trading-cycles\/previews$/)) && seed.accounts[m[1]]) {
    return { body: Object.fromEntries(Object.entries(seed.accounts[m[1]]).map(([id, ticker]) => [id, preview(ticker)])) }
  }
}
