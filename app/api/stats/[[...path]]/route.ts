import { createProxyRoute } from '@shared/lib/proxy/createProxyRoute'

export const { GET } = createProxyRoute({
  basePath: '/api/stats',
})
