import { clientFetch } from '@shared/lib/api-client'
import type { NextOrderPreview, SkipReason } from '../model/types'

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
        currentPrice: String(rawPos.currentPrice),
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
  return { tradeDate: String(r.tradeDate), position, orders, skipReason }
}

export async function getNextOrdersPreview(accountId: string): Promise<NextOrderPreview> {
  const raw = await clientFetch<unknown>(`/api/accounts/${accountId}/orders/preview`)
  return normalizePreview(raw)
}

// 오늘 PLACED된 주문 전체 취소 — DELETE /api/trading-cycles/{id}/execute
export async function cancelAllOrders(strategyId: string): Promise<CancelOrdersResult> {
  return clientFetch<CancelOrdersResult>(`/api/trading-cycles/${strategyId}/execute`, {
    method: 'DELETE',
  })
}

// 개별 주문 1건 취소 — DELETE /api/orders/{orderId}
export async function cancelOneOrder(orderId: string): Promise<void> {
  await clientFetch<void>(`/api/orders/${orderId}`, { method: 'DELETE' })
}
