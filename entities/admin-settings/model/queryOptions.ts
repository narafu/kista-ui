import { queryOptions } from '@tanstack/react-query'

import { getAdminSettings } from '../api'
import type { AdminSettings } from './types'

export const adminSettingsKeys = {
  all: ['admin-settings'] as const,
}

export function adminSettingsQueryOptions(token?: string) {
  return queryOptions<AdminSettings>({
    queryKey: adminSettingsKeys.all,
    queryFn: () => getAdminSettings(token),
    staleTime: 0,
  })
}
