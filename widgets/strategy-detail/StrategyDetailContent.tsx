'use client'

import Link from 'next/link'
import { useState } from 'react'

import { useAccountDetailQuery } from '@entities/account'
import { canWithdrawCapital, supportsCapitalAdjustment, useStrategyDetailQuery } from '@entities/strategy'
import { PageHeader } from '@widgets/page-header'
import { CapitalForm, type CapitalKind } from '@features/strategy/adjust-capital'
import { FormDialog } from '@shared/ui/FormDialog'
import { brokerCurrency } from '@shared/lib/api-schema'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import type { Account } from '@entities/account'
import type { Strategy } from '@entities/strategy'
import { StrategyDetail } from './StrategyDetail'
import { DcaStrategyDetail } from './DcaStrategyDetail'

const CAPITAL_DIALOG = {
  inject: { title: '투자금 추가', description: '진행 중인 사이클에 예수금을 추가합니다.' },
  withdraw: { title: '투자금 인출', description: '진행 중인 사이클에서 예수금을 인출합니다.' },
} as const

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

  // 닫히는 동안에도 제목·본문이 바뀌지 않게 마지막 종류를 남겨 둔다
  const [capital, setCapital] = useState<{ kind: CapitalKind; open: boolean }>({ kind: 'inject', open: false })

  if (!account || !strategy) return null

  const currency = brokerCurrency(account.broker)
  const ghostSm = buttonVariants({ variant: 'ghost', size: 'sm' })

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
                className={ghostSm}
              >
                VR 재설정
              </Link>
            )}
            {supportsCapitalAdjustment(strategy) && (
              <>
                <Button type="button" variant="ghost" size="sm" onClick={() => setCapital({ kind: 'inject', open: true })}>
                  투자금 추가
                </Button>
                {canWithdrawCapital(strategy) && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setCapital({ kind: 'withdraw', open: true })}>
                    투자금 인출
                  </Button>
                )}
              </>
            )}
            <Link
              href={`/accounts/${accountId}/strategies/${strategyId}/edit`}
              className={ghostSm}
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
        open={capital.open}
        onClose={() => setCapital((c) => ({ ...c, open: false }))}
        title={CAPITAL_DIALOG[capital.kind].title}
        description={CAPITAL_DIALOG[capital.kind].description}
      >
        {(close) => <CapitalForm key={capital.kind} kind={capital.kind} accountId={accountId} strategy={strategy} currency={currency} onDone={close} />}
      </FormDialog>
    </div>
  )
}
