import { createProxyRoute } from '@shared/lib/proxy/createProxyRoute'

export const { GET, POST, PATCH, DELETE } = createProxyRoute({
  basePath: '/api/admin',
})
