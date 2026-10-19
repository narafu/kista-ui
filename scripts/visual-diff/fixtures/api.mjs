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

// 오류 로그: 로컬 DB 로그는 최근 며칠 치만 남아 날마다 바뀌고 비어 있을 수도 있다 — 컨텍스트·스택 유무 분기를 고정 3건으로 채운다
const errorLogs = [
  { id: 'fx-err-1', errorType: 'KisApiException', message: 'KIS 토큰 확보 실패(송신 전): KIS 토큰 발급 실패', stackTrace: 'com.kista.tradingcore.broker.domain.model.kis.KisApiException: KIS 토큰 확보 실패\n\tat com.kista.tradingcore.broker.adapter.out.kis.KisHttpClient.executeWithRetry(KisHttpClient.java:114)', context: { caller: 'TradingExceptionHandler' }, createdAt: '2026-10-01T00:16:12Z' },
  { id: 'fx-err-2', errorType: 'ClientError', message: "TypeError: Cannot read properties of undefined (reading 'map')", stackTrace: null, context: { path: '/dashboard', userAgent: 'Mozilla/5.0' }, createdAt: '2026-09-30T08:02:45Z' },
  { id: 'fx-err-3', errorType: 'IllegalStateException', message: '전략 상태가 ACTIVE가 아니어서 주문을 건너뛰었습니다', stackTrace: 'java.lang.IllegalStateException: strategy not active\n\tat com.kista.trading.Strategy.order(Strategy.java:42)', context: {}, createdAt: '2026-09-29T23:30:00Z' },
]

// 운영 설정: VR 정기 입출금 방식을 사용자 변경 허용 + 일부 허용으로 고정한다 — 로컬에서 설정을 바꿔도 허용 체크박스·기본값 라디오(비활성 포함)가 찍히게
const pinRecurringMode = (settings) => {
  if (settings.strategies?.VR?.fields) settings.strategies.VR.fields.recurringMode = { customizable: true, allowedValues: ['DEPOSIT', 'HOLD'], defaultValue: 'HOLD' }
  return settings
}

// fixture 응답은 프록시 메모이즈를 거치지 않는다 — 실행 도중 설정이 바뀌어 head/base가 달라지지 않게 성공 응답을 인증 헤더별로 직접 메모이즈한다
const settingsCache = new Map()
const fetchSettings = async (url, req, upstream) => {
  const up = await fetch(upstream + url.pathname, { headers: { authorization: req.headers.authorization ?? '', cookie: req.headers.cookie ?? '' } })
  return up.ok ? { body: pinRecurringMode(await up.json()) } : { status: up.status, body: await up.json().catch(() => ({})) }
}

export async function route(url, req, { upstream }) {
  if (url.pathname === '/api/admin/privacy-trade-bases') return { body: privacyBases }
  if (url.pathname === '/api/admin/logs/errors') return { body: errorLogs }
  if (url.pathname === '/api/admin/settings') {
    const key = req.headers.authorization ?? req.headers.cookie
    let pending = settingsCache.get(key)
    if (!pending) {
      pending = fetchSettings(url, req, upstream)
      settingsCache.set(key, pending)
      pending.then((r) => { if (r.status) settingsCache.delete(key) }, () => settingsCache.delete(key))
    }
    return pending
  }
}
