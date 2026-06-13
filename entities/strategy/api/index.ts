import { clientFetch, fetchEither } from '@shared/lib/api-client'
import { toNum } from '@shared/lib/utils'
import type { CycleSeedType, Strategy, StrategyRequest } from '../model/types'
import type { PlacedOrder } from '@entities/order/model/types'

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
    divisionCount: s.divisionCount != null ? Number(s.divisionCount) : 20,
  }
}

export async function listAllStrategies(token?: string): Promise<Strategy[]> {
  const raw = await fetchEither<unknown[]>(`/api/trading-cycles`, undefined, token)
  return raw.map(normalizeStrategy)
}

export async function listStrategies(accountId: string, token?: string): Promise<Strategy[]> {
  const raw = await fetchEither<unknown[]>(`/api/accounts/${accountId}/trading-cycles`, undefined, token)
  return raw.map(normalizeStrategy)
}

export async function createStrategy(accountId: string, data: StrategyRequest, token?: string): Promise<Strategy> {
  const raw = await fetchEither<unknown>(`/api/accounts/${accountId}/trading-cycles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }, token)
  return normalizeStrategy(raw)
}

export async function updateStrategy(id: string, data: Partial<StrategyRequest>, token?: string): Promise<Strategy> {
  const raw = await fetchEither<unknown>(`/api/trading-cycles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }, token)
  return normalizeStrategy(raw)
}

export async function deleteStrategy(id: string, token?: string): Promise<void> {
  return fetchEither<void>(`/api/trading-cycles/${id}`, { method: 'DELETE' }, token)
}

export async function pauseStrategy(id: string, token?: string): Promise<void> {
  return fetchEither<void>(`/api/trading-cycles/${id}/pause`, { method: 'PATCH' }, token)
}

export async function resumeStrategy(id: string, token?: string): Promise<void> {
  return fetchEither<void>(`/api/trading-cycles/${id}/resume`, { method: 'PATCH' }, token)
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
  return (raw?.orders ?? []).map(normalizePlacedOrder).filter((o) => o.id && o.id !== 'null')
}
