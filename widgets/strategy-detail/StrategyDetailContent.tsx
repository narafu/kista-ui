'use client'

import Link from 'next/link'
import { useState } from 'react'

import { useAccountDetailQuery } from '@entities/account'
import { canWithdrawCapital, supportsCapitalAdjustment, useStrategyDetailQuery } from '@entities/strategy'
import { PageHeader } from '@widgets/page-header'
import { InjectCapitalForm } from '@features/strategy/inject-capital'
import { WithdrawCapitalForm } from '@features/strategy/withdraw-capital'
import { FormDialog } from '@shared/ui/FormDialog'
import { brokerCurrency } from '@shared/lib/api-schema'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@shared/lib/utils'
import type { Account } from '@entities/account'
import type { Strategy } from '@entities/strategy'
import { StrategyDetail } from './StrategyDetail'
import { DcaStrategyDetail } from './DcaStrategyDetail'

interface Props {
  accountId: string
  strategyId: string
  initialAccount: Account
  initialStrategy: Strategy
}

export function StrategyDetailContent({
  accountId,
  strategyId,
  initialAccount,
  initialStrategy,
}: Props) {
  const accountQuery = useAccountDetailQuery(accountId)
  const strategyQuery = useStrategyDetailQuery(accountId, strategyId)
  const account = accountQuery.data === undefined ? initialAccount : accountQuery.data
  const strategy = strategyQuery.data === undefined ? initialStrategy : strategyQuery.data

  const [capitalDialog, setCapitalDialog] = useState<'inject' | 'withdraw' | null>(null)

  if (!account || !strategy) return null

  const currency = brokerCurrency(account.broker)
  const ghostSm = cn(buttonVariants({ variant: 'ghost', size: 'sm' }))

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
            {supportsCapitalAdjustment(strategy) && (
              <>
                <button type="button" className={ghostSm} onClick={() => setCapitalDialog('inject')}>
                  투자금 추가
                </button>
                {canWithdrawCapital(strategy) && (
                  <button type="button" className={ghostSm} onClick={() => setCapitalDialog('withdraw')}>
                    투자금 인출
                  </button>
                )}
              </>
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

      {strategy.type === 'DCA'
        ? <DcaStrategyDetail accountId={accountId} broker={account.broker} strategy={strategy} />
        : <StrategyDetail accountId={accountId} broker={account.broker} strategy={strategy} />}

      <FormDialog
        open={capitalDialog === 'inject'}
        onOpenChange={(open) => setCapitalDialog(open ? 'inject' : null)}
        title="투자금 추가"
        description="진행 중인 사이클에 예수금을 추가"
      >
        {(close) => <InjectCapitalForm accountId={accountId} strategy={strategy} currency={currency} onDone={close} />}
      </FormDialog>
      <FormDialog
        open={capitalDialog === 'withdraw'}
        onOpenChange={(open) => setCapitalDialog(open ? 'withdraw' : null)}
        title="투자금 인출"
        description="진행 중인 사이클에서 예수금을 인출"
      >
        {(close) => <WithdrawCapitalForm accountId={accountId} strategy={strategy} currency={currency} onDone={close} />}
      </FormDialog>
    </div>
  )
}
