'use client'

import Link from 'next/link'
import { TrendingUp, ChevronRight } from 'lucide-react'
import { StrategyCard } from '@widgets/strategy-card'
import { NewAccountButton } from '@features/account/create-account'
import { useAllStrategiesQuery } from '@entities/strategy'
import { useAccountsQuery } from '@entities/account'
import { useMeta } from '@entities/meta'
import type { Account } from '@entities/account'
import type { NextOrderPreview } from '@entities/order'
import { EmptyState } from '@shared/ui/EmptyState'

interface Props {
  previewsByStrategyId?: Record<string, NextOrderPreview>
}

function StrategiesEmptyState({ accounts }: { accounts: Account[] }) {
  const hasAccounts = accounts.length > 0

  return (
    <EmptyState
      icon={<TrendingUp className="size-7 text-muted-foreground" />}
      title="등록된 전략이 없습니다"
      message={hasAccounts ? '계좌 상세 페이지에서 전략을 추가할 수 있습니다.' : '계좌를 먼저 등록한 후 전략을 추가해 주세요.'}
      action={
        hasAccounts ? (
          <div className="flex flex-col gap-2 w-full max-w-xs">
            {accounts.slice(0, 3).map((account) => (
              <Link
                key={account.id}
                href={`/accounts/${account.id}`}
                className="flex items-center justify-between px-4 py-2.5 rounded-[var(--r-md)] border border-border bg-card hover:border-rose-300 hover:shadow-[var(--sh-rose)] transition-all text-sm"
              >
                <span className="font-medium text-foreground">{account.nickname}</span>
                <span className="flex items-center gap-1 text-muted-foreground text-sm">
                  <ChevronRight className="size-3.5" />
                </span>
              </Link>
            ))}
            {accounts.length > 3 && (
              <Link
                href="/accounts"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                계좌 {accounts.length - 3}개 더 보기
              </Link>
            )}
          </div>
        ) : (
          <NewAccountButton>계좌 등록하기</NewAccountButton>
        )
      }
    />
  )
}

export function AllStrategiesList({ previewsByStrategyId }: Props) {
  const { data: strategies = [] } = useAllStrategiesQuery()
  const { data: accounts = [] } = useAccountsQuery()
  const { findBroker } = useMeta()

  if (strategies.length === 0)
    return <StrategiesEmptyState accounts={accounts} />

  const groupByAccount = accounts.length > 1

  // 계좌 등록 순서를 유지한 채 계좌별 전략을 그룹핑 — 전략이 없는 계좌는 섹션 생략
  const groups = accounts
    .map((account) => ({
      account,
      strategies: strategies.filter((s) => s.accountId === account.id),
    }))
    .filter((g) => g.strategies.length > 0)

  // NOTE: 초대제 SaaS 규모상 전략 5개 수준 — 100+ 전략 시 페이지네이션 재검토
  return (
    <div className="space-y-6 reveal-stagger">
      {groups.map(({ account, strategies: accountStrategies }) => (
        <div key={account.id}>
          {groupByAccount && (
            <div className="flex items-center gap-2 mb-2.5">
              <span
                className="inline-flex items-center px-2 h-[19px] rounded-sm text-xs font-semibold shrink-0 bg-accent text-accent-foreground"
              >
                {findBroker(account.broker)?.label ?? account.broker}
              </span>
              <h2 className="text-sm font-semibold text-foreground">{account.nickname}</h2>
            </div>
          )}
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-4 lg:gap-3">
            {accountStrategies.map((s) => (
              <StrategyCard
                key={s.id}
                accountId={s.accountId}
                strategy={s}
                accountLabel={groupByAccount ? undefined : account.nickname}
                initialPreview={previewsByStrategyId?.[s.id]}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
