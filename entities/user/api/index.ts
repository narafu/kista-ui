import { apiFetch, clientFetch, fetchEither, jsonBody } from '@shared/lib/api-client'
import type { User, UserRole, UserStatus, AdminUser, AdminStats, AdminAccount, AdminTrade, AdminAuditLog, AdminAnomalies, AppErrorLog } from '../model/types'

export async function getMe(token: string): Promise<User> {
  return apiFetch<User>('/api/auth/me', { method: 'GET' }, token)
}

export async function getMeClient(): Promise<User> {
  return clientFetch<User>('/api/auth/me', { method: 'GET' })
}

export async function updateNotificationPref(type: string, enabled: boolean): Promise<void> {
  await clientFetch<void>(`/api/settings/notifications/${type}`, jsonBody('PATCH', { enabled }))
}

export async function updateBalanceCheckEnabled(enabled: boolean): Promise<void> {
  await clientFetch<void>('/api/settings/balance-check', jsonBody('PATCH', { enabled }))
}

export async function updateNickname(nickname: string): Promise<void> {
  await clientFetch<void>('/api/settings/nickname', jsonBody('PATCH', { nickname }))
}

export async function reapply(): Promise<void> {
  await clientFetch<void>('/api/auth/reapply-done', { method: 'POST' })
}

export async function deleteMe(): Promise<void> {
  await clientFetch<void>('/api/auth/me', { method: 'DELETE' })
}

export async function updateNotificationChannel(channel: string): Promise<void> {
  await clientFetch<void>('/api/settings/notification-channel', jsonBody('PATCH', { channel }))
}

export async function updateTelegram(data: { botToken: string; chatId: string }): Promise<void> {
  await clientFetch<void>('/api/settings/telegram', jsonBody('PUT', data))
}

export async function deleteTelegram(): Promise<void> {
  await clientFetch<void>('/api/settings/telegram', { method: 'DELETE' })
}

export async function listAdminUsers(
  token?: string,
  status?: UserStatus,
  from?: string,
  to?: string,
): Promise<AdminUser[]> {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const query = params.size ? `?${params}` : ''
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

export async function getAdminStats(token: string): Promise<AdminStats> {
  return apiFetch<AdminStats>('/api/admin/dashboard/stats', { method: 'GET' }, token)
}

export async function listAdminAccounts(token: string, from?: string, to?: string): Promise<AdminAccount[]> {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const query = params.size ? `?${params}` : ''
  return apiFetch<AdminAccount[]>(`/api/admin/accounts${query}`, { method: 'GET' }, token)
}

export async function listAdminTrades(token: string, from?: string, to?: string): Promise<AdminTrade[]> {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const query = params.size ? `?${params}` : ''
  return apiFetch<AdminTrade[]>(`/api/admin/trades${query}`, { method: 'GET' }, token)
}

export async function listAdminAuditLogs(token: string, from?: string, to?: string): Promise<AdminAuditLog[]> {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const query = params.size ? `?${params}` : ''
  return apiFetch<AdminAuditLog[]>(`/api/admin/logs/audit${query}`, { method: 'GET' }, token)
}

export async function getAdminAnomalies(token: string, inactiveDays?: number, from?: string, to?: string): Promise<AdminAnomalies> {
  const params = new URLSearchParams()
  if (inactiveDays != null) params.set('inactiveDays', String(inactiveDays))
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const query = params.size ? `?${params}` : ''
  return apiFetch<AdminAnomalies>(`/api/admin/logs/anomalies${query}`, { method: 'GET' }, token)
}

export async function listAdminErrorLogs(token: string, limit = 100, from?: string, to?: string): Promise<AppErrorLog[]> {
  const params = new URLSearchParams({ limit: String(limit) })
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  return apiFetch<AppErrorLog[]>(`/api/admin/logs/errors?${params}`, { method: 'GET' }, token)
}
