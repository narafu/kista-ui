import { clientFetch } from './client'
import type { NextOrderPreview } from '@/types/preview'

function normalizePreview(raw: unknown): NextOrderPreview {
  const r = raw as Record<string, unknown>
  const pos = r.position as Record<string, unknown>
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
  return {
    tradeDate: String(r.tradeDate),
    position: {
      ticker: String(pos.ticker),
      holdings: Number(pos.holdings),
      averagePrice: String(pos.averagePrice),
      currentPrice: String(pos.currentPrice),
      usdDeposit: String(pos.usdDeposit),
      totalAssets: String(pos.totalAssets),
      priceOffsetRate: String(pos.priceOffsetRate),
      currentRound: Number(pos.currentRound),
      unitAmount: String(pos.unitAmount),
      referencePrice: String(pos.referencePrice),
      targetPrice: String(pos.targetPrice),
    },
    orders,
  }
}

export async function getNextOrdersPreview(accountId: string): Promise<NextOrderPreview> {
  const raw = await clientFetch<unknown>(`/api/accounts/${accountId}/orders/preview`)
  return normalizePreview(raw)
}
