import type { CycleSeedType } from '@shared/lib/api-schema'

export type BacktestType = 'INFINITE' | 'PRIVACY' | 'VR'

export interface BacktestParams {
  type: BacktestType
  ticker: string
  from: string
  to: string
  seed: number
  divisionCount?: number
  // INFINITE·PRIVACY 전용 사이클 연속 정책 — 생략하면 서버가 MAX(전액 이월)로 처리
  cycleSeedType?: CycleSeedType
  vrBandWidth?: number
  vrIntervalWeeks?: number
  vrRecurringAmount?: number
  vrInitialValue?: number
  // VR 램프 — 미지정이면 서버가 운영 전략 등록과 같은 recurringMode별 기본값을 쓴다. 비율 필드는 0~1
  vrInitialGradient?: number
  vrGGraceWeeks?: number
  vrGStepWeeks?: number
  vrGMax?: number
  vrInitialPoolLimitRate?: number
  vrPGraceWeeks?: number
  vrPStepWeeks?: number
  vrPoolLimitFloor?: number
  // 중간부터 시작 — 기존 보유 수량·평단가 (세 전략 공통, 미지정이면 빈 포지션에서 시작)
  initialHoldings?: number
  initialAvgPrice?: number
}

export interface BacktestPoint {
  date: string
  totalAsset: number
  principal: number
}

export interface BacktestSummary {
  finalAsset: number
  totalInvested: number
  totalReturnRate: number
  cagr: number | null
  mdd: number
  tradeCount: number
  cycleCount: number
}

export interface BacktestResult {
  points: BacktestPoint[]
  summary: BacktestSummary
  warnings: string[]
}
