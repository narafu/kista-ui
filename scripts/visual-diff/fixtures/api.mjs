// kista-api(8080) fixture — 나머지는 dev 시드 실데이터를 그대로 쓴다.
// etf-series만 채운다: 09:00 KST cron에서만 수집돼 로컬에는 최근 구간이 비어 있다
const dates = ['2026-07-01', '2026-07-15', '2026-08-01', '2026-08-15', '2026-09-01', '2026-09-15', '2026-10-01']

export function route(url) {
  if (url.pathname === '/api/stats/housing-benchmark/etf-series') {
    return { body: { points: dates.map((d, i) => ({ tradeDate: d, close: 560 + i * 4 })) } }
  }
}
