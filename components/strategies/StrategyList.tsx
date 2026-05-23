'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StrategyCard } from './StrategyCard'
import { StrategyFormDialog } from './StrategyFormDialog'
import type { Strategy } from '@/types/strategy'

const MAX_STRATEGIES = 1

interface Props {
  accountId: string
  strategies: Strategy[]
}

export function StrategyList({ accountId, strategies }: Props) {
  const canAdd = strategies.length < MAX_STRATEGIES

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">전략</CardTitle>
          <StrategyFormDialog accountId={accountId} disabled={!canAdd} />
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        {strategies.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            등록된 전략이 없습니다. 위의 전략 추가 버튼으로 전략을 등록하세요.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {strategies.map((s) => (
              <StrategyCard key={s.id} strategy={s} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
