import type { BrokerCode, RecurringMode as ApiRecurringMode, StrategyType } from '@shared/lib/api-schema'

export type RuntimeBrokerCode = BrokerCode
export type RuntimeStrategyType = StrategyType
export type RecurringMode = ApiRecurringMode

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

// '자산' 메뉴 등록 폼의 운용전략 추천 목록 — 필드 자체는 자유 입력을 유지하므로
// RuntimeFieldSettings/RuntimeBenchmarkFieldSettings와 달리 defaultValue·허용값 강제가 없다.
// 구 세부카테고리/기관/자산군 추천 목록은 finance_categories·finance_accounts·AssetClass enum
// 승격으로 소멸했다(kista-api finance 스키마 재설계, 2026-08).
export interface RuntimeAssetFormOptions {
  strategySuggestions: string[]
}

export interface RuntimeConfig {
  auth: { approvalRequired: boolean }
  brokers: Record<RuntimeBrokerCode, { enabled: boolean }>
  strategies: Record<RuntimeStrategyType, { enabled: boolean; fields: RuntimeStrategyFields }>
  benchmarks?: RuntimeBenchmarkSettings
  assetFormOptions?: RuntimeAssetFormOptions
}

export const DEFAULT_RUNTIME_BENCHMARKS: RuntimeBenchmarkSettings = {
  etf: { allowedValues: ['SPY', 'QQQ', 'QLD', 'IBIT', 'ETHA'], defaultValue: 'SPY' },
}

// kista-api AssetFormOptions.defaults()와 동일한 값 — 서버 응답이 아직 없을 때(구버전 캐시 등) 폴백으로 쓴다.
export const DEFAULT_ASSET_FORM_OPTIONS: RuntimeAssetFormOptions = {
  strategySuggestions: ['VR', 'INFINITE', 'PRIVACY', 'DCA'],
}
