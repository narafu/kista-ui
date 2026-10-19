import { createProxyRoute } from '@shared/lib/proxy/createProxyRoute'

export const { GET } = createProxyRoute({
  basePath: '/api/crypto-market-indicators',
  requireAuth: false, // kista-trading에서 비인증 GET 허용 (대시보드 공개 접근)
  target: 'trading',
})
