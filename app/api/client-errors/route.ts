import { createProxyRoute } from '@shared/lib/proxy/createProxyRoute'

export const { POST } = createProxyRoute({
  basePath: '/api/client-errors',
  requireAuth: false, // 로그인 전 화면(error.tsx/global-error.tsx)에서도 오류 리포트 필요
})
