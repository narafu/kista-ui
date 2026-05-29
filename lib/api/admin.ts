import { apiFetch } from './client'
import type { AdminUser, AdminStats, AdminAccount, AdminTrade, AdminAuditLog, AdminAnomalies } from '@/types/admin'
import type { UserRole, UserStatus } from '@/types/user'

// 사용자 목록 조회 (status 필터 옵션) — Server Component에서 token으로 직접 호출
export async function listAdminUsers(token: string, status?: UserStatus): Promise<AdminUser[]> {
  const query = status ? `?status=${status}` : ''
  return apiFetch<AdminUser[]>(`/api/admin/users${query}`, { method: 'GET' }, token)
}

// 사용자 승인 — Client Component에서 Route Handler 경유 호출 (token 불필요)
export async function approveAdminUser(userId: string): Promise<void> {
  const res = await fetch(`/api/admin/users/${userId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'ACTIVE' }),
  })
  if (!res.ok) throw new Error(`approve failed: ${res.status}`)
}

// 사용자 거절 — Client Component에서 Route Handler 경유 호출
export async function rejectAdminUser(userId: string): Promise<void> {
  const res = await fetch(`/api/admin/users/${userId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'REJECTED' }),
  })
  if (!res.ok) throw new Error(`reject failed: ${res.status}`)
}

// 역할 변경 — Client Component에서 Route Handler 경유 호출
export async function changeAdminUserRole(userId: string, role: UserRole): Promise<void> {
  const res = await fetch(`/api/admin/users/${userId}/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  })
  if (!res.ok) throw new Error(`changeRole failed: ${res.status}`)
}

// 대시보드 통계 — Server Component에서 token으로 직접 호출
export async function getAdminStats(token: string): Promise<AdminStats> {
  return apiFetch<AdminStats>('/api/admin/dashboard/stats', { method: 'GET' }, token)
}

// 계좌 목록 — Server Component에서 token으로 직접 호출
export async function listAdminAccounts(token: string): Promise<AdminAccount[]> {
  return apiFetch<AdminAccount[]>('/api/admin/accounts', { method: 'GET' }, token)
}

// 거래 내역 — Server Component에서 token으로 직접 호출
export async function listAdminTrades(token: string): Promise<AdminTrade[]> {
  return apiFetch<AdminTrade[]>('/api/admin/trades', { method: 'GET' }, token)
}

// 감사 로그 — Server Component에서 token으로 직접 호출
export async function listAdminAuditLogs(token: string): Promise<AdminAuditLog[]> {
  return apiFetch<AdminAuditLog[]>('/api/admin/audit-logs', { method: 'GET' }, token)
}

// 이상 징후 — Server Component에서 token으로 직접 호출
export async function getAdminAnomalies(token: string): Promise<AdminAnomalies> {
  return apiFetch<AdminAnomalies>('/api/admin/anomalies', { method: 'GET' }, token)
}
