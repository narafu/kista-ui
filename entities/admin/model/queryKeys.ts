export interface AdminUsersQueryParams {
  from?: string
  to?: string
}

export interface AdminTradesQueryParams {
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
  tradesRoot: () => [...adminKeys.all, 'trades'] as const,
  trades: (params?: AdminTradesQueryParams) => [...adminKeys.tradesRoot(), params?.from ?? '', params?.to ?? ''] as const,
  accounts: () => [...adminKeys.all, 'accounts'] as const,
  strategiesByAccountRoot: () => [...adminKeys.all, 'strategies-by-account'] as const,
  strategiesByAccount: (accountId: string) => [...adminKeys.strategiesByAccountRoot(), accountId] as const,
  errorLogsRoot: () => [...adminKeys.all, 'error-logs'] as const,
  errorLogs: (params?: AdminErrorLogsQueryParams) => [
    ...adminKeys.errorLogsRoot(),
    params?.limit ?? 500,
    params?.from ?? '',
    params?.to ?? '',
  ] as const,
}
