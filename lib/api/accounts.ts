import { apiFetch } from './client'
import type { Account, AccountRequest } from '@/types/account'

export async function listAccounts(token: string): Promise<Account[]> {
  return apiFetch<Account[]>('/api/accounts', { method: 'GET' }, token)
}

export async function createAccount(data: AccountRequest, token: string): Promise<Account> {
  return apiFetch<Account>('/api/accounts', {
    method: 'POST',
    body: JSON.stringify(data),
  }, token)
}

export async function updateAccount(id: string, data: AccountRequest, token: string): Promise<Account> {
  return apiFetch<Account>(`/api/accounts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }, token)
}

export async function deleteAccount(id: string, token: string): Promise<void> {
  return apiFetch<void>(`/api/accounts/${id}`, { method: 'DELETE' }, token)
}

export async function pauseStrategy(id: string, token: string): Promise<Account> {
  return apiFetch<Account>(`/api/accounts/${id}/strategy/pause`, { method: 'PATCH' }, token)
}

export async function resumeStrategy(id: string, token: string): Promise<Account> {
  return apiFetch<Account>(`/api/accounts/${id}/strategy/resume`, { method: 'PATCH' }, token)
}
