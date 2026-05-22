'use client'

import { Card, CardContent } from '@/components/ui/card'
import { StrategyCard } from './StrategyCard'
import { StrategyFormDialog } from './StrategyFormDialog'
import type { Strategy } from '@/types/strategy'

// 정책: 계좌당 최대 1개 전략 (운영 정책에 맞춰 조정 가능)
const MAX_STRATEGIES = 1

interface Props {
  accountId: string
  strategies: Strategy[]
}

export function StrategyList({ accountId, strategies }: Props) {
  const canAdd = strategies.length < MAX_STRATEGIES

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">전략</h3>
        <StrategyFormDialog accountId={accountId} disabled={!canAdd} />
      </div>

      {strategies.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            등록된 전략이 없습니다. 위의 전략 추가 버튼으로 전략을 등록하세요.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {strategies.map((s) => (
            <StrategyCard key={s.id} strategy={s} />
          ))}
        </div>
      )}
    </div>
  )
}
