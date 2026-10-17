import { apiFetch, clientFetch, fetchEither, jsonBody } from '@shared/lib/api-client'
import { buildQueryString } from '@shared/lib/query-string'
import type {
  AdminUser,
  AdminStats,
  AdminAccount,
  AdminAuditLog,
  AdminAnomalies,
  AppErrorLog,
  AdminStrategy,
  AdminStrategyOrder,
  AdminReorderRequest,
  AdminReorderResponse,
  AdminReorderTimingAvailability,
  AdminReorderBuyBudget,
} from '../model/types'
import type { UserRole, UserStatus } from '@shared/lib/api-schema'

export async function listAdminUsers(
  token?: string,
  status?: UserStatus,
  from?: string,
  to?: string,
): Promise<AdminUser[]> {
  const query = buildQueryString({ status, from, to })
  return fetchEither<AdminUser[]>(`/api/admin/users${query}`, { method: 'GET' }, token)
}

export async function approveAdminUser(userId: string): Promise<void> {
  await clientFetch<void>(`/api/admin/users/${userId}/status`, jsonBody('PATCH', { status: 'ACTIVE' }))
}

export async function rejectAdminUser(userId: string): Promise<void> {
  await clientFetch<void>(`/api/admin/users/${userId}/status`, jsonBody('PATCH', { status: 'REJECTED' }))
}

export async function changeAdminUserRole(userId: string, role: UserRole): Promise<void> {
  await clientFetch<void>(`/api/admin/users/${userId}/role`, jsonBody('PATCH', { role }))
}

export async function deleteAdminUser(userId: string): Promise<void> {
  await clientFetch<void>(`/api/admin/users/${userId}`, { method: 'DELETE' })
}

export async function getAdminStats(token?: string): Promise<AdminStats> {
  return fetchEither<AdminStats>('/api/admin/dashboard/stats', { method: 'GET' }, token)
}

export async function listAdminAccounts(token?: string, from?: string, to?: string): Promise<AdminAccount[]> {
  const query = buildQueryString({ from, to })
  return fetchEither<AdminAccount[]>(`/api/admin/accounts${query}`, { method: 'GET' }, token)
}

export async function listAdminStrategies(accountId: string, token?: string): Promise<AdminStrategy[]> {
  return fetchEither<AdminStrategy[]>(`/api/admin/accounts/${accountId}/strategies`, { method: 'GET' }, token)
}

export async function listAdminStrategyOrders(
  accountId: string,
  strategyId: string,
  tradeDate: string,
  token?: string,
): Promise<AdminStrategyOrder[]> {
  const params = new URLSearchParams({ tradeDate })
  return fetchEither<AdminStrategyOrder[]>(
    `/api/admin/accounts/${accountId}/strategies/${strategyId}/orders?${params.toString()}`,
    { method: 'GET' },
    token,
  )
}

export async function updateAdminStrategyStatus(accountId: string, strategyId: string, status: AdminStrategy['status']): Promise<void> {
  await clientFetch<void>(
    `/api/admin/accounts/${accountId}/strategies/${strategyId}/status`,
    jsonBody('PATCH', { status }),
  )
}

export async function reorderAdminOrder(request: AdminReorderRequest): Promise<AdminReorderResponse> {
  return clientFetch<AdminReorderResponse>('/api/admin/trades/reorders', jsonBody('POST', request))
}

export async function getReorderTimingAvailability(): Promise<AdminReorderTimingAvailability> {
  return clientFetch<AdminReorderTimingAvailability>('/api/admin/trades/reorder-timing', { method: 'GET' })
}

export async function getReorderBuyBudget(orderIds: string[], tradeDate: string): Promise<AdminReorderBuyBudget> {
  const params = new URLSearchParams([...orderIds.map((id) => ['orderIds', id]), ['tradeDate', tradeDate]])
  return clientFetch<AdminReorderBuyBudget>(`/api/admin/trades/reorder-buy-budget?${params}`, { method: 'GET' })
}

export async function listAdminAuditLogs(token: string, from?: string, to?: string): Promise<AdminAuditLog[]> {
  const query = buildQueryString({ from, to })
  return apiFetch<AdminAuditLog[]>(`/api/admin/logs/audit${query}`, { method: 'GET' }, token)
}

export async function getAdminAnomalies(token: string, inactiveDays?: number, from?: string, to?: string): Promise<AdminAnomalies> {
  const query = buildQueryString({ inactiveDays, from, to })
  return apiFetch<AdminAnomalies>(`/api/admin/logs/anomalies${query}`, { method: 'GET' }, token)
}

export async function listAdminErrorLogs(limit = 100, from?: string, to?: string, token?: string): Promise<AppErrorLog[]> {
  const query = buildQueryString({ limit, from, to })
  return fetchEither<AppErrorLog[]>(`/api/admin/logs/errors${query}`, { method: 'GET' }, token)
}

export async function softDeleteAdminErrorLog(id: string): Promise<void> {
  await clientFetch<void>(`/api/admin/logs/errors/${id}`, { method: 'DELETE' })
}
