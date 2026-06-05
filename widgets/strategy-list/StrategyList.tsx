'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StrategyCard } from '@widgets/strategy-card'
import { StrategyFormDialog } from '@features/strategy/create-strategy'
import { useNextOrderPreviewQuery } from '@entities/order'
import type { Strategy } from '@entities/strategy'

const MAX_STRATEGIES = 1

interface Props {
  accountId: string
  strategies: Strategy[]
}

export function StrategyList({ accountId, strategies }: Props) {
  const canAdd = strategies.length < MAX_STRATEGIES
  const { data: preview } = useNextOrderPreviewQuery(accountId)
  const position = preview?.position ?? null

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">전략</CardTitle>
          {strategies.length > 0 ? (
            <StrategyFormDialog
              accountId={accountId}
              initial={strategies[0]}
              triggerLabel="전략 변경"
              triggerVariant="ghost"
              disabled={false}
            />
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6 flex-1 flex flex-col">
        {strategies.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <p className="text-sm text-muted-foreground text-center">
              등록된 전략이 없습니다.
            </p>
            <p className="text-xs text-muted-foreground text-center">
              계좌당 {MAX_STRATEGIES}개 전략을 설정할 수 있습니다.
            </p>
            {canAdd && <StrategyFormDialog accountId={accountId} disabled={false} />}
          </div>
        ) : (
          <div className="flex-1">
            {strategies.map((s) => (
              <StrategyCard key={s.id} strategy={s} position={position} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
