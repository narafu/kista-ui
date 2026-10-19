// kista-api(8080) fixture — 로컬 DB에 없어 실데이터로 만들 수 없는 응답만 덮는다. 나머지는 실데이터를 그대로 통과시킨다
const order = (id, direction, orderType, price, quantity) => ({ id, direction, orderType, price, quantity })
// P 매매표: 로컬 DB에 0건이다. 날짜는 올해 지난 날짜라 기본 '올해' 필터에 걸리고 차트 캔들도 실데이터로 고정된다
const privacyBases = [
  { id: 'fx-privacy-1', releaseDate: '2026-09-29', ticker: 'SOXL', currentCycleStart: 10000, currentCycleRealizedPnl: 0, avgPrice: null, holdings: 0, orders: [
    order('fx-o1', 'BUY', 'LOC', 142.1, 12),
  ] },
  { id: 'fx-privacy-2', releaseDate: '2026-09-30', ticker: 'SOXL', currentCycleStart: 10000, currentCycleRealizedPnl: 0, avgPrice: 142.1, holdings: 12, orders: [
    order('fx-o2', 'BUY', 'LOC', 139.8, 12),
    order('fx-o3', 'SELL', 'LOC', 156.3, 12),
  ] },
  { id: 'fx-privacy-3', releaseDate: '2026-10-01', ticker: 'SOXL', currentCycleStart: 10000, currentCycleRealizedPnl: -123.45, avgPrice: 140.95, holdings: 24, orders: [
    order('fx-o4', 'BUY', 'LOC', 137.5, 13),
    order('fx-o5', 'SELL', 'LIMIT', 158.6, 24),
    order('fx-o6', 'SELL', 'MOC', 150, null),
  ] },
]

export async function route(url) {
  if (url.pathname === '/api/admin/privacy-trade-bases') return { body: privacyBases }
}
