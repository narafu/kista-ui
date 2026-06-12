'use client'

import { StrategyCard } from '@widgets/strategy-card'
import type { Strategy } from '@entities/strategy'

export function AllStrategiesList({ strategies }: { strategies: Strategy[] }) {
  if (strategies.length === 0)
    return <p className="text-sm text-muted-foreground text-center py-8">등록된 전략이 없습니다.</p>
  return (
    <div className="flex flex-col gap-2">
      {strategies.map((s) => (
        <StrategyCard key={s.id} accountId={s.accountId} strategy={s} />
      ))}
    </div>
  )
}
