import { clientFetch, fetchEither, jsonBody } from '@shared/lib/api-client'
import { toNum } from '@shared/lib/utils'
import type { CycleSeedType, ReconfigureVrRequest, Strategy, StrategyRequest, StrategySeedPreview, StrategyVrSummary } from '../model/types'
import type { PlacedOrder } from '@shared/model/placed-order'

// VR 요약 숫자 문자열 → number 변환
function normalizeVrSummary(raw: unknown): StrategyVrSummary | undefined {
  if (raw == null) return undefined
  const v = raw as Record<string, unknown>
  return {
    value: toNum(v.value),
    bandWidth: toNum(v.bandWidth),
    intervalWeeks: Number(v.intervalWeeks),
    recurringAmount: Number(v.recurringAmount ?? 0),
    poolLimit: toNum(v.poolLimit),
    poolLimitRate: toNum(v.poolLimitRate),
    gradient: Number(v.gradient),
    initialGradient: Number(v.initialGradient),
    gGraceWeeks: Number(v.gGraceWeeks),
    gStepWeeks: Number(v.gStepWeeks),
    gMax: Number(v.gMax),
    initialPoolLimitRate: toNum(v.initialPoolLimitRate),
    pGraceWeeks: Number(v.pGraceWeeks),
    pStepWeeks: Number(v.pStepWeeks),
    poolLimitFloor: toNum(v.poolLimitFloor),
  }
}

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
    divisionCount: s.divisionCount != null ? Number(s.divisionCount) : undefined,
    isReverseMode: Boolean(s.isReverseMode),
    currentRound: s.currentRound != null ? Number(s.currentRound) : undefined,
    currentHoldings: s.currentHoldings != null ? Number(s.currentHoldings) : undefined,
    vr: normalizeVrSummary(s.vr),
    startDate: s.startDate != null ? String(s.startDate) : undefined,
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
  const raw = await fetchEither<unknown>(`/api/accounts/${accountId}/trading-cycles`, jsonBody('POST', data), token)
  return normalizeStrategy(raw)
}

export async function updateStrategy(id: string, data: Partial<StrategyRequest>, token?: string): Promise<Strategy> {
  const raw = await fetchEither<unknown>(`/api/trading-cycles/${id}`, jsonBody('PUT', data), token)
  return normalizeStrategy(raw)
}

export async function reconfigureVr(id: string, data: ReconfigureVrRequest, token?: string): Promise<Strategy> {
  const raw = await fetchEither<unknown>(`/api/trading-cycles/${id}/vr-config`, jsonBody('PUT', data), token)
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
    status: String(o.status ?? 'PLACED') as 'PLANNED' | 'PLACED',
  }
}

export async function getStrategySeedPreview(
  accountId: string,
  params: { type: string; ticker: string; divisionCount: number },
  token?: string,
): Promise<StrategySeedPreview> {
  const qs = new URLSearchParams({
    type: params.type,
    ticker: params.ticker,
    divisionCount: String(params.divisionCount),
  }).toString()
  const raw = await fetchEither<Record<string, unknown>>(
    `/api/accounts/${accountId}/strategy-seed-preview?${qs}`,
    undefined,
    token,
  )
  return {
    ticker: String(raw.ticker),
    basePrice: raw.basePrice != null ? toNum(raw.basePrice) : null,
    minSeed: raw.minSeed != null ? toNum(raw.minSeed) : null,
    skipReason: raw.skipReason != null ? String(raw.skipReason) : null,
  }
}

export async function executeStrategy(id: string): Promise<PlacedOrder[]> {
  const raw = await clientFetch<{ orders?: unknown[] } | undefined>(
    `/api/trading-cycles/${id}/execute`,
    { method: 'POST' }
  )
  return (raw?.orders ?? []).reduce<PlacedOrder[]>((acc, o) => {
    const n = normalizePlacedOrder(o)
    if (n.id && n.id !== 'null') acc.push(n)
    return acc
  }, [])
}
