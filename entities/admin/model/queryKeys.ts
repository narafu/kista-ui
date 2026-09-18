export interface AdminUsersQueryParams {
  from?: string
  to?: string
}

export interface AdminErrorLogsQueryParams {
  limit?: number
  from?: string
  to?: string
}

export const adminKeys = {
  all: ['admin'] as const,
  usersRoot: () => [...adminKeys.all, 'users'] as const,
  users: (filter?: string, params?: AdminUsersQueryParams) => [
    ...adminKeys.usersRoot(),
    filter ?? 'ALL',
    params?.from ?? '',
    params?.to ?? '',
  ] as const,
  stats: () => [...adminKeys.all, 'stats'] as const,
  accounts: () => [...adminKeys.all, 'accounts'] as const,
  strategiesByAccountRoot: () => [...adminKeys.all, 'strategies-by-account'] as const,
  strategiesByAccount: (accountId: string) => [...adminKeys.strategiesByAccountRoot(), accountId] as const,
  strategyOrdersRoot: () => [...adminKeys.all, 'strategy-orders'] as const,
  strategyOrders: (accountId: string, strategyId: string, tradeDate: string) =>
    [...adminKeys.strategyOrdersRoot(), accountId, strategyId, tradeDate] as const,
  reorderTiming: () => [...adminKeys.all, 'reorder-timing'] as const,
  errorLogsRoot: () => [...adminKeys.all, 'error-logs'] as const,
  errorLogs: (params?: AdminErrorLogsQueryParams) => [
    ...adminKeys.errorLogsRoot(),
    params?.limit ?? 500,
    params?.from ?? '',
    params?.to ?? '',
  ] as const,
}
