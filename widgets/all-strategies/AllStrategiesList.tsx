'use client'

import { StrategyCard } from '@widgets/strategy-card'
import type { Strategy } from '@entities/strategy'
import type { Account } from '@entities/account'

interface Props {
  strategies: Strategy[]
  accounts: Account[]
}

export function AllStrategiesList({ strategies, accounts }: Props) {
  if (strategies.length === 0)
    return <p className="text-sm text-muted-foreground text-center py-8">등록된 전략이 없습니다.</p>

  const accountMap = new Map(accounts.map((a) => [a.id, a.accountNoMasked]))

  return (
    <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 lg:gap-3">
      {strategies.map((s) => (
        <StrategyCard
          key={s.id}
          accountId={s.accountId}
          strategy={s}
          accountLabel={accountMap.get(s.accountId)}
        />
      ))}
    </div>
  )
}
