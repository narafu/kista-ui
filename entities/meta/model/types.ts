export interface EnumMeta {
  code: string
  label: string
  description?: string
}

export interface StrategyTypeMeta {
  code: string
  label?: string                // 한국어 표시 이름 (kista-api a95ad797부터, 1h 메타 캐시 대비 optional — labelOf가 description으로 폴백)
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

// 1h 메타 캐시로 새 필드가 빠질 수 있어 모두 optional
export interface BrokerMeta extends EnumMeta {
  apiKeyExpirySource?: ApiKeyExpirySource // API 키 만료일 출처 — ESTIMATED(추정, 사용자 입력 가능)·NONE
}

type ApiKeyExpirySource = 'ESTIMATED' | 'NONE'

export interface MetaBundle {
  strategyTypes: StrategyTypeMeta[]
  tickers: TickerMeta[]
  brokers: BrokerMeta[]
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
  dcaSizingTypes: EnumMeta[]
  dcaShortfallPolicies: EnumMeta[]
  dcaIndicators: DcaIndicatorMeta[]
  // 1h 메타 캐시가 이 키보다 오래됐을 수 있어 optional — labelOf가 code로 폴백한다
  orderStatuses?: EnumMeta[]
  dcaExecutionStatuses?: EnumMeta[]
  orderTimings?: EnumMeta[]
}
