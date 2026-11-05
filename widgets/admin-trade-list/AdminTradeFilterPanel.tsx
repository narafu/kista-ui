'use client'

import type { AdminAccount, AdminStrategy } from '@entities/admin'
import { useMeta } from '@entities/meta'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toSelectValue } from '@shared/lib/utils'

interface UserOption {
  id: string
  label: string
}

interface Props {
  users: UserOption[]
  brokers: string[]
  accounts: AdminAccount[]
  strategies: AdminStrategy[]
  selectedStrategy: AdminStrategy | null
  selectedUserId: string
  selectedBroker: string
  selectedAccountId: string
  selectedStrategyId: string
  strategyStatusPending: boolean
  onUserChange: (userId: string) => void
  onBrokerChange: (broker: string) => void
  onAccountChange: (accountId: string) => void
  onStrategyChange: (strategyId: string) => void
  onStrategyStatusToggle: () => void
}

type HelperInput = Pick<Props, 'brokers' | 'accounts' | 'strategies' | 'selectedUserId' | 'selectedBroker' | 'selectedAccountId'>

// 선택한 단계의 하위 목록이 비어 있을 때만 안내한다 — 각 선택은 독립적으로 거래 내역을 거른다
function getHelperMessage({ brokers, accounts, strategies, selectedUserId, selectedBroker, selectedAccountId }: HelperInput): string | null {
  if (selectedUserId && brokers.length === 0) return '선택한 사용자에 연결된 증권사 계좌가 없습니다.'
  if (selectedBroker && accounts.length === 0) return '선택한 증권사에 연결된 계좌가 없습니다.'
  if (selectedAccountId && strategies.length === 0) return '선택한 계좌에 연결된 전략이 없습니다.'
  return null
}

export function AdminTradeFilterPanel({
  users,
  brokers,
  accounts,
  strategies,
  selectedStrategy,
  selectedUserId,
  selectedBroker,
  selectedAccountId,
  selectedStrategyId,
  strategyStatusPending,
  onUserChange,
  onBrokerChange,
  onAccountChange,
  onStrategyChange,
  onStrategyStatusToggle,
}: Props) {
  const { labelOf } = useMeta()
  const nextStrategyActionLabel = selectedStrategy?.status === 'ACTIVE' ? '전략 일시중지' : '전략 재개'
  const userItems = users.map((user) => ({ value: user.id, label: user.label }))
  const brokerItems = brokers.map((broker) => ({ value: broker, label: labelOf('brokers', broker) }))
  // 계좌명(별칭) + 마스킹 번호. 계좌번호가 없는 계좌(메리츠)는 계좌명만으로 구분한다
  const accountItems = accounts.map((account) => ({ value: account.id, label: account.accountNoMasked ? `${account.nickname} · ${account.accountNoMasked}` : account.nickname }))
  const strategyItems = strategies.map((strategy) => ({ value: strategy.id, label: `${labelOf('strategyTypes', strategy.type)} · ${strategy.ticker}` }))
  const helperMessage = getHelperMessage({ brokers, accounts, strategies, selectedUserId, selectedBroker, selectedAccountId })

  return (
    <section className="rounded-[var(--r-lg)] border border-border bg-background p-4" aria-label="거래 내역 필터">
      <h2 className="text-base font-semibold">거래 내역 필터</h2>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="grid min-w-0 gap-2 text-sm">
          <Label htmlFor="trade-filter-user-select" className="font-medium">사용자</Label>
          <Select
            items={userItems}
            value={toSelectValue(userItems, selectedUserId)}
            onValueChange={(value) => { if (value) onUserChange(value) }}
          >
            <SelectTrigger id="trade-filter-user-select" aria-label="사용자 선택" className="h-10 w-full min-w-0">
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
          <Label htmlFor="trade-filter-broker-select" className="font-medium">증권사</Label>
          <Select
            items={brokerItems}
            value={toSelectValue(brokerItems, selectedBroker)}
            onValueChange={(value) => { if (value) onBrokerChange(value) }}
            disabled={!selectedUserId}
          >
            <SelectTrigger id="trade-filter-broker-select" aria-label="증권사 선택" className="h-10 w-full min-w-0">
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
          <Label htmlFor="trade-filter-account-select" className="font-medium">계좌</Label>
          <Select
            items={accountItems}
            value={toSelectValue(accountItems, selectedAccountId)}
            onValueChange={(value) => { if (value) onAccountChange(value) }}
            disabled={!selectedBroker}
          >
            <SelectTrigger id="trade-filter-account-select" aria-label="계좌 선택" className="h-10 w-full min-w-0">
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
          <Label htmlFor="trade-filter-strategy-select" className="font-medium">전략</Label>
          <Select
            items={strategyItems}
            value={toSelectValue(strategyItems, selectedStrategyId)}
            onValueChange={(value) => { if (value) onStrategyChange(value) }}
            disabled={!selectedAccountId}
          >
            <SelectTrigger id="trade-filter-strategy-select" aria-label="전략 선택" className="h-10 w-full min-w-0">
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
        </div>
      ) : null}
    </section>
  )
}
