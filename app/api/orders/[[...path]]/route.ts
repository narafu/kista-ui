import { createProxyRoute } from '@shared/lib/proxy/createProxyRoute'

export const { GET, DELETE } = createProxyRoute({
  basePath: '/api/orders',
})
