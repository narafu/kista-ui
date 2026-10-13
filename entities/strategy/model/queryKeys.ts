export const strategyKeys = {
  all: ['strategies'] as const,
  lists: () => [...strategyKeys.all, 'list'] as const,
  listAll: () => [...strategyKeys.lists(), 'all'] as const,
  listByAccount: (accountId: string) => [...strategyKeys.lists(), 'account', accountId] as const,
  details: () => [...strategyKeys.all, 'detail'] as const,
  detail: (id: string) => [...strategyKeys.details(), id] as const,
  dcaExecutionsAll: () => [...strategyKeys.all, 'dca-executions'] as const,
  dcaExecutions: (id: string, page: number, size: number) => [...strategyKeys.dcaExecutionsAll(), id, page, size] as const,
  seedPreview: (accountId: string, type: string, ticker: string, divisionCount: number) =>
    [...strategyKeys.all, 'seed-preview', accountId, type, ticker, divisionCount] as const,
}
