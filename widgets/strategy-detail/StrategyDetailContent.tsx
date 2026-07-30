'use client'

import Link from 'next/link'

import { useAccountDetailQuery } from '@entities/account'
import { useStrategyDetailQuery } from '@entities/strategy'
import { PageHeader } from '@widgets/page-header'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@shared/lib/utils'
import type { Account } from '@entities/account'
import type { Strategy } from '@entities/strategy'
import type { NextOrderPreview } from '@entities/order'
import { StrategyDetail } from './StrategyDetail'

interface Props {
  accountId: string
  strategyId: string
  initialAccount: Account
  initialStrategy: Strategy
  initialPreview?: NextOrderPreview
}

export function StrategyDetailContent({
  accountId,
  strategyId,
  initialAccount,
  initialStrategy,
  initialPreview,
}: Props) {
  const accountQuery = useAccountDetailQuery(accountId)
  const strategyQuery = useStrategyDetailQuery(accountId, strategyId)
  const account = accountQuery.data === undefined ? initialAccount : accountQuery.data
  const strategy = strategyQuery.data === undefined ? initialStrategy : strategyQuery.data

  if (!account || !strategy) return null

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={account.nickname}
        eyebrowHref={`/accounts/${accountId}`}
        title={strategy.ticker}
        actions={
          <>
            {strategy.vr && (
              <Link
                href={`/accounts/${accountId}/strategies/${strategyId}/reconfigure-vr`}
                className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
              >
                VR 재설정
              </Link>
            )}
            <Link
              href={`/accounts/${accountId}/strategies/${strategyId}/edit`}
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
            >
              수정
            </Link>
          </>
        }
      />

      <StrategyDetail accountId={accountId} strategy={strategy} initialPreview={initialPreview} />
    </div>
  )
}
