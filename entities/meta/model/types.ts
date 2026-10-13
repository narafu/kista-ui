export interface EnumMeta {
  code: string
  label: string
  description?: string
}

export interface StrategyTypeMeta {
  code: string
  description?: string
  availableTickers: string[]
  requiresPrivacyBase: boolean  // basePrice 소스가 기준매매표인지 (true=기준매매표, false=실시간 현재가)
  tickerFixed: boolean          // 티커 선택 불가 (단일 고정)
  supportsReverseMode: boolean  // 리버스모드 배지 표시 가능
  divisionCounts: number[]      // 분할 수 옵션 — 빈 배열이면 분할 개념 없음
  // DCA 전용 선택지(code 배열) — 기존 전략은 빈 배열
  orderTypes: string[]
  directions: string[]
  frequencies: string[]
  conditionIndicators: string[]
}

// DCA 조건 지표 메타 — SMA만 smaPeriods가 채워지고 나머지는 빈 배열
export interface DcaIndicatorMeta extends EnumMeta {
  smaPeriods: number[]
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
  assetClasses: EnumMeta[]
  markets: EnumMeta[]
  financeAccountTypes: EnumMeta[]
  financeCategoryTypes: EnumMeta[]
  orderTypes: EnumMeta[]
  orderDirections: EnumMeta[]
  dcaFrequencies: EnumMeta[]
  dcaOperators: EnumMeta[]
  dcaSkipReasons: EnumMeta[]
  dcaIndicators: DcaIndicatorMeta[]
}
