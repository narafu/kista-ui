import type { NextOrderPreview } from './types'

export const nextOrderPreview = (over: Partial<NextOrderPreview> = {}): NextOrderPreview => ({
  tradeDate: '2026-10-30', position: null, orders: [], skipReason: null, todayOrders: [], otherStrategiesPlannedBuyUsd: '0',
  ledgerCheck: null, accountCashCheck: null, accountHoldingsCheck: null,
  ...over,
})
