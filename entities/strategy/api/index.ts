import { ApiError, apiFieldErrors, apiMsg, fetchEither, jsonBody } from '@shared/lib/api-client'
import { toNum } from '@shared/lib/utils'
import { optDec, optNum, optStr } from '@shared/lib/normalize'
import { buildQueryString } from '@shared/lib/query-string'
import type { CycleSeedType, DcaCondition, CapitalInjectionRequest, CapitalWithdrawalRequest, DcaConfigRequest, DcaDirection, DcaExecution, DcaExecutionFilters, DcaExecutionPage, DcaFrequency, DcaIndicator, DcaOperator, DcaOrderType, DcaRule, DcaShortfallPolicy, DcaSizing, DcaSizingType, DcaWeekday, ReconfigureVrRequest, Strategy, StrategyDcaSummary, StrategyRequest, StrategyValidation, StrategyValidationTarget, StrategyVrSummary } from '../model/types'
import { WEEKDAY_LABEL } from '../model/dcaFormat'

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
    initialDeposit: optDec(s.initialDeposit),
    divisionCount: optNum(s.divisionCount),
    isReverseMode: Boolean(s.isReverseMode),
    cycleInProgress: Boolean(s.cycleInProgress),
    ledgerDeposit: optDec(s.ledgerDeposit),
    currentRound: optNum(s.currentRound),
    currentHoldings: optNum(s.currentHoldings),
    vr: normalizeVrSummary(s.vr),
    dca: normalizeDca(s.dca),
    allowedActions: (s.allowedActions as Strategy['allowedActions'] | undefined) ?? [],
    blockedActions: (s.blockedActions as Strategy['blockedActions'] | undefined) ?? [],
    startDate: optStr(s.startDate),
    todayOpenBatchMissed: s.todayOpenBatchMissed === true || undefined,
  }
}

export async function listAllStrategies(token?: string, includeArchived = false): Promise<Strategy[]> {
  const qs = buildQueryString({ includeArchived: includeArchived ? 'true' : undefined })
  const raw = await fetchEither<unknown[]>(`/api/trading-cycles${qs}`, undefined, token)
  return raw.map(normalizeStrategy)
}

export async function listStrategies(accountId: string, token?: string): Promise<Strategy[]> {
  const raw = await fetchEither<unknown[]>(`/api/accounts/${accountId}/trading-cycles`, undefined, token)
  return raw.map(normalizeStrategy)
}

// 단건 조회 엔드포인트가 없어 계좌 전략 목록에서 찾는다. 조회 실패는 던지고, 없으면 null.
export async function findStrategy(accountId: string, strategyId: string, token?: string): Promise<Strategy | null> {
  return (await listStrategies(accountId, token)).find((s) => s.id === strategyId) ?? null
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

export async function injectCapital(id: string, data: CapitalInjectionRequest, token?: string): Promise<Strategy> {
  const raw = await fetchEither<unknown>(`/api/trading-cycles/${id}/capital-injection`, jsonBody('POST', data), token)
  return normalizeStrategy(raw)
}

export async function withdrawCapital(id: string, data: CapitalWithdrawalRequest, token?: string): Promise<Strategy> {
  const raw = await fetchEither<unknown>(`/api/trading-cycles/${id}/capital-withdrawal`, jsonBody('POST', data), token)
  return normalizeStrategy(raw)
}

export async function reconfigureDca(id: string, data: DcaConfigRequest, token?: string): Promise<Strategy> {
  const raw = await fetchEither<unknown>(`/api/trading-cycles/${id}/dca-config`, jsonBody('PUT', data), token)
  return normalizeStrategy(raw)
}

export async function listDcaExecutions(id: string, page: number, size: number, filters?: DcaExecutionFilters, token?: string): Promise<DcaExecutionPage> {
  const qs = buildQueryString({ page, size, from: filters?.from, to: filters?.to, direction: filters?.direction, ruleKey: filters?.ruleKey })
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

export async function archiveStrategy(id: string, token?: string): Promise<void> {
  return fetchEither<void>(`/api/trading-cycles/${id}/archive`, { method: 'PATCH' }, token)
}

export async function resumeStrategy(id: string, token?: string): Promise<void> {
  return fetchEither<void>(`/api/trading-cycles/${id}/resume`, { method: 'PATCH' }, token)
}

function validationPath(target: StrategyValidationTarget): string {
  switch (target.kind) {
    case 'create': return `/api/accounts/${target.accountId}/trading-cycle-validations`
    case 'update': return `/api/trading-cycles/${target.strategyId}/update-validations`
    case 'vr-config': return `/api/trading-cycles/${target.strategyId}/vr-config-validations`
  }
}

const optMoney = (v: unknown) => (v != null ? toNum(v) : null)

// 저장 없는 검증 — 통과·거절 모두 200. 등록·VR 재설정 검증은 @Valid라 Bean Validation 위반만 400 ProblemDetail로 온다.
// 그 fieldErrors(api T7, 200과 같은 {field, detail}·같은 field 이름)를 그대로 쓰고, 없으면(DCA 규칙 누락 등) detail을 필드 없는 거절로 받는다
export async function validateStrategy(target: StrategyValidationTarget, body: unknown): Promise<StrategyValidation> {
  let raw: { fieldErrors?: StrategyValidation['fieldErrors']; warnings?: StrategyValidation['warnings']; derived?: Record<string, unknown> | null }
  try {
    raw = await fetchEither(validationPath(target), jsonBody('POST', body))
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 400) throw err
    const fieldErrors = apiFieldErrors(err)
    return { fieldErrors: fieldErrors.length > 0 ? fieldErrors : [{ field: null, detail: apiMsg(err, '입력값을 확인해 주세요.') }], warnings: [], derived: null }
  }
  const d = raw.derived
  return {
    fieldErrors: raw.fieldErrors ?? [],
    warnings: raw.warnings ?? [],
    derived: d ? {
      basePrice: optMoney(d.basePrice),
      minSeed: optMoney(d.minSeed),
      skipReason: d.skipReason != null ? String(d.skipReason) : null,
      availableCash: optMoney(d.availableCash),
    } : null,
  }
}
