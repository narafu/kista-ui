import type { components } from '@shared/lib/api-types'
import type { OrderDirection, OrderStatus, OrderType, UserRole, UserStatus } from '@shared/lib/api-schema'

export interface AdminUser {
  id: string
  nickname: string
  status: UserStatus
  role: UserRole
  createdAt: string
}

export interface AdminStats {
  totalUsers: number
  pendingCount: number
  activeCount: number
  rejectedCount: number
  totalAccounts: number
}

export interface AdminAccountStrategy {
  id: string
  type: string
  status: string
  ticker: string
}

export interface AdminAccount {
  id: string
  userId: string
  ownerNickname: string
  accountNoMasked: string | null // 업비트·메리츠는 계좌번호가 없어 null
  broker: string
  strategies: AdminAccountStrategy[]
}

export interface AdminTrade {
  id: string
  userId: string
  accountId: string
  strategyId: string | null
  ownerNickname: string
  strategyType?: string
  tradeDate: string
  ticker: string
  direction: OrderDirection
  orderType: OrderType
  quantity: number
  price: number
  // GET /api/admin/trades는 status 필터 없이 도메인 Order.status.name()을 그대로 내려
  // OrderStatus 전체(PLANNED·SUBMITTING·PARTIALLY_FILLED·CANCELLED 포함)가 올 수 있다.
  status: OrderStatus
  currency?: string | null // price 통화(Currency name) — 계좌를 찾지 못하면 null, 종목으로는 정할 수 없다(BTC는 KRW·USDT 시장 공유)
}

export interface AdminStrategy {
  id: string
  type: string
  status: 'ACTIVE' | 'PAUSED'
  ticker: string
  cycleSeedType: string
}

export interface AdminStrategyOrder {
  id: string
  userId: string
  ownerNickname: string
  strategyType?: string | null
  strategyCycleId?: string | null // 재주문 예산 cycleRemaining 키 — 구 API 응답엔 없다
  tradeDate: string
  ticker: string
  direction: OrderDirection
  orderType: OrderType
  timing: 'AT_OPEN' | 'AT_CLOSE' | 'IMMEDIATE'
  quantity: number
  price: number
  status: OrderStatus
  externalOrderId?: string | null
  filledQuantity?: number | null
  filledPrice?: number | null
}

export interface AdminReorderTimingAvailability {
  atOpen: boolean
  atClose: boolean
  immediate: boolean
}

// BUY 재주문 예산 — 같은 계좌 원본 주문 일괄 조회. cycleRemaining은 사이클별 남은 원장 한도(키 없으면 DCA라 상한 없음),
// sourceRefunds는 원본 주문별 취소 환급액. 서버는 이 한도를 넘는 재주문 BUY를 409로 차단한다.
// 서버 record라 항상 전 필드를 보내지만 스펙엔 optional로 생성돼 Required로 고정한다.
export type AdminReorderBuyBudget = Required<components['schemas']['ReorderBuyBudgetResponse']>

export interface AdminReorderRequest {
  userId: string
  accountId: string
  strategyId: string
  orderId: string
  timing: 'AT_OPEN' | 'AT_CLOSE' | 'IMMEDIATE'
  tradeDate: string
  direction?: OrderDirection
  quantity?: number
  price?: number
  memo?: string
}

export interface AdminReorderResponse {
  userId: string
  accountId: string
  strategyId: string
  sourceOrderId: string
  originalStatus: OrderStatus
  resultingStatus: OrderStatus
  newOrderExternalId?: string | null
}

export interface AdminAuditLog {
  id: string
  adminId: string
  action: string
  targetType: string | null
  targetId: string | null
  payload: Record<string, unknown> | null
  createdAt: string
}

export interface AdminAnomalyAccount {
  id: string
  userId: string
  ownerNickname: string
  accountNoMasked: string | null // 업비트·메리츠는 계좌번호가 없어 null
  accountNo: string | null
}

export interface AdminAnomalies {
  pausedAccounts: AdminAnomalyAccount[]
  inactiveAccounts: AdminAnomalyAccount[]
}

export interface AppErrorLog {
  id: string
  errorType: string
  message: string
  stackTrace?: string | null
  context: Record<string, string>
  createdAt: string
}
