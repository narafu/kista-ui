import { clientFetch } from '@shared/lib/api-client'
import type { NextOrderPreview, SkipReason, StrategyOrder } from '../model/types'

export interface CancelOrdersResult {
  cancelledCount: number
  failedCount: number
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
  return { tradeDate: String(r.tradeDate), position, orders, skipReason, todayOrders, otherStrategiesPlannedBuyUsd }
}

export async function getStrategyOrdersPreview(strategyId: string): Promise<NextOrderPreview> {
  const raw = await clientFetch<unknown>(`/api/trading-cycles/${strategyId}/preview`)
  return normalizePreview(raw)
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
