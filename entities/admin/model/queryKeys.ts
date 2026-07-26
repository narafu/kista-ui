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
  errorLogsRoot: () => [...adminKeys.all, 'error-logs'] as const,
  errorLogs: (params?: AdminErrorLogsQueryParams) => [
    ...adminKeys.errorLogsRoot(),
    params?.limit ?? 500,
    params?.from ?? '',
    params?.to ?? '',
  ] as const,
}
