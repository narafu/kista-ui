import { clientFetch, fetchEither, jsonBody } from '@shared/lib/api-client'
import { toNum } from '@shared/lib/utils'
import { optDec, optNum, optStr } from '@shared/lib/normalize'
import { buildQueryString } from '@shared/lib/query-string'
import type { CycleSeedType, DcaCondition, DcaConfigRequest, DcaDirection, DcaExecution, DcaExecutionPage, DcaFrequency, DcaIndicator, DcaOperator, DcaOrderType, DcaRule, DcaShortfallPolicy, DcaSizing, DcaSizingType, DcaWeekday, ReconfigureVrRequest, Strategy, StrategyDcaSummary, StrategyRequest, StrategySeedPreview, StrategyVrSummary } from '../model/types'
import { WEEKDAY_LABEL } from '../model/dcaFormat'
import type { PlacedOrder } from '@shared/model/placed-order'
import { normalizePlacedOrderBase } from '@shared/model/placed-order'

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
    currentPool: optDec(v.currentPool),
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

function normalizeDcaCondition(raw: unknown): DcaCondition {
  const c = raw as Record<string, unknown>
  return {
    indicator: String(c.indicator) as DcaIndicator,
    operator: String(c.operator) as DcaOperator,
    ...(c.threshold != null ? { threshold: toNum(c.threshold) } : {}),
    ...(c.smaPeriod != null ? { smaPeriod: Number(c.smaPeriod) } : {}),
  }
}

function isDcaWeekday(v: unknown): v is DcaWeekday {
  return typeof v === 'string' && Object.hasOwn(WEEKDAY_LABEL, v)
}

function normalizeDcaSizing(raw: unknown): DcaSizing {
  const z = (raw ?? {}) as Record<string, unknown>
  return { type: String(z.type) as DcaSizingType, amount: optDec(z.amount) ?? null, percent: optDec(z.percent) ?? null }
}

function normalizeDcaRule(raw: unknown): DcaRule {
  const r = raw as Record<string, unknown>
  const next = r.nextExecution as Record<string, unknown> | null | undefined
  const last = r.lastExecution as Record<string, unknown> | null | undefined
  return {
    ruleKey: String(r.ruleKey),
    direction: String(r.direction) as DcaDirection,
    frequency: String(r.frequency) as DcaFrequency,
    dayOfWeek: isDcaWeekday(r.dayOfWeek) ? r.dayOfWeek : null,
    dayOfMonth: r.dayOfMonth != null ? Number(r.dayOfMonth) : null,
    orderType: String(r.orderType) as DcaOrderType,
    executionHour: r.executionHour != null ? Number(r.executionHour) : null,
    sizing: normalizeDcaSizing(r.sizing),
    shortfall: String(r.shortfall) as DcaShortfallPolicy,
    conditions: ((r.conditions as unknown[] | undefined) ?? []).map(normalizeDcaCondition),
    nextExecution: next ? { usSessionDate: String(next.usSessionDate), kstTradeDate: String(next.kstTradeDate) } : null,
    lastExecution: last
      ? { kstTradeDate: String(last.kstTradeDate), status: String(last.status), skipReason: optStr(last.skipReason) ?? null }
      : null,
  }
}

function normalizeDca(raw: unknown): StrategyDcaSummary | undefined {
  if (raw == null) return undefined
  const d = raw as Record<string, unknown>
  return {
    rules: ((d.rules as unknown[] | undefined) ?? []).map(normalizeDcaRule),
    currentHoldings: optDec(d.currentHoldings) ?? null,
    avgPrice: optDec(d.avgPrice) ?? null,
  }
}

function normalizeDcaExecution(raw: unknown): DcaExecution {
  const e = raw as Record<string, unknown>
  const o = e.order as Record<string, unknown> | null | undefined
  return {
    ruleKey: String(e.ruleKey),
    direction: String(e.direction) as DcaDirection,
    kstTradeDate: String(e.kstTradeDate),
    usSessionDate: optStr(e.usSessionDate),
    status: String(e.status),
    skipReason: optStr(e.skipReason) ?? null,
    detail: optStr(e.detail) ?? null,
    referencePrice: optDec(e.referencePrice),
    quantity: optNum(e.quantity),
    order: o
      ? { id: String(o.id), status: String(o.status), filledQuantity: optNum(o.filledQuantity), filledPrice: optDec(o.filledPrice) }
      : null,
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
    initialUsdDeposit: optDec(s.initialUsdDeposit),
    divisionCount: optNum(s.divisionCount),
    isReverseMode: Boolean(s.isReverseMode),
    currentRound: optNum(s.currentRound),
    currentHoldings: optNum(s.currentHoldings),
    vr: normalizeVrSummary(s.vr),
    dca: normalizeDca(s.dca),
    startDate: optStr(s.startDate),
    todayOpenBatchMissed: s.todayOpenBatchMissed === true || undefined,
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

export async function reconfigureDca(id: string, data: DcaConfigRequest, token?: string): Promise<Strategy> {
  const raw = await fetchEither<unknown>(`/api/trading-cycles/${id}/dca-config`, jsonBody('PUT', data), token)
  return normalizeStrategy(raw)
}

export async function listDcaExecutions(id: string, page: number, size: number, token?: string): Promise<DcaExecutionPage> {
  const qs = buildQueryString({ page, size })
  const raw = await fetchEither<Record<string, unknown>>(`/api/trading-cycles/${id}/dca-executions${qs}`, undefined, token)
  return {
    content: ((raw.content as unknown[] | undefined) ?? []).map(normalizeDcaExecution),
    page: Number(raw.page),
    size: Number(raw.size),
    totalElements: Number(raw.totalElements),
  }
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
    status: String(o.status ?? 'PLACED') as PlacedOrder['status'],
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
    availableCash: raw.availableCash != null ? toNum(raw.availableCash) : null,
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
