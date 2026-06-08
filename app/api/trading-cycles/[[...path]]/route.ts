import { createProxyRoute } from '@shared/lib/proxy/createProxyRoute'
import { cacheTags } from '@shared/lib/cache/tags'

export const { GET, POST, PUT, PATCH, DELETE } = createProxyRoute({
  basePath: '/api/trading-cycles',
  revalidateTags: (token) => [cacheTags.strategies(token)],
})
