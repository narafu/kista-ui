import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StrategyCard } from '@widgets/strategy-card'
import { StrategyFormDialog } from '@features/strategy/create-strategy'
import { EmptyState } from '@shared/ui/EmptyState'
import type { Strategy } from '@entities/strategy'
import type { NextOrderPreview } from '@entities/order'

interface Props {
  accountId: string
  strategies: Strategy[]
  previewsByStrategyId?: Record<string, NextOrderPreview>
}

export function StrategyList({ accountId, strategies, previewsByStrategyId }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">전략</CardTitle>
          <StrategyFormDialog accountId={accountId} disabled={false} />
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        {strategies.length === 0 ? (
          <EmptyState variant="text" message="등록된 전략이 없습니다. 종목당 1개씩, 여러 전략을 추가할 수 있습니다." />
        ) : (
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 lg:gap-3">
            {strategies.map((s) => (
              <StrategyCard key={s.id} accountId={accountId} strategy={s} initialPreview={previewsByStrategyId?.[s.id]} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
