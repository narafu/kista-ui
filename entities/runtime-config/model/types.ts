import type { AssetCategory, BrokerCode, RecurringMode as ApiRecurringMode, StrategyType } from '@shared/lib/api-schema'

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

// '자산' 메뉴 등록 폼의 세부 카테고리/기관/자산군/운용전략 추천 목록 — 필드 자체는 자유 입력을 유지하므로
// RuntimeFieldSettings/RuntimeBenchmarkFieldSettings와 달리 defaultValue·허용값 강제가 없다.
export interface RuntimeAssetFormOptions {
  subcategorySuggestions: Record<AssetCategory, string[]>
  institutionSuggestions: string[]
  assetClassSuggestions: string[]
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
  subcategorySuggestions: {
    INVESTMENT: ['연금저축펀드', 'IRP', 'ISA', '일반계좌', '거래소', '개인지갑'],
    SAVINGS: ['주택청약종합저축', '연금저축보험'],
    LOAN: ['전세자금대출', '신용대출', '오토할부'],
    REAL_ESTATE: ['전세임차보증금'],
  },
  institutionSuggestions: [
    '토스증권', '메리츠증권', '삼성증권', '한국투자증권', 'NH증권', '토스뱅크',
    '국민은행', '우리은행', '업비트', '빗썸', 'edgeX', '교보생명', '라이프플래닛',
  ],
  assetClassSuggestions: ['미국주식', '기타주식', '금/은', '크립토', '원화', '달러'],
  strategySuggestions: ['VR', 'INFINITE', 'PRIVACY', 'DCA'],
}
