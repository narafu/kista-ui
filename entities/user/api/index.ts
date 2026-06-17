import { apiFetch, clientFetch, fetchEither } from '@shared/lib/api-client'
import type { User, UserRole, UserStatus, AdminUser, AdminStats, AdminAccount, AdminTrade, AdminAuditLog, AdminAnomalies } from '../model/types'

export async function getMe(token: string): Promise<User> {
  return apiFetch<User>('/api/auth/me', { method: 'GET' }, token)
}

export async function getMeClient(): Promise<User> {
  return clientFetch<User>('/api/auth/me', { method: 'GET' })
}

export async function updateBalanceCheckEnabled(enabled: boolean): Promise<void> {
  await clientFetch<void>('/api/settings/balance-check', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  })
}

export async function updateNickname(nickname: string): Promise<void> {
  await clientFetch<void>('/api/settings/nickname', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname }),
  })
}

export async function reapply(): Promise<void> {
  await clientFetch<void>('/api/auth/reapply-done', { method: 'POST' })
}

export async function deleteMe(): Promise<void> {
  await clientFetch<void>('/api/auth/me', { method: 'DELETE' })
}

export async function updateNotificationChannel(channel: string): Promise<void> {
  await clientFetch<void>('/api/settings/notification-channel', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel }),
  })
}

export async function updateTelegram(data: { botToken: string; chatId: string }): Promise<void> {
  await clientFetch<void>('/api/settings/telegram', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function deleteTelegram(): Promise<void> {
  await clientFetch<void>('/api/settings/telegram', { method: 'DELETE' })
}

export async function listAdminUsers(token?: string, status?: UserStatus): Promise<AdminUser[]> {
  const query = status ? `?status=${status}` : ''
  return fetchEither<AdminUser[]>(`/api/admin/users${query}`, { method: 'GET' }, token)
}

export async function approveAdminUser(userId: string): Promise<void> {
  await clientFetch<void>(`/api/admin/users/${userId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'ACTIVE' }),
  })
}

export async function rejectAdminUser(userId: string): Promise<void> {
  await clientFetch<void>(`/api/admin/users/${userId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'REJECTED' }),
  })
}

export async function changeAdminUserRole(userId: string, role: UserRole): Promise<void> {
  await clientFetch<void>(`/api/admin/users/${userId}/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  })
}

export async function deleteAdminUser(userId: string): Promise<void> {
  await clientFetch<void>(`/api/admin/users/${userId}`, { method: 'DELETE' })
}

export async function getAdminStats(token: string): Promise<AdminStats> {
  return apiFetch<AdminStats>('/api/admin/dashboard/stats', { method: 'GET' }, token)
}

export async function listAdminAccounts(token: string): Promise<AdminAccount[]> {
  return apiFetch<AdminAccount[]>('/api/admin/accounts', { method: 'GET' }, token)
}

export async function listAdminTrades(token: string): Promise<AdminTrade[]> {
  return apiFetch<AdminTrade[]>('/api/admin/trades', { method: 'GET' }, token)
}

export async function listAdminAuditLogs(token: string): Promise<AdminAuditLog[]> {
  return apiFetch<AdminAuditLog[]>('/api/admin/audit-logs', { method: 'GET' }, token)
}

export async function getAdminAnomalies(token: string): Promise<AdminAnomalies> {
  return apiFetch<AdminAnomalies>('/api/admin/anomalies', { method: 'GET' }, token)
}
