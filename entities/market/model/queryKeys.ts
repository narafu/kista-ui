export const marketKeys = {
  all: ['market'] as const,
  holidays: (year: number, month: number) => [...marketKeys.all, 'holidays', year, month] as const,
  candles: (ticker: string, count: number) => [...marketKeys.all, 'candles', ticker, count] as const,
  candlesRange: (ticker: string, from: string, to: string) => [...marketKeys.all, 'candles', ticker, from, to] as const,
  fearGreed: (days: number) => [...marketKeys.all, 'fear-greed', days] as const,
}
