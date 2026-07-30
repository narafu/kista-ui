import { queryOptions } from '@tanstack/react-query'

import { getAdminSettings } from '../api'
import { adminSettingsKeys } from './queryKeys'
import type { AdminSettings } from './types'

export function adminSettingsQueryOptions(token?: string) {
  return queryOptions<AdminSettings>({
    queryKey: adminSettingsKeys.all,
    queryFn: () => getAdminSettings(token),
    staleTime: 0,
  })
}
