import { clientFetch } from './client'
import type { NextOrderPreview } from '@/types/preview'

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
  return { tradeDate: String(r.tradeDate), position, orders }
}

export async function getNextOrdersPreview(accountId: string): Promise<NextOrderPreview> {
  const raw = await clientFetch<unknown>(`/api/accounts/${accountId}/orders/preview`)
  return normalizePreview(raw)
}
