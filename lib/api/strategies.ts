import { apiFetch, ApiError } from './client'
import type { Strategy, StrategyRequest } from '@/types/strategy'

export async function listStrategies(accountId: string, token?: string): Promise<Strategy[]> {
  if (token) return apiFetch<Strategy[]>(`/api/accounts/${accountId}/strategies`, {}, token)
  const res = await fetch(`/api/accounts/${accountId}/strategies`)
  if (!res.ok) throw new ApiError(res.status, null)
  return res.json()
}

export async function createStrategy(accountId: string, data: StrategyRequest, token?: string): Promise<Strategy> {
  if (token) return apiFetch<Strategy>(`/api/accounts/${accountId}/strategies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }, token)
  const res = await fetch(`/api/accounts/${accountId}/strategies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new ApiError(res.status, null)
  return res.json()
}

export async function updateStrategy(id: string, data: Partial<StrategyRequest>, token?: string): Promise<Strategy> {
  if (token) return apiFetch<Strategy>(`/api/strategies/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }, token)
  const res = await fetch(`/api/strategies/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new ApiError(res.status, null)
  return res.json()
}

export async function deleteStrategy(id: string, token?: string): Promise<void> {
  if (token) return apiFetch<void>(`/api/strategies/${id}`, { method: 'DELETE' }, token)
  const res = await fetch(`/api/strategies/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new ApiError(res.status, null)
}

export async function pauseStrategy(id: string, token?: string): Promise<void> {
  if (token) return apiFetch<void>(`/api/strategies/${id}/pause`, { method: 'PATCH' }, token)
  const res = await fetch(`/api/strategies/${id}/pause`, { method: 'PATCH' })
  if (!res.ok) throw new ApiError(res.status, null)
}

export async function resumeStrategy(id: string, token?: string): Promise<void> {
  if (token) return apiFetch<void>(`/api/strategies/${id}/resume`, { method: 'PATCH' }, token)
  const res = await fetch(`/api/strategies/${id}/resume`, { method: 'PATCH' })
  if (!res.ok) throw new ApiError(res.status, null)
}
