import { clientFetch, fetchEither } from '@shared/lib/api-client'
import type { BuyCompetitionSummary, CompetingStrategy, NextOrderPreview, SellSufficiencySummary, SkipReason, StrategyOrder } from '../model/types'

export interface CancelOrdersResult {
  cancelledCount: number
  failedCount: number
}

function normalizeCompetingStrategy(raw: unknown): CompetingStrategy {
  const item = raw as Record<string, unknown>
  return {
    strategyId: String(item.strategyId),
    type: String(item.type),
    ticker: String(item.ticker),
    requiredBuyUsd: String(item.requiredBuyUsd),
    priority: Number(item.priority),
  }
}

function normalizeNullable<T>(raw: unknown, mapper: (r: Record<string, unknown>) => T): T | null {
  if (raw == null) return null
  return mapper(raw as Record<string, unknown>)
}

function normalizeCompetition(raw: unknown): BuyCompetitionSummary | null {
  return normalizeNullable(raw, (r) => ({
    sufficientBudget: Boolean(r.sufficientBudget),
    availableDeposit: String(r.availableDeposit ?? '0'),
    requiredForThisStrategy: String(r.requiredForThisStrategy ?? '0'),
    consumedByHigherPriority: String(r.consumedByHigherPriority ?? '0'),
    blockedByHigherPriority: ((r.blockedByHigherPriority as unknown[]) ?? []).map(normalizeCompetingStrategy),
    uncertainStrategyIds: ((r.uncertainStrategyIds as unknown[]) ?? []).map(String),
    liveBalanceUnavailable: Boolean(r.liveBalanceUnavailable),
  }))
}

function normalizeSellSufficiency(raw: unknown): SellSufficiencySummary | null {
  return normalizeNullable(raw, (r) => ({
    sufficientQuantity: Boolean(r.sufficientQuantity),
    sellableQuantity: Number(r.sellableQuantity ?? 0),
    reservedQuantity: Number(r.reservedQuantity ?? 0),
    requiredQuantity: Number(r.requiredQuantity ?? 0),
    liveQuantityUnavailable: Boolean(r.liveQuantityUnavailable),
  }))
}

function normalizePreview(raw: unknown): NextOrderPreview {
  const r = raw as Record<string, unknown>
  const rawPos = r.position as Record<string, unknown> | null
  const orders = (r.orders as unknown[]).map((o) => {
    const item = o as Record<string, unknown>
    return {
      ticker: String(item.ticker),
      orderType: String(item.orderType),
      direction: String(item.direction),
      quantity: Number(item.quantity),
      price: String(item.price),
    }
  })
  const position = rawPos
    ? {
        ticker: String(rawPos.ticker),
        holdings: Number(rawPos.holdings),
        averagePrice: String(rawPos.averagePrice),
        usdDeposit: String(rawPos.usdDeposit),
        totalAssets: String(rawPos.totalAssets),
        priceOffsetRate: String(rawPos.priceOffsetRate),
        currentRound: Number(rawPos.currentRound),
        unitAmount: String(rawPos.unitAmount),
        referencePrice: String(rawPos.referencePrice),
        targetPrice: String(rawPos.targetPrice),
      }
    : null
  const skipReason = (r.skipReason as SkipReason | null | undefined) ?? null
  const todayOrders = ((r.todayOrders as unknown[]) ?? []).map((o) => {
    const item = o as Record<string, unknown>
    return {
      id: String(item.id),
      ticker: String(item.ticker),
      direction: String(item.direction) as 'BUY' | 'SELL',
      orderType: String(item.orderType),
      quantity: Number(item.quantity),
      price: String(item.price),
      status: String(item.status) as 'PLANNED' | 'PLACED',
    }
  })
  const otherStrategiesPlannedBuyUsd = String(r.otherStrategiesPlannedBuyUsd ?? '0')
  const competition = normalizeCompetition(r.competition)
  const sellSufficiency = normalizeSellSufficiency(r.sellSufficiency)
  return { tradeDate: String(r.tradeDate), position, orders, skipReason, todayOrders, otherStrategiesPlannedBuyUsd, competition, sellSufficiency }
}

// token 있으면 Server Component에서 kista-api 직접 호출, 없으면 Client Component에서 Route Handler 경유
export async function getStrategyOrdersPreview(strategyId: string, token?: string): Promise<NextOrderPreview> {
  const raw = await fetchEither<unknown>(`/api/trading-cycles/${strategyId}/preview`, { method: 'GET' }, token)
  return normalizePreview(raw)
}

// 계좌 단위 다음 주문 미리보기 일괄 조회 — GET /api/accounts/{accountId}/trading-cycles/previews
// 계좌 내 전략 N개를 개별 호출하는 대신 1회 요청으로 묶어 kista-api 쪽 라이브 예수금 중복 조회도 함께 줄인다
export async function getAccountOrderPreviews(accountId: string, token: string): Promise<Record<string, NextOrderPreview>> {
  const raw = await fetchEither<Record<string, unknown>>(`/api/accounts/${accountId}/trading-cycles/previews`, { method: 'GET' }, token)
  return Object.fromEntries(Object.entries(raw).map(([id, v]) => [id, normalizePreview(v)]))
}

// 리스트 화면 Server Component 프리페치 전용 — 전략들을 계좌 단위로 묶어 배치 preview를 병렬 조회해 strategyId 맵으로 반환.
// 실패한 계좌는 생략 — 해당 계좌의 카드는 initialData 없이 클라이언트에서 개별 재조회한다
export async function getStrategyOrderPreviewsById(
  strategies: { id: string; accountId: string }[],
  token: string,
): Promise<Record<string, NextOrderPreview>> {
  const accountIds = [...new Set(strategies.map((s) => s.accountId))]
  const results = await Promise.all(
    accountIds.map((accountId) => getAccountOrderPreviews(accountId, token).catch((): Record<string, NextOrderPreview> => ({}))),
  )
  return Object.assign({}, ...results)
}

// 오늘 등록된 PLANNED + PLACED 주문 전체 취소 — DELETE /api/trading-cycles/{id}/execute
export async function cancelAllOrders(strategyId: string): Promise<CancelOrdersResult> {
  return clientFetch<CancelOrdersResult>(`/api/trading-cycles/${strategyId}/execute`, {
    method: 'DELETE',
  })
}

// 개별 주문 1건 취소 — DELETE /api/orders/{orderId}
export async function cancelOneOrder(orderId: string): Promise<void> {
  await clientFetch<void>(`/api/orders/${orderId}`, { method: 'DELETE' })
}

// 전략 주문 내역 조회 — GET /api/trading-cycles/{id}/orders
export async function listStrategyOrders(
  strategyId: string,
  from?: string,
  to?: string,
): Promise<StrategyOrder[]> {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const query = params.size ? `?${params}` : ''
  const raw = await clientFetch<{ orders: unknown[] }>(`/api/trading-cycles/${strategyId}/orders${query}`)
  return raw.orders.map((o) => {
    const item = o as Record<string, unknown>
    return {
      id: String(item.id),
      tradeDate: String(item.tradeDate),
      direction: String(item.direction) as 'BUY' | 'SELL',
      orderType: String(item.orderType),
      quantity: Number(item.quantity),
      price: String(item.price),
      status: String(item.status),
      filledQuantity: item.filledQuantity != null ? Number(item.filledQuantity) : null,
      filledPrice: item.filledPrice != null ? String(item.filledPrice) : null,
    }
  })
}
