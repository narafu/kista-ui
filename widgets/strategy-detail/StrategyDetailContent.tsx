'use client'

import Link from 'next/link'
import { useState, type ReactNode } from 'react'

import { useAccountDetailQuery } from '@entities/account'
import { useMeta } from '@entities/meta'
import { actionState, useStrategyDetailQuery } from '@entities/strategy'
import { PageHeader } from '@widgets/page-header'
import { CapitalForm, type CapitalKind } from '@features/strategy/adjust-capital'
import { FormDialog } from '@shared/ui/FormDialog'
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
  const { labelOf } = useMeta()
  const accountQuery = useAccountDetailQuery(accountId)
  const strategyQuery = useStrategyDetailQuery(accountId, strategyId)
  const account = accountQuery.data === undefined ? initialAccount : accountQuery.data
  const strategy = strategyQuery.data === undefined ? initialStrategy : strategyQuery.data

  // 닫히는 동안에도 제목·본문이 바뀌지 않게 마지막 종류를 남겨 둔다
  const [capital, setCapital] = useState<{ kind: CapitalKind; open: boolean }>({ kind: 'inject', open: false })

  if (!account || !strategy) return null

  const currency = 'USD'
  // 서버 판정(allowed/blocked/미지원)을 그대로 따른다 — blocked는 비활성 + 사유를 접근 가능한 설명으로 연결
  type ActionState = ReturnType<typeof actionState>
  const resetVr = actionState(strategy, 'RESET_VR')
  const inject = actionState(strategy, 'INJECT_CAPITAL')
  const withdraw = actionState(strategy, 'WITHDRAW_CAPITAL')
  // VR은 재설정 화면이 수정을 대신한다. DCA는 전용 행위 코드를 따르고, INFINITE·PRIVACY는 코드가 없어 보관 사유만 본다
  // (EDIT_SEED는 보유가 있으면 막히지만 수정 화면의 연속 사이클 설정은 바꿀 수 있다)
  const edit: ActionState = strategy.type === 'VR' ? { kind: 'hidden' }
    : strategy.type === 'DCA' ? actionState(strategy, 'EDIT_DCA_CONFIG')
    : strategy.blockedActions.some((b) => b.reasonCode === 'ARCHIVED') ? { kind: 'blocked', reasonCode: 'ARCHIVED' }
    : { kind: 'allowed' }
  // 같은 사유는 한 번만 보인다
  const blockedReasons = [...new Set([resetVr, inject, withdraw, edit].flatMap((s) => (s.kind === 'blocked' ? [s.reasonCode] : [])))]

  const actionButton = (state: ActionState, label: string, allowed: ReactNode) => {
    if (state.kind === 'hidden') return null
    if (state.kind === 'allowed') return allowed
    return <Button type="button" variant="ghost" size="sm" disabled focusableWhenDisabled aria-describedby={`blocked-reason-${state.reasonCode}`}>{label}</Button>
  }
  const capitalButton = (state: ActionState, kind: CapitalKind, label: string) =>
    actionButton(state, label,
      <Button type="button" variant="ghost" size="sm" onClick={() => setCapital({ kind, open: true })}>{label}</Button>)
  const linkButton = (state: ActionState, path: string, label: string) =>
    actionButton(state, label,
      <Link href={`/accounts/${accountId}/strategies/${strategyId}/${path}`} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>{label}</Link>)

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={account.nickname}
        eyebrowHref={`/accounts/${accountId}`}
        title={strategy.ticker}
        actions={
          <div className="flex flex-col gap-1 sm:items-end">
            <div className="flex flex-wrap items-center gap-2">
              {linkButton(resetVr, 'reconfigure-vr', 'VR 재설정')}
              {capitalButton(inject, 'inject', '투자금 추가')}
              {capitalButton(withdraw, 'withdraw', '투자금 인출')}
              {linkButton(edit, 'edit', '수정')}
            </div>
            {blockedReasons.length > 0 && (
              <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                {/* 시각 사용자에게도 사유를 보이되, aria-hidden으로 가려 aria-describedby 설명과 중복 낭독되지 않게 한다 */}
                {blockedReasons.map((code) => (
                  <span key={code} id={`blocked-reason-${code}`} aria-hidden="true">{labelOf('strategyActionBlockReasons', code)}</span>
                ))}
              </div>
            )}
          </div>
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
