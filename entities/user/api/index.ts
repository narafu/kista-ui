import { apiFetch, clientFetch, ApiError } from '@shared/lib/api-client'
import type { User, UserRole, UserStatus, AdminUser, AdminStats, AdminAccount, AdminTrade, AdminAuditLog, AdminAnomalies } from '../model/types'

export async function getMe(token: string): Promise<User> {
  return apiFetch<User>('/api/auth/me', { method: 'GET' }, token)
}

export async function reapply(): Promise<void> {
  const res = await fetch('/api/auth/reapply-done', { method: 'POST' })
  if (!res.ok) {
    let body: unknown
    try { body = await res.json() } catch { body = null }
    throw new ApiError(res.status, body)
  }
}

export async function deleteMe(): Promise<void> {
  await clientFetch<void>('/api/settings/account', { method: 'DELETE' })
}

export async function updateNotificationChannel(channel: string): Promise<void> {
  await clientFetch<void>('/api/settings/notification-channel', {
    method: 'PUT',
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
  if (token) return apiFetch<AdminUser[]>(`/api/admin/users${query}`, { method: 'GET' }, token)
  return clientFetch<AdminUser[]>(`/api/admin/users${query}`)
}

export async function approveAdminUser(userId: string): Promise<void> {
  const res = await fetch(`/api/admin/users/${userId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'ACTIVE' }),
  })
  if (!res.ok) throw new Error(`approve failed: ${res.status}`)
}

export async function rejectAdminUser(userId: string): Promise<void> {
  const res = await fetch(`/api/admin/users/${userId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'REJECTED' }),
  })
  if (!res.ok) throw new Error(`reject failed: ${res.status}`)
}

export async function changeAdminUserRole(userId: string, role: UserRole): Promise<void> {
  const res = await fetch(`/api/admin/users/${userId}/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  })
  if (!res.ok) throw new Error(`changeRole failed: ${res.status}`)
}

export async function deleteAdminUser(userId: string): Promise<void> {
  const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`deleteUser failed: ${res.status}`)
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
