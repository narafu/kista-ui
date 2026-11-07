'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMeta } from '@entities/meta'
import type { Account } from '@entities/account'
import type { Strategy } from '@entities/strategy'
import { DeleteStrategyDialog, useManageStrategyMutations } from '@features/strategy/manage-strategy'
import { Badge } from '@shared/ui/Badge'

interface Props {
  strategies: Strategy[]
  accountsById: Map<string, Account>
}

interface RowProps {
  strategy: Strategy
  account?: Account
  open: boolean
  onOpenChange: (open: boolean) => void
  onRemove: (strategy: Strategy) => void
  isDeleting: boolean
}

function ArchivedRow({ strategy, account, open, onOpenChange, onRemove, isDeleting }: RowProps) {
  const { labelOf } = useMeta()
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
        {account && <Badge tone="neutral" size="sm">{account.nickname}</Badge>}
        <Badge tone="brand" size="sm">{labelOf('strategyTypes', strategy.type)}</Badge>
        <span className="font-medium">{strategy.ticker}</span>
      </div>
      <div className="flex w-20 shrink-0">
        <DeleteStrategyDialog
          open={open}
          onOpenChange={onOpenChange}
          ticker={strategy.ticker}
          broker={account?.broker}
          onConfirm={() => onRemove(strategy)}
          disabled={isDeleting}
          isDeleting={isDeleting}
          isArchived
          triggerAriaLabel={`${strategy.ticker} 보관 전략 삭제`}
        />
      </div>
    </li>
  )
}

// 보관된 전략이 없으면 섹션 자체를 그리지 않는다
export function ArchivedStrategies({ strategies, accountsById }: Props) {
  // 훅 묶음은 행마다 만들지 않고 섹션에서 한 번만 — 열린 다이얼로그는 행 id로 추적
  const [openId, setOpenId] = useState<string | null>(null)
  const { remove, isDeleting } = useManageStrategyMutations({ onDeleted: () => setOpenId(null) })
  if (strategies.length === 0) return null
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle role="heading" aria-level={2} className="text-base lg:text-lg">보관된 전략</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y border-t">
          {strategies.map((strategy) => (
            <ArchivedRow
              key={strategy.id}
              strategy={strategy}
              account={accountsById.get(strategy.accountId)}
              open={openId === strategy.id}
              onOpenChange={(next) => setOpenId(next ? strategy.id : null)}
              onRemove={remove}
              isDeleting={isDeleting}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
