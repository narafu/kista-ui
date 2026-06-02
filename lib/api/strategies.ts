import { apiFetch, clientFetch } from './client'
import { toNum } from '@/lib/utils'
import type { CycleSeedType, Strategy, StrategyRequest } from '@/types/strategy'
import type { PlacedOrder } from '@/types/preview'

function normalizeStrategy(raw: unknown): Strategy {
  const s = raw as Record<string, unknown>
  return {
    id: String(s.id),
    accountId: String(s.accountId),
    type: String(s.type),
    status: String(s.status),
    ticker: String(s.ticker),
    cycleSeedType: (s.cycleSeedType as CycleSeedType) ?? 'NONE',
    initialUsdDeposit: s.initialUsdDeposit != null ? toNum(s.initialUsdDeposit) : undefined,
  }
}

export async function listStrategies(accountId: string, token?: string): Promise<Strategy[]> {
  if (token) {
    const raw = await apiFetch<unknown[]>(`/api/accounts/${accountId}/trading-cycles`, {}, token)
    return raw.map(normalizeStrategy)
  }
  const raw = await clientFetch<unknown[]>(`/api/accounts/${accountId}/trading-cycles`)
  return raw.map(normalizeStrategy)
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
  const raw = await clientFetch<unknown>(`/api/accounts/${accountId}/trading-cycles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return normalizeStrategy(raw)
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
  const raw = await clientFetch<unknown>(`/api/trading-cycles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return normalizeStrategy(raw)
}

export async function deleteStrategy(id: string, token?: string): Promise<void> {
  if (token) return apiFetch<void>(`/api/trading-cycles/${id}`, { method: 'DELETE' }, token)
  await clientFetch<void>(`/api/trading-cycles/${id}`, { method: 'DELETE' })
}

export async function pauseStrategy(id: string, token?: string): Promise<void> {
  if (token) return apiFetch<void>(`/api/trading-cycles/${id}/pause`, { method: 'PATCH' }, token)
  await clientFetch<void>(`/api/trading-cycles/${id}/pause`, { method: 'PATCH' })
}

export async function resumeStrategy(id: string, token?: string): Promise<void> {
  if (token) return apiFetch<void>(`/api/trading-cycles/${id}/resume`, { method: 'PATCH' }, token)
  await clientFetch<void>(`/api/trading-cycles/${id}/resume`, { method: 'PATCH' })
}

function normalizePlacedOrder(raw: unknown): PlacedOrder {
  const o = raw as Record<string, unknown>
  return {
    id: String(o.id),
    ticker: String(o.ticker),
    direction: String(o.direction) as 'BUY' | 'SELL',
    orderType: String(o.orderType),
    quantity: Number(o.quantity),
    price: String(o.price),
  }
}

export async function executeStrategy(id: string): Promise<PlacedOrder[]> {
  const raw = await clientFetch<{ orders?: unknown[] } | undefined>(
    `/api/trading-cycles/${id}/execute`,
    { method: 'POST' }
  )
  return (raw?.orders ?? []).map(normalizePlacedOrder)
}
