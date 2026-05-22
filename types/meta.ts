export interface EnumMeta {
  code: string
  label: string
  description?: string
}

export interface StrategyTypeMeta extends EnumMeta {
  availableTickers: string[]
  defaultTicker: string
  defaultMultiple: string
}

export interface TickerMeta extends EnumMeta {
  exchangeCode: string
  targetProfitRate: string
}

export interface MetaBundle {
  strategyTypes: StrategyTypeMeta[]
  tickers: TickerMeta[]
  brokers: EnumMeta[]
  strategyStatuses: EnumMeta[]
}
