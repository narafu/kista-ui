import { apiFetch, ApiError } from './client'
import type { MetaBundle, StrategyTypeMeta, TickerMeta, EnumMeta } from '@/types/meta'

export async function getMetaBundle(token?: string): Promise<MetaBundle> {
  if (token) return apiFetch<MetaBundle>('/api/meta', {}, token)
  const res = await fetch('/api/meta')
  if (!res.ok) throw new ApiError(res.status, null)
  return res.json()
}

export async function listStrategyTypes(token?: string): Promise<StrategyTypeMeta[]> {
  if (token) return apiFetch<StrategyTypeMeta[]>('/api/meta/strategy-types', {}, token)
  const res = await fetch('/api/meta/strategy-types')
  if (!res.ok) throw new ApiError(res.status, null)
  return res.json()
}

export async function listTickers(token?: string): Promise<TickerMeta[]> {
  if (token) return apiFetch<TickerMeta[]>('/api/meta/tickers', {}, token)
  const res = await fetch('/api/meta/tickers')
  if (!res.ok) throw new ApiError(res.status, null)
  return res.json()
}

export async function listBrokers(token?: string): Promise<EnumMeta[]> {
  if (token) return apiFetch<EnumMeta[]>('/api/meta/brokers', {}, token)
  const res = await fetch('/api/meta/brokers')
  if (!res.ok) throw new ApiError(res.status, null)
  return res.json()
}

export async function listStrategyStatuses(token?: string): Promise<EnumMeta[]> {
  if (token) return apiFetch<EnumMeta[]>('/api/meta/strategy-statuses', {}, token)
  const res = await fetch('/api/meta/strategy-statuses')
  if (!res.ok) throw new ApiError(res.status, null)
  return res.json()
}
