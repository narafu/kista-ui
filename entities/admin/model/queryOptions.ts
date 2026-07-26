import { queryOptions } from '@tanstack/react-query'

import { listAdminUsers } from '../api'
import { adminKeys } from './queryKeys'
import type { AdminUser } from './types'
import type { UserStatus } from '@shared/lib/api-schema'

export function adminUsersQueryOptions(filter?: UserStatus, token?: string) {
  return queryOptions<AdminUser[]>({
    queryKey: adminKeys.users(filter),
    queryFn: () => listAdminUsers(token, filter),
  })
}
