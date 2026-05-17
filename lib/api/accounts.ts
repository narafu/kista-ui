import { apiFetch, ApiError } from './client'
import type { Account, AccountRequest } from '@/types/account'

export async function listAccounts(token: string): Promise<Account[]> {
  return apiFetch<Account[]>('/api/accounts', { method: 'GET' }, token)
}

export async function createAccount(data: AccountRequest, token?: string): Promise<Account> {
  if (token) return apiFetch<Account>('/api/accounts', { method: 'POST', body: JSON.stringify(data) }, token)
  const res = await fetch('/api/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new ApiError(res.status, null)
  return res.json()
}

export async function updateAccount(id: string, data: AccountRequest, token?: string): Promise<Account> {
  if (token) return apiFetch<Account>(`/api/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token)
  const res = await fetch(`/api/accounts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new ApiError(res.status, null)
  return res.json()
}

export async function deleteAccount(id: string, token?: string): Promise<void> {
  if (token) return apiFetch<void>(`/api/accounts/${id}`, { method: 'DELETE' }, token)
  const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new ApiError(res.status, null)
}

export async function pauseStrategy(id: string, token?: string): Promise<void> {
  if (token) return apiFetch<void>(`/api/accounts/${id}/strategy/pause`, { method: 'PATCH' }, token)
  const res = await fetch(`/api/accounts/${id}/strategy/pause`, { method: 'PATCH' })
  if (!res.ok) throw new ApiError(res.status, null)
}

export async function resumeStrategy(id: string, token?: string): Promise<void> {
  if (token) return apiFetch<void>(`/api/accounts/${id}/strategy/resume`, { method: 'PATCH' }, token)
  const res = await fetch(`/api/accounts/${id}/strategy/resume`, { method: 'PATCH' })
  if (!res.ok) throw new ApiError(res.status, null)
}
