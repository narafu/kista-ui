export const accountKeys = {
  all: ['accounts'] as const,
  list: () => [...accountKeys.all, 'list'] as const,
  detail: (id: string) => [...accountKeys.all, 'detail', id] as const,
  margin: (id: string) => [...accountKeys.all, 'margin', id] as const,
  prices: (id: string, tickers: string[]) =>
    [...accountKeys.all, 'prices', id, [...tickers].sort().join(',')] as const,
}
