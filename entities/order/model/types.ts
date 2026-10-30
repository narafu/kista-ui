export interface NextOrderPositionSnapshot {
  ticker: string
  holdings: number
  averagePrice: string  // 0회차: 전일종가, 이후: 평균 매입가
  usdDeposit: string
  totalAssets: string
  priceOffsetRate: string
  currentRound: number
  unitAmount: string
  referencePrice: string
  targetPrice: string
}

export interface NextOrderItem {
  ticker: string
  orderType: string
  timing?: string // OrderTiming(AT_CLOSE/AT_OPEN/IMMEDIATE) — kista-api f9a548829 이전 응답엔 없음
  direction: string
  quantity: number
  price: string
}

export type { SkipReason } from '@shared/lib/api-schema'
import type { SkipReason } from '@shared/lib/api-schema'
export type { PlacedOrder } from '@shared/model/placed-order'
import type { PlacedOrder } from '@shared/model/placed-order'

export interface LedgerCheck {
  remainingLedger: number
  requiredBuyUsd: number
  sufficient: boolean // false면 그 사이클 신규 BUY 전체 거절
  trimmed: boolean    // true면 원장에 맞춰 BUY를 축소 접수 (부족 아님, 정보성)
}

// 계좌 단위 — 같은 계좌의 모든 전략 미리보기에 같은 값이 온다
export interface AccountCashCheck {
  availableUsd: number   // 증권사 USD 주문가능금액 (조회 시점, 접수 완료 주문은 증권사가 이미 차감)
  requiredBuyUsd: number // 계좌 전체 오늘 BUY 필요 금액
  sufficient: boolean    // false면 배치 접수 시 증권사가 BUY를 거절할 수 있다 (경고 전용)
}

// (계좌, 종목) 단위 — 같은 계좌·같은 종목 전략 미리보기에 같은 값이 온다
export interface AccountHoldingsCheck {
  availableQuantity: number    // 증권사 판매 가능 수량 (조회 시점, 미체결 매도 차감 전)
  requiredSellQuantity: number // 종목 전체 오늘 SELL 필요 수량 (접수 완료 PLACED SELL 포함 — 장중 일부 체결 시 부족 쪽으로 보수적)
  sufficient: boolean          // false면 배치 접수 시 증권사가 SELL을 거절할 수 있다 (경고 전용)
}

export interface NextOrderPreview {
  tradeDate: string
  position: NextOrderPositionSnapshot | null
  orders: NextOrderItem[]
  skipReason: SkipReason | null
  todayOrders: Array<PlacedOrder & { timing?: string }>             // 오늘 이미 등록된 PLANNED + PLACED 주문 (없으면 빈 배열)
  otherStrategiesPlannedBuyUsd: string     // 계좌 내 타 전략 당일 PLANNED BUY 합계
  ledgerCheck: LedgerCheck | null          // 전략 원장 예수금 점검 결과 (DCA·신규 BUY 없음·skip이면 null)
  accountCashCheck: AccountCashCheck | null // 계좌 주문가능 USD 점검 (MOCK·코인·필요 BUY 없음·조회 실패면 null)
  accountHoldingsCheck: AccountHoldingsCheck | null // 계좌 종목 판매 가능 수량 점검 (MOCK·코인·필요 SELL 없음·조회 실패면 null)
}

export interface StrategyOrder {
  id: string
  tradeDate: string
  direction: 'BUY' | 'SELL'
  orderType: string
  quantity: number
  price: string
  status: string
  filledQuantity: number | null
  filledPrice: string | null
}
