import { queryOptions } from '@tanstack/react-query'

import { fetchEither } from '@shared/lib/api-client'
import { buildQueryString } from '@shared/lib/query-string'
import { getAdminStats, listAdminErrorLogs, listAdminUsers } from '../api'
import { adminKeys } from './queryKeys'
import type { AdminErrorLogsQueryParams, AdminTradesQueryParams, AdminUsersQueryParams } from './queryKeys'
import type { AdminStats, AdminTrade, AdminUser, AppErrorLog } from './types'
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
    queryFn: () => getAdminStats(token),
  })
}

export function adminErrorLogsQueryOptions(params?: AdminErrorLogsQueryParams, token?: string) {
  const limit = params?.limit ?? 500
  return queryOptions<AppErrorLog[]>({
    queryKey: adminKeys.errorLogs(params),
    queryFn: () => listAdminErrorLogs(limit, params?.from, params?.to, token),
  })
}

// 서버(token)·클라이언트 겸용 — 서버가 prefetch한 캐시를 클라이언트 재시도·무효화가 같은 키로 이어받는다.
// 재주문 워크벤치의 거래 내역이 SSR props가 아니라 이 쿼리를 읽어야 재주문 후 invalidate로 갱신된다.
export function adminTradesQueryOptions(params?: AdminTradesQueryParams, token?: string) {
  return queryOptions<AdminTrade[]>({
    queryKey: adminKeys.trades(params),
    queryFn: () => {
      const query = buildQueryString({ from: params?.from, to: params?.to })
      return fetchEither<AdminTrade[]>(`/api/admin/trades${query}`, { method: 'GET' }, token)
    },
  })
}
