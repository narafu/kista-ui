import { createProxyRoute } from '@shared/lib/proxy/createProxyRoute'
import { cacheTags } from '@shared/lib/cache/tags'

export const { GET, POST, PUT, PATCH, DELETE } = createProxyRoute({
  basePath: '/api/settings',
  revalidateTags: (token) => [cacheTags.user(token)],
})
