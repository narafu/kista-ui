export interface EnumMeta {
  code: string
  label: string
  description?: string
}

export interface StrategyTypeMeta {
  code: string
  description?: string
  availableTickers: string[]
}

export interface TickerMeta {
  code: string
  description?: string
  exchangeCode: string
  targetProfitRate: string
}

export interface MetaBundle {
  strategyTypes: StrategyTypeMeta[]
  tickers: TickerMeta[]
  brokers: EnumMeta[]
  strategyStatuses: EnumMeta[]
  cycleSeedTypes: EnumMeta[]
}
