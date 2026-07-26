import type { BrokerCode, StrategyType } from '@shared/lib/api-schema'

export type AdminBrokerCode = BrokerCode
export type AdminStrategyType = StrategyType
export type AdminRecurringMode = 'DEPOSIT' | 'HOLD' | 'WITHDRAW'

export interface AdminFieldSettings<T> {
  customizable: boolean
  allowedValues: T[]
  defaultValue: T
}

export interface AdminBenchmarkFieldSettings<T> {
  allowedValues: T[]
  defaultValue: T
}

export interface AdminBenchmarkSettings {
  etf: AdminBenchmarkFieldSettings<string>
}

export interface AdminStrategyFields {
  ticker: AdminFieldSettings<string>
  divisionCount?: AdminFieldSettings<number>
  recurringMode?: AdminFieldSettings<AdminRecurringMode>
  bandWidth?: AdminFieldSettings<number>
  intervalWeeks?: AdminFieldSettings<number>
}

export interface AdminSettings {
  auth: { approvalRequired: boolean }
  brokers: Record<AdminBrokerCode, { enabled: boolean }>
  strategies: Record<AdminStrategyType, { enabled: boolean; fields: AdminStrategyFields }>
  benchmarks?: AdminBenchmarkSettings
}
