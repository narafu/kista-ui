'use client'

import type { AdminAccount, AdminReorderTimingAvailability, AdminStrategy, AdminStrategyOrder } from '@entities/user'
import { formatBrokerLabel } from '@shared/lib/api-schema'
import { AdminBatchOrderCorrectionForm } from './AdminBatchOrderCorrectionForm'
import type { ReorderBatchItem } from './AdminBatchOrderCorrectionForm'

interface UserOption {
  id: string
  label: string
}

interface Props {
  users: UserOption[]
  brokers: string[]
  accounts: AdminAccount[]
  strategies: AdminStrategy[]
  tradeDates: string[]
  orders: AdminStrategyOrder[]
  selectedStrategy: AdminStrategy | null
  selectedUserId: string
  selectedBroker: string
  selectedAccountId: string
  selectedStrategyId: string
  selectedTradeDate: string
  strategyStatusPending: boolean
  reorderPending: boolean
  timingAvailability: AdminReorderTimingAvailability
  onUserChange: (userId: string) => void
  onBrokerChange: (broker: string) => void
  onAccountChange: (accountId: string) => void
  onStrategyChange: (strategyId: string) => void
  onTradeDateChange: (tradeDate: string) => void
  onStrategyStatusToggle: () => void
  onReorderSubmit: (items: ReorderBatchItem[]) => Promise<void>
}

export function AdminTradeCorrectionPanel({
  users,
  brokers,
  accounts,
  strategies,
  tradeDates,
  orders,
  selectedStrategy,
  selectedUserId,
  selectedBroker,
  selectedAccountId,
  selectedStrategyId,
  selectedTradeDate,
  strategyStatusPending,
  reorderPending,
  timingAvailability,
  onUserChange,
  onBrokerChange,
  onAccountChange,
  onStrategyChange,
  onTradeDateChange,
  onStrategyStatusToggle,
  onReorderSubmit,
}: Props) {
  const nextStrategyActionLabel = selectedStrategy?.status === 'ACTIVE' ? '전략 중지' : '전략 재개'
  const helperMessage = !selectedUserId
    ? '재주문할 사용자를 먼저 선택하세요.'
    : !selectedBroker
      ? brokers.length === 0
        ? '선택한 사용자에 연결된 증권사 계좌가 없습니다.'
        : '재주문할 증권사를 선택하세요.'
    : !selectedAccountId
      ? accounts.length === 0
        ? '선택한 증권사에 연결된 계좌가 없습니다.'
        : '재주문할 계좌를 선택하세요.'
      : !selectedStrategyId
        ? strategies.length === 0
          ? '선택한 계좌에 연결된 전략이 없습니다.'
          : '재주문할 전략을 선택하세요.'
        : !selectedTradeDate
          ? tradeDates.length === 0
            ? '선택한 사용자 기준으로 조회된 거래일이 없습니다.'
            : '재주문할 거래일을 선택하세요.'
          : orders.length === 0
            ? '선택한 조건에 해당하는 주문이 없습니다.'
            : null

  return (
    <section className="rounded-xl border border-border bg-background p-4" aria-label="재주문 대상 선택">
      <div>
        <h2 className="text-base font-semibold">재주문 대상 선택</h2>
        <p className="mt-1 text-sm text-muted-foreground">사용자부터 주문까지 순서대로 선택합니다</p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <label className="grid min-w-0 gap-2 text-sm">
          <span className="font-medium">사용자</span>
          <select
            aria-label="사용자 선택"
            value={selectedUserId}
            onChange={(event) => onUserChange(event.target.value)}
            disabled={reorderPending}
            className="h-10 w-full min-w-0 rounded-lg border border-border bg-background px-3 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">사용자 선택</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-2 text-sm">
          <span className="font-medium">증권사</span>
          <select
            aria-label="증권사 선택"
            value={selectedBroker}
            onChange={(event) => onBrokerChange(event.target.value)}
            disabled={!selectedUserId || reorderPending}
            className="h-10 w-full min-w-0 rounded-lg border border-border bg-background px-3 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">증권사 선택</option>
            {brokers.map((broker) => (
              <option key={broker} value={broker}>
                {formatBrokerLabel(broker)}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-2 text-sm">
          <span className="font-medium">계좌</span>
          <select
            aria-label="계좌 선택"
            value={selectedAccountId}
            onChange={(event) => onAccountChange(event.target.value)}
            disabled={!selectedBroker || reorderPending}
            className="h-10 w-full min-w-0 rounded-lg border border-border bg-background px-3 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">계좌 선택</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.accountNoMasked}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-2 text-sm">
          <span className="font-medium">전략</span>
          <select
            aria-label="전략 선택"
            value={selectedStrategyId}
            onChange={(event) => onStrategyChange(event.target.value)}
            disabled={!selectedAccountId || reorderPending}
            className="h-10 w-full min-w-0 rounded-lg border border-border bg-background px-3 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">전략 선택</option>
            {strategies.map((strategy) => (
              <option key={strategy.id} value={strategy.id}>
                {strategy.type} · {strategy.ticker}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-2 text-sm">
          <span className="font-medium">거래일</span>
          <select
            aria-label="거래일 선택"
            value={selectedTradeDate}
            onChange={(event) => onTradeDateChange(event.target.value)}
            disabled={!selectedStrategyId || reorderPending}
            className="h-10 w-full min-w-0 rounded-lg border border-border bg-background px-3 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">거래일 선택</option>
            {tradeDates.map((tradeDate) => (
              <option key={tradeDate} value={tradeDate}>
                {tradeDate}
              </option>
            ))}
          </select>
        </label>

      </div>

      {helperMessage ? (
        <p className="mt-4 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
          {helperMessage}
        </p>
      ) : null}

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

      {orders.length > 0 ? (
        <AdminBatchOrderCorrectionForm
          orders={orders}
          disabled={reorderPending}
          timingAvailability={timingAvailability}
          onSubmit={onReorderSubmit}
        />
      ) : null}
    </section>
  )
}
