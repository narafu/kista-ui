import { clientFetch, fetchEither, jsonBody } from '@shared/lib/api-client'
import { toNum } from '@shared/lib/utils'
import { dec, num, optDec, optNum, optStr, str } from '@shared/lib/normalize'
import type { CycleSeedType, ReconfigureVrRequest, Strategy, StrategyRequest, StrategySeedPreview, StrategyVrSummary } from '../model/types'
import type { PlacedOrder } from '@shared/model/placed-order'
import { normalizePlacedOrderBase } from '@shared/model/placed-order'

// VR 요약 숫자 문자열 → number 변환
function normalizeVrSummary(raw: unknown): StrategyVrSummary | undefined {
  if (raw == null) return undefined
  const v = raw as Record<string, unknown>
  return {
    value: dec(v.value),
    bandWidth: dec(v.bandWidth),
    intervalWeeks: num(v.intervalWeeks),
    recurringAmount: num(v.recurringAmount ?? 0),
    poolLimit: dec(v.poolLimit),
    poolLimitRate: dec(v.poolLimitRate),
    gradient: num(v.gradient),
    initialGradient: num(v.initialGradient),
    gGraceWeeks: num(v.gGraceWeeks),
    gStepWeeks: num(v.gStepWeeks),
    gMax: num(v.gMax),
    initialPoolLimitRate: dec(v.initialPoolLimitRate),
    pGraceWeeks: num(v.pGraceWeeks),
    pStepWeeks: num(v.pStepWeeks),
    poolLimitFloor: dec(v.poolLimitFloor),
  }
}

function normalizeStrategy(raw: unknown): Strategy {
  const s = raw as Record<string, unknown>
  return {
    id: str(s.id),
    accountId: str(s.accountId),
    type: str(s.type),
    status: str(s.status),
    ticker: str(s.ticker),
    cycleSeedType: (s.cycleSeedType as CycleSeedType) ?? 'NONE',
    initialUsdDeposit: optDec(s.initialUsdDeposit),
    divisionCount: optNum(s.divisionCount),
    isReverseMode: Boolean(s.isReverseMode),
    currentRound: optNum(s.currentRound),
    currentHoldings: optNum(s.currentHoldings),
    vr: normalizeVrSummary(s.vr),
    startDate: optStr(s.startDate),
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
    ...normalizePlacedOrderBase(raw),
    status: str(o.status ?? 'PLACED') as 'PLANNED' | 'PLACED',
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
