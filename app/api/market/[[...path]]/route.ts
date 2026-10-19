import { createProxyRoute } from '@shared/lib/proxy/createProxyRoute'

export const { GET } = createProxyRoute({
  basePath: '/api/market',
  requireAuth: false, // GET /api/market/** — kista-api에서 비인증 허용 (대시보드 공개 접근). Bearer를 넘기지 않으므로 사용자별 응답 엔드포인트는 여기 두지 않는다
})
