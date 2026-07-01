'use client'

import type { AdminAccount, AdminStrategy, AdminStrategyOrder } from '@entities/user'

interface UserOption {
  id: string
  label: string
}

interface Props {
  users: UserOption[]
  accounts: AdminAccount[]
  strategies: AdminStrategy[]
  tradeDates: string[]
  orders: AdminStrategyOrder[]
  selectedStrategy: AdminStrategy | null
  selectedOrder: AdminStrategyOrder | null
  selectedUserId: string
  selectedAccountId: string
  selectedStrategyId: string
  selectedTradeDate: string
  selectedOrderId: string
  strategyStatusPending: boolean
  onUserChange: (userId: string) => void
  onAccountChange: (accountId: string) => void
  onStrategyChange: (strategyId: string) => void
  onTradeDateChange: (tradeDate: string) => void
  onOrderChange: (orderId: string) => void
  onStrategyStatusToggle: () => void
}

const READ_ONLY_ORDER_MESSAGE: Partial<Record<AdminStrategyOrder['status'], string>> = {
  FAILED: 'FAILED 주문은 읽기 전용입니다. 상태 확인만 가능하며 보정은 진행할 수 없습니다.',
  CANCELLED: 'CANCELLED 주문은 읽기 전용입니다. 취소 이력을 유지해야 하므로 보정은 진행할 수 없습니다.',
}

export function AdminTradeCorrectionPanel({
  users,
  accounts,
  strategies,
  tradeDates,
  orders,
  selectedStrategy,
  selectedOrder,
  selectedUserId,
  selectedAccountId,
  selectedStrategyId,
  selectedTradeDate,
  selectedOrderId,
  strategyStatusPending,
  onUserChange,
  onAccountChange,
  onStrategyChange,
  onTradeDateChange,
  onOrderChange,
  onStrategyStatusToggle,
}: Props) {
  const nextStrategyActionLabel = selectedStrategy?.status === 'ACTIVE' ? '전략 중지' : '전략 재개'
  const readOnlyMessage = selectedOrder ? READ_ONLY_ORDER_MESSAGE[selectedOrder.status] : null

  return (
    <section className="rounded-xl border border-border bg-background p-4" aria-label="주문 보정 선택">
      <div>
        <h2 className="text-base font-semibold">주문 보정 선택</h2>
        <p className="mt-1 text-sm text-muted-foreground">사용자부터 주문까지 순서대로 선택합니다</p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-5">
        <label className="grid gap-2 text-sm">
          <span className="font-medium">사용자</span>
          <select
            aria-label="사용자 선택"
            value={selectedUserId}
            onChange={(event) => onUserChange(event.target.value)}
            className="h-10 rounded-lg border border-border bg-background px-3"
          >
            <option value="">사용자 선택</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm">
          <span className="font-medium">계좌</span>
          <select
            aria-label="계좌 선택"
            value={selectedAccountId}
            onChange={(event) => onAccountChange(event.target.value)}
            disabled={!selectedUserId}
            className="h-10 rounded-lg border border-border bg-background px-3 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">계좌 선택</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.ownerNickname} · {account.accountNoMasked}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm">
          <span className="font-medium">전략</span>
          <select
            aria-label="전략 선택"
            value={selectedStrategyId}
            onChange={(event) => onStrategyChange(event.target.value)}
            disabled={!selectedAccountId}
            className="h-10 rounded-lg border border-border bg-background px-3 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">전략 선택</option>
            {strategies.map((strategy) => (
              <option key={strategy.id} value={strategy.id}>
                {strategy.type} · {strategy.ticker}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm">
          <span className="font-medium">거래일</span>
          <select
            aria-label="거래일 선택"
            value={selectedTradeDate}
            onChange={(event) => onTradeDateChange(event.target.value)}
            disabled={!selectedStrategyId}
            className="h-10 rounded-lg border border-border bg-background px-3 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">거래일 선택</option>
            {tradeDates.map((tradeDate) => (
              <option key={tradeDate} value={tradeDate}>
                {tradeDate}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm">
          <span className="font-medium">주문</span>
          <select
            aria-label="주문 선택"
            value={selectedOrderId}
            onChange={(event) => onOrderChange(event.target.value)}
            disabled={!selectedTradeDate}
            className="h-10 rounded-lg border border-border bg-background px-3 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">주문 선택</option>
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.ticker} · {order.direction} · {order.quantity}주 · {order.status}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedStrategy ? (
        <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium">현재 전략 상태: {selectedStrategy.status}</p>
            <button
              type="button"
              onClick={onStrategyStatusToggle}
              disabled={strategyStatusPending}
              aria-label={nextStrategyActionLabel}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              {strategyStatusPending ? '처리 중...' : nextStrategyActionLabel}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            전략 상태 변경 후 목록을 다시 불러와 최신 상태를 반영합니다.
          </p>
        </div>
      ) : null}

      {readOnlyMessage ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {readOnlyMessage}
        </p>
      ) : null}
    </section>
  )
}
