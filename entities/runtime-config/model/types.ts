export type RuntimeBrokerCode = 'KIS' | 'TOSS'
export type RuntimeStrategyType = 'INFINITE' | 'PRIVACY' | 'VR'
export type RecurringMode = 'DEPOSIT' | 'HOLD' | 'WITHDRAW'

export interface RuntimeFieldSettings<T> {
  customizable: boolean
  allowedValues: T[]
  defaultValue: T
}

export type RuntimeBenchmarkFieldSettings<T> = Omit<RuntimeFieldSettings<T>, 'customizable'>

export interface RuntimeBenchmarkSettings {
  etf: RuntimeBenchmarkFieldSettings<string>
}

export interface RuntimeStrategyFields {
  ticker: RuntimeFieldSettings<string>
  divisionCount?: RuntimeFieldSettings<number>
  recurringMode?: RuntimeFieldSettings<RecurringMode>
  bandWidth?: RuntimeFieldSettings<number>
  intervalWeeks?: RuntimeFieldSettings<number>
}

export interface RuntimeConfig {
  auth: { approvalRequired: boolean }
  brokers: Record<RuntimeBrokerCode, { enabled: boolean }>
  strategies: Record<RuntimeStrategyType, { enabled: boolean; fields: RuntimeStrategyFields }>
  benchmarks?: RuntimeBenchmarkSettings
}

export const DEFAULT_RUNTIME_BENCHMARKS: RuntimeBenchmarkSettings = {
  etf: { allowedValues: ['SPY', 'QQQ', 'QLD', 'IBIT', 'ETHA'], defaultValue: 'SPY' },
}
