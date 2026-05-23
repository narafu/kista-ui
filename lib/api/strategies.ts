import { apiFetch, ApiError } from './client'
import type { Strategy, StrategyRequest } from '@/types/strategy'

function normalizeStrategy(raw: unknown): Strategy {
  const s = raw as Record<string, unknown>
  return {
    id: String(s.id),
    accountId: String(s.accountId),
    type: String(s.type),
    status: String(s.status),
    ticker: String(s.ticker),
    multiple: String(s.multiple),
  }
}

export async function listStrategies(accountId: string, token?: string): Promise<Strategy[]> {
  if (token) {
    const raw = await apiFetch<unknown[]>(`/api/accounts/${accountId}/trading-cycles`, {}, token)
    return raw.map(normalizeStrategy)
  }
  const res = await fetch(`/api/accounts/${accountId}/trading-cycles`)
  if (!res.ok) throw new ApiError(res.status, null)
  const raw = await res.json()
  return (raw as unknown[]).map(normalizeStrategy)
}

export async function createStrategy(accountId: string, data: StrategyRequest, token?: string): Promise<Strategy> {
  if (token) {
    const raw = await apiFetch<unknown>(`/api/accounts/${accountId}/trading-cycles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }, token)
    return normalizeStrategy(raw)
  }
  const res = await fetch(`/api/accounts/${accountId}/trading-cycles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new ApiError(res.status, null)
  return normalizeStrategy(await res.json())
}

export async function updateStrategy(id: string, data: Partial<StrategyRequest>, token?: string): Promise<Strategy> {
  if (token) {
    const raw = await apiFetch<unknown>(`/api/trading-cycles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }, token)
    return normalizeStrategy(raw)
  }
  const res = await fetch(`/api/trading-cycles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new ApiError(res.status, null)
  return normalizeStrategy(await res.json())
}

export async function deleteStrategy(id: string, token?: string): Promise<void> {
  if (token) return apiFetch<void>(`/api/trading-cycles/${id}`, { method: 'DELETE' }, token)
  const res = await fetch(`/api/trading-cycles/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new ApiError(res.status, null)
}

export async function pauseStrategy(id: string, token?: string): Promise<void> {
  if (token) return apiFetch<void>(`/api/trading-cycles/${id}/pause`, { method: 'PATCH' }, token)
  const res = await fetch(`/api/trading-cycles/${id}/pause`, { method: 'PATCH' })
  if (!res.ok) throw new ApiError(res.status, null)
}

export async function resumeStrategy(id: string, token?: string): Promise<void> {
  if (token) return apiFetch<void>(`/api/trading-cycles/${id}/resume`, { method: 'PATCH' }, token)
  const res = await fetch(`/api/trading-cycles/${id}/resume`, { method: 'PATCH' })
  if (!res.ok) throw new ApiError(res.status, null)
}
