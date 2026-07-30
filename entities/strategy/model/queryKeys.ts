export const strategyKeys = {
  all: ['strategies'] as const,
  listAll: () => [...strategyKeys.all, 'list', 'all'] as const,
  listByAccount: (accountId: string) => [...strategyKeys.all, 'list', 'account', accountId] as const,
  detail: (id: string) => [...strategyKeys.all, 'detail', id] as const,
  seedPreview: (accountId: string, type: string, ticker: string, divisionCount: number) =>
    [...strategyKeys.all, 'seed-preview', accountId, type, ticker, divisionCount] as const,
}
