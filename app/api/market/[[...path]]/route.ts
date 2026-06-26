import { createProxyRoute } from '@shared/lib/proxy/createProxyRoute'

export const { GET } = createProxyRoute({
  basePath: '/api/market',
  requireAuth: false, // GET /api/market/** — kista-api에서 비인증 허용 (대시보드 공개 접근)
})
