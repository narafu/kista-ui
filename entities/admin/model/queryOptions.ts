import { queryOptions } from '@tanstack/react-query'

import { getAdminStats, getAdminStatsClient, listAdminErrorLogs, listAdminErrorLogsClient, listAdminUsers } from '../api'
import { adminKeys } from './queryKeys'
import type { AdminErrorLogsQueryParams, AdminUsersQueryParams } from './queryKeys'
import type { AdminStats, AdminUser, AppErrorLog } from './types'
import type { UserStatus } from '@shared/lib/api-schema'

export function adminUsersQueryOptions(filter?: UserStatus, params?: AdminUsersQueryParams, token?: string) {
  return queryOptions<AdminUser[]>({
    queryKey: adminKeys.users(filter, params),
    queryFn: () => listAdminUsers(token, filter, params?.from, params?.to),
  })
}

export function adminStatsQueryOptions(token?: string) {
  return queryOptions<AdminStats>({
    queryKey: adminKeys.stats(),
    queryFn: () => token ? getAdminStats(token) : getAdminStatsClient(),
  })
}

export function adminErrorLogsQueryOptions(params?: AdminErrorLogsQueryParams, token?: string) {
  const limit = params?.limit ?? 500
  return queryOptions<AppErrorLog[]>({
    queryKey: adminKeys.errorLogs(params),
    queryFn: () => token
      ? listAdminErrorLogs(token, limit, params?.from, params?.to)
      : listAdminErrorLogsClient(limit, params?.from, params?.to),
  })
}
