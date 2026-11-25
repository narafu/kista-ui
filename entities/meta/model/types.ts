import type { components } from '@shared/lib/api-types'
import type { ApiKeyExpirySource, RecurringMode } from '@shared/lib/api-schema'

type Schemas = components['schemas']

export type EnumMeta = Schemas['EnumMeta']

// 전략 생성 필드 정책 — 생성 스키마(StrategyFieldSettingsObject)는 값이 unknown·전부 optional이라 필드별 값 타입으로 좁힌다.
// 서버 record(StrategyFieldSettings)는 세 필드가 모두 non-null이다
export interface StrategyFieldSettings<T> {
  customizable: boolean
  allowedValues: T[]
  defaultValue: T
}

// 적용 안 되는 필드는 서버가 생략한다(NON_NULL). ticker는 모든 전략에 있다
export interface StrategyFieldsMeta {
  ticker: StrategyFieldSettings<string>
  divisionCount?: StrategyFieldSettings<number>
  recurringMode?: StrategyFieldSettings<RecurringMode>
  bandWidth?: StrategyFieldSettings<number>
  intervalWeeks?: StrategyFieldSettings<number>
}

// 서버 record 필드가 전부 primitive라 생성 스키마의 optional을 걷어낸다
export type VrRampParams = Required<Schemas['VrRampParams']>

export interface StrategyTypeMeta {
  code: string
  label?: string                // 한국어 표시 이름 — labelOf가 없으면 description으로 폴백
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
  supportedBrokers?: string[]   // 등록 가능 증권사 code — 빈 배열·누락이면 전체 허용
  enabled: boolean              // 신규 전략 생성 허용 여부 (관리자 운영 설정)
  fields: StrategyFieldsMeta    // 생성 필드별 허용값·기본값 (관리자 운영 설정)
  vrRampDefaults?: Record<RecurringMode, VrRampParams> // VR 램프 기본값표(적립 모드별) — VR 외 전략은 생략
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

export interface BrokerMeta extends EnumMeta {
  apiKeyExpirySource?: ApiKeyExpirySource // API 키 만료일 출처 — ESTIMATED(추정, 사용자 입력 가능)·NONE
  enabled: boolean                        // 신규 계좌 등록 허용 여부 (관리자 운영 설정)
}

// 라벨 enum 목록·approvalRequired·benchmarkEtf는 생성 스키마를 그대로 쓰고, 소비처가 좁힌 타입을 쓰는 항목만 덮어쓴다
export type MetaBundle = Omit<Schemas['MetaBundle'], 'strategyTypes' | 'tickers' | 'brokers' | 'dcaIndicators'> & {
  strategyTypes: StrategyTypeMeta[]
  tickers: TickerMeta[]
  brokers: BrokerMeta[]
  dcaIndicators: DcaIndicatorMeta[]
}
