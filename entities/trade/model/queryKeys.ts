export type CycleHistoryKeyParams = { from?: string; to?: string; size?: number } | null

export const tradeKeys = {
  all: ['trades'] as const,
  accountCycleHistory: (accountId: string, params: CycleHistoryKeyParams) =>
    [...tradeKeys.all, 'cycle-history', 'account', accountId, params] as const,
  strategyCycleHistory: (strategyId: string, params: CycleHistoryKeyParams) =>
    [...tradeKeys.all, 'cycle-history', 'strategy', strategyId, params] as const,
  dailyRange: (accountIds: string[], from: string, to: string) =>
    [...tradeKeys.all, 'daily-range', [...accountIds].sort().join(','), from, to] as const,
}
