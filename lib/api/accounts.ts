import { apiFetch, clientFetch } from './client'
import type { Account, AccountRequest } from '@/types/account'

export async function listAccounts(token: string): Promise<Account[]> {
  return apiFetch<Account[]>('/api/accounts', { method: 'GET' }, token)
}

export async function createAccount(data: AccountRequest, token?: string): Promise<Account> {
  if (token) return apiFetch<Account>('/api/accounts', { method: 'POST', body: JSON.stringify(data) }, token)
  return clientFetch<Account>('/api/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function updateAccount(id: string, data: AccountRequest, token?: string): Promise<Account> {
  if (token) return apiFetch<Account>(`/api/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token)
  return clientFetch<Account>(`/api/accounts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function deleteAccount(id: string, token?: string): Promise<void> {
  if (token) return apiFetch<void>(`/api/accounts/${id}`, { method: 'DELETE' }, token)
  await clientFetch<void>(`/api/accounts/${id}`, { method: 'DELETE' })
}

