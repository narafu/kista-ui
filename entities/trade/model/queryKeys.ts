export type CycleHistoryKeyParams = { from?: string; to?: string; size?: number } | null

export const tradeKeys = {
  all: ['trades'] as const,
  accountCycleHistory: (accountId: string, params: CycleHistoryKeyParams) =>
    [...tradeKeys.all, 'cycle-history', 'account', accountId, params] as const,
  strategyCycleHistory: (strategyId: string, params: CycleHistoryKeyParams) =>
    [...tradeKeys.all, 'cycle-history', 'strategy', strategyId, params] as const,
  // 체결로 예수금·평가금이 바뀌므로 tradeKeys.all prefix 무효화에 함께 걸리도록 trades 아래에 둔다
  portfolio: (accountId: string) => [...tradeKeys.all, 'portfolio', accountId] as const,
  // 코인 계좌 잔고 — 체결로 바뀌므로 portfolio와 같이 tradeKeys.all prefix 무효화에 걸리게 둔다
  cryptoPortfolio: (accountId: string) => [...tradeKeys.all, 'crypto-portfolio', accountId] as const,
  // 코인 공개 시세 — 잔고와 무관해 체결 무효화가 필요 없지만 계좌 단위 조회라 같은 루트에 둔다
  cryptoPrices: (accountId: string, tickers: string[]) => [...tradeKeys.all, 'crypto-prices', accountId, [...tickers].sort().join(',')] as const,
  dailyRange: (accountIds: string[], from: string, to: string) =>
    [...tradeKeys.all, 'daily-range', [...accountIds].sort().join(','), from, to] as const,
}
