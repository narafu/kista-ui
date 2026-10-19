'use client'

import type { AdminAccount, AdminReorderTimingAvailability, AdminStrategy, AdminStrategyOrder } from '@entities/admin'
import { useMeta } from '@entities/meta'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatBrokerLabel } from '@shared/lib/api-schema'
import { toSelectValue } from '@shared/lib/utils'
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
  orders: AdminStrategyOrder[]
  selectedStrategy: AdminStrategy | null
  selectedUserId: string
  selectedBroker: string
  selectedAccountId: string
  selectedStrategyId: string
  strategyStatusPending: boolean
  reorderPending: boolean
  timingAvailability: AdminReorderTimingAvailability
  onUserChange: (userId: string) => void
  onBrokerChange: (broker: string) => void
  onAccountChange: (accountId: string) => void
  onStrategyChange: (strategyId: string) => void
  onStrategyStatusToggle: () => void
  onReorderSubmit: (items: ReorderBatchItem[]) => Promise<void>
}

type HelperInput = Pick<Props, 'brokers' | 'accounts' | 'strategies' | 'orders' | 'selectedUserId' | 'selectedBroker' | 'selectedAccountId' | 'selectedStrategyId'>

// 선택 단계별 안내 문구 — 앞 단계가 비어 있으면 그 단계 안내가 우선
function getHelperMessage({ brokers, accounts, strategies, orders, selectedUserId, selectedBroker, selectedAccountId, selectedStrategyId }: HelperInput): string | null {
  if (!selectedUserId) return '재주문할 사용자를 먼저 선택하세요.'
  if (!selectedBroker) return brokers.length === 0 ? '선택한 사용자에 연결된 증권사 계좌가 없습니다.' : '재주문할 증권사를 선택하세요.'
  if (!selectedAccountId) return accounts.length === 0 ? '선택한 증권사에 연결된 계좌가 없습니다.' : '재주문할 계좌를 선택하세요.'
  if (!selectedStrategyId) return strategies.length === 0 ? '선택한 계좌에 연결된 전략이 없습니다.' : '재주문할 전략을 선택하세요.'
  return orders.length === 0 ? '선택한 전략의 재주문 대상 거래일 주문이 없습니다.' : null
}

export function AdminTradeCorrectionPanel({
  users,
  brokers,
  accounts,
  strategies,
  orders,
  selectedStrategy,
  selectedUserId,
  selectedBroker,
  selectedAccountId,
  selectedStrategyId,
  strategyStatusPending,
  reorderPending,
  timingAvailability,
  onUserChange,
  onBrokerChange,
  onAccountChange,
  onStrategyChange,
  onStrategyStatusToggle,
  onReorderSubmit,
}: Props) {
  const { labelOf } = useMeta()
  const nextStrategyActionLabel = selectedStrategy?.status === 'ACTIVE' ? '전략 일시중지' : '전략 재개'
  const userItems = users.map((user) => ({ value: user.id, label: user.label }))
  const brokerItems = brokers.map((broker) => ({ value: broker, label: formatBrokerLabel(broker) }))
  // 업비트는 계좌번호가 없어 증권사명과 id 앞자리로 구분
  const accountItems = accounts.map((account) => ({ value: account.id, label: account.accountNoMasked ?? `${formatBrokerLabel(account.broker)} ${account.id.slice(0, 8)}` }))
  const strategyItems = strategies.map((strategy) => ({ value: strategy.id, label: `${labelOf('strategyTypes', strategy.type)} · ${strategy.ticker}` }))
  const helperMessage = getHelperMessage({ brokers, accounts, strategies, orders, selectedUserId, selectedBroker, selectedAccountId, selectedStrategyId })

  return (
    <section className="rounded-[var(--r-lg)] border border-border bg-background p-4" aria-label="재주문 대상 선택">
      <div>
        <h2 className="text-base font-semibold">재주문 대상 선택</h2>
        <p className="mt-1 text-sm text-muted-foreground">사용자부터 전략까지 순서대로 선택한 뒤, 값을 바꾼 주문만 다음 거래일 기준으로 재주문합니다.</p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="grid min-w-0 gap-2 text-sm">
          <Label htmlFor="reorder-user-select" className="font-medium">사용자</Label>
          <Select
            items={userItems}
            value={toSelectValue(userItems, selectedUserId)}
            onValueChange={(value) => { if (value) onUserChange(value) }}
            disabled={reorderPending}
          >
            <SelectTrigger id="reorder-user-select" aria-label="사용자 선택" className="h-10 w-full min-w-0">
              <SelectValue placeholder="사용자 선택" />
            </SelectTrigger>
            <SelectContent>
              {userItems.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid min-w-0 gap-2 text-sm">
          <Label htmlFor="reorder-broker-select" className="font-medium">증권사</Label>
          <Select
            items={brokerItems}
            value={toSelectValue(brokerItems, selectedBroker)}
            onValueChange={(value) => { if (value) onBrokerChange(value) }}
            disabled={!selectedUserId || reorderPending}
          >
            <SelectTrigger id="reorder-broker-select" aria-label="증권사 선택" className="h-10 w-full min-w-0">
              <SelectValue placeholder="증권사 선택" />
            </SelectTrigger>
            <SelectContent>
              {brokerItems.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid min-w-0 gap-2 text-sm">
          <Label htmlFor="reorder-account-select" className="font-medium">계좌</Label>
          <Select
            items={accountItems}
            value={toSelectValue(accountItems, selectedAccountId)}
            onValueChange={(value) => { if (value) onAccountChange(value) }}
            disabled={!selectedBroker || reorderPending}
          >
            <SelectTrigger id="reorder-account-select" aria-label="계좌 선택" className="h-10 w-full min-w-0">
              <SelectValue placeholder="계좌 선택" />
            </SelectTrigger>
            <SelectContent>
              {accountItems.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid min-w-0 gap-2 text-sm">
          <Label htmlFor="reorder-strategy-select" className="font-medium">전략</Label>
          <Select
            items={strategyItems}
            value={toSelectValue(strategyItems, selectedStrategyId)}
            onValueChange={(value) => { if (value) onStrategyChange(value) }}
            disabled={!selectedAccountId || reorderPending}
          >
            <SelectTrigger id="reorder-strategy-select" aria-label="전략 선택" className="h-10 w-full min-w-0">
              <SelectValue placeholder="전략 선택" />
            </SelectTrigger>
            <SelectContent>
              {strategyItems.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>


      </div>

      {helperMessage ? (
        <p className="mt-4 rounded-[var(--r-md)] border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
          {helperMessage}
        </p>
      ) : null}

      {selectedStrategy ? (
        <div className="mt-4 rounded-[var(--r-md)] border border-border bg-muted/20 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium">현재 전략 상태: {labelOf('strategyStatuses', selectedStrategy.status)}</p>
            <Button type="button" variant="outline" size="sm" onClick={onStrategyStatusToggle} disabled={strategyStatusPending}>
              {strategyStatusPending ? '처리 중...' : nextStrategyActionLabel}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            전략 상태 변경 후 목록을 다시 불러와 최신 상태를 반영합니다.
          </p>
        </div>
      ) : null}

      {orders.length > 0 ? (
        <AdminBatchOrderCorrectionForm
          key={`${orders.map((o) => o.id).join(',')}-${Number(timingAvailability.atOpen)}${Number(timingAvailability.atClose)}${Number(timingAvailability.immediate)}`}
          orders={orders}
          disabled={reorderPending}
          timingAvailability={timingAvailability}
          onSubmit={onReorderSubmit}
        />
      ) : null}
    </section>
  )
}
