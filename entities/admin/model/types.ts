import type { components } from '@shared/lib/api-types'
import type { OrderDirection, OrderStatus, OrderType } from '@shared/lib/api-schema'

// 서버 record라 항상 전 필드를 보내지만 스펙엔 optional로 생성돼 Required로 고정한다.
// 스펙의 nullable 표기도 실제와 어긋나(@Schema nullable 누락) null이 오는 필드는 NullableFields로 따로 연다.
type Schema<K extends keyof components['schemas']> = Required<components['schemas'][K]>
type NullableFields<T, K extends keyof T> = { [P in K]: T[P] | null }

type AdminTradeSchema = Schema<'AdminTradeResponse'>
type AdminStrategySchema = Schema<'AdminStrategyResponse'>
type AdminAccountItemSchema = Schema<'AdminAccountItem'>

export type OrderTiming = 'AT_OPEN' | 'AT_CLOSE' | 'IMMEDIATE'

export type AdminUser = Schema<'AdminUserResponse'>

export type AdminStats = Schema<'AdminDashboardResponse'>

export type AdminAccountStrategy = Pick<AdminStrategySchema, 'id' | 'type' | 'status' | 'ticker'>

export type AdminAccount = Pick<Schema<'AdminAccountResponse'>, 'id' | 'userId' | 'ownerNickname' | 'broker'>
  & NullableFields<Schema<'AdminAccountResponse'>, 'accountNoMasked'> // 업비트·메리츠는 계좌번호가 없어 null
  & { strategies: AdminAccountStrategy[] }

export type AdminTrade = Pick<AdminTradeSchema, 'id' | 'accountId' | 'ownerNickname' | 'tradeDate' | 'ticker' | 'quantity' | 'price'>
  // userId는 계좌를 찾지 못한 주문이면 null(닉네임 "(알 수 없음)") — 전략 주문 조회는 이때 404라 AdminStrategyOrder엔 없다
  & NullableFields<AdminTradeSchema, 'userId' | 'strategyId' | 'strategyType'>
  & {
    direction: OrderDirection
    orderType: OrderType
    // GET /api/admin/trades는 status 필터 없이 도메인 Order.status.name()을 그대로 내려
    // OrderStatus 전체(PLANNED·SUBMITTING·PARTIALLY_FILLED·CANCELLED 포함)가 올 수 있다.
    status: OrderStatus
    currency: AdminTradeSchema['currency'] // price 통화(Currency name) — 계좌를 찾지 못하면 null, 종목으로는 정할 수 없다(BTC는 KRW·USDT 시장 공유)
  }

export type AdminStrategy = Pick<AdminStrategySchema, 'id' | 'type' | 'ticker' | 'cycleSeedType'> & {
  status: 'ACTIVE' | 'PAUSED'
}

export type AdminStrategyOrder = Pick<AdminTradeSchema, 'id' | 'userId' | 'ownerNickname' | 'strategyCycleId' | 'tradeDate' | 'ticker' | 'quantity' | 'price'>
  & NullableFields<AdminTradeSchema, 'strategyType' | 'externalOrderId' | 'filledQuantity' | 'filledPrice'>
  & {
    direction: OrderDirection
    orderType: OrderType
    timing: OrderTiming
    status: OrderStatus
  }

export type AdminReorderTimingAvailability = Schema<'ReorderTimingAvailabilityResponse'>

// BUY 재주문 예산 — 같은 계좌 원본 주문 일괄 조회. cycleRemaining은 사이클별 남은 원장 한도(키 없으면 DCA라 상한 없음),
// sourceRefunds는 원본 주문별 취소 환급액. 서버는 이 한도를 넘는 재주문 BUY를 409로 차단한다.
export type AdminReorderBuyBudget = Schema<'ReorderBuyBudgetResponse'>

// 요청 스키마는 필수/선택 표기가 서버 @NotNull과 일치해 Required를 씌우지 않는다
export type AdminReorderRequest = Omit<components['schemas']['AdminReorderRequest'], 'timing' | 'direction'> & {
  timing: OrderTiming
  direction?: OrderDirection
}

export type AdminReorderResponse = Pick<Schema<'AdminReorderResponse'>, 'userId' | 'accountId' | 'strategyId' | 'sourceOrderId'>
  & Partial<NullableFields<Schema<'AdminReorderResponse'>, 'newOrderExternalId'>>
  & {
    originalStatus: OrderStatus
    resultingStatus: OrderStatus
  }

export type AdminAuditLog = Pick<Schema<'AuditLogResponse'>, 'id' | 'adminId' | 'action' | 'createdAt'>
  & NullableFields<Schema<'AuditLogResponse'>, 'targetType' | 'targetId' | 'payload'>

export type AdminAnomalyAccount = Pick<AdminAccountItemSchema, 'id' | 'userId' | 'ownerNickname'>
  & NullableFields<AdminAccountItemSchema, 'accountNoMasked' | 'accountNo'> // 업비트·메리츠는 계좌번호가 없어 null

export type AdminAnomalies = {
  pausedAccounts: AdminAnomalyAccount[]
  inactiveAccounts: AdminAnomalyAccount[]
}

export type AppErrorLog = Pick<Schema<'ErrorLogResponse'>, 'id' | 'errorType' | 'message' | 'context' | 'createdAt'>
  & Partial<NullableFields<Schema<'ErrorLogResponse'>, 'stackTrace'>>
