import { createProxyRoute } from '@shared/lib/proxy/createProxyRoute'

export const { GET, POST, PUT, PATCH, DELETE } = createProxyRoute({
  basePath: '/api/finance',
})
