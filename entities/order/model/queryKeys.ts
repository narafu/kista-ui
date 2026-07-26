export const orderKeys = {
  all: ['orders'] as const,
  preview: (strategyId: string) => [...orderKeys.all, 'preview', strategyId] as const,
  history: (strategyId: string, from = '', to = '') =>
    [...orderKeys.all, 'history', strategyId, from, to] as const,
}
