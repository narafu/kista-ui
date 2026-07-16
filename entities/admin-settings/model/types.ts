export type AdminBrokerCode = 'KIS' | 'TOSS'
export type AdminStrategyType = 'INFINITE' | 'PRIVACY' | 'VR'
export type AdminRecurringMode = 'DEPOSIT' | 'HOLD' | 'WITHDRAW'

export interface AdminFieldSettings<T> {
  customizable: boolean
  allowedValues: T[]
  defaultValue: T
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
}
