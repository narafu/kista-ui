'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StrategyCard } from '@widgets/strategy-card'
import { StrategyFormDialog } from '@features/strategy/create-strategy'
import { useNextOrderPreviewQuery } from '@entities/order'
import type { Strategy } from '@entities/strategy'

interface Props {
  accountId: string
  strategies: Strategy[]
}

export function StrategyList({ accountId, strategies }: Props) {
  const { data: preview, isLoading: isLoadingPosition } = useNextOrderPreviewQuery(accountId)
  const position = preview?.position ?? null

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">전략</CardTitle>
          <StrategyFormDialog accountId={accountId} disabled={false} />
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6 flex-1 flex flex-col">
        {strategies.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <p className="text-sm text-muted-foreground text-center">
              등록된 전략이 없습니다.
            </p>
            <p className="text-xs text-muted-foreground text-center">
              종목당 1개씩, 여러 전략을 추가할 수 있습니다.
            </p>
            <StrategyFormDialog accountId={accountId} disabled={false} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-4">
            {strategies.map((s) => (
              <StrategyCard
                key={s.id}
                accountId={accountId}
                strategy={s}
                position={position?.ticker === s.ticker ? position : null}
                isLoadingPosition={isLoadingPosition}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
