export const accountKeys = {
  all: ['accounts'] as const,
  list: () => [...accountKeys.all, 'list'] as const,
  detail: (id: string) => [...accountKeys.all, 'detail', id] as const,
  margin: (id: string) => [...accountKeys.all, 'margin', id] as const,
  pricesRoot: (id: string) => [...accountKeys.all, 'prices', id] as const,
  prices: (id: string, tickers: string[]) =>
    [...accountKeys.pricesRoot(id), [...tickers].sort().join(',')] as const,
}
