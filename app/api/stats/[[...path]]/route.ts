import { createProxyRoute } from '@shared/lib/proxy/createProxyRoute'

export const { GET } = createProxyRoute({
  basePath: '/api/stats',
  // housing-benchmark*는 root(kista-api)의 StatsController 소유, 나머지(summary/equity-curve/cycles)는 trading-core
  target: (segments) => (segments[0] === 'housing-benchmark' ? 'api' : 'trading'),
})
