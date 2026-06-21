'use client'

import Link from 'next/link'
import { TrendingUp, ChevronRight } from 'lucide-react'
import { StrategyCard } from '@widgets/strategy-card'
import type { Strategy } from '@entities/strategy'
import type { Account } from '@entities/account'

interface Props {
  strategies: Strategy[]
  accounts: Account[]
}

function EmptyState({ accounts }: { accounts: Account[] }) {
  const hasAccounts = accounts.length > 0

  return (
    <div className="flex flex-col items-center gap-5 py-16 text-center">
      <div className="rounded-full bg-muted p-4">
        <TrendingUp className="size-7 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-semibold text-foreground">등록된 전략이 없습니다</p>
        <p className="text-sm text-muted-foreground">
          {hasAccounts
            ? '계좌 상세 페이지에서 전략을 추가할 수 있습니다.'
            : '계좌를 먼저 등록한 후 전략을 추가해 주세요.'}
        </p>
      </div>
      {hasAccounts ? (
        <div className="flex flex-col gap-2 w-full max-w-xs">
          {accounts.slice(0, 3).map((account) => (
            <Link
              key={account.id}
              href={`/accounts/${account.id}`}
              className="flex items-center justify-between px-4 py-2.5 rounded-[var(--r-md)] border border-border bg-card hover:border-rose-300 hover:shadow-[var(--sh-rose)] transition-all text-sm"
            >
              <span className="font-medium text-foreground">{account.nickname}</span>
              <span className="flex items-center gap-1 text-muted-foreground text-[12px]">
                {account.accountNoMasked}
                <ChevronRight className="size-3.5" />
              </span>
            </Link>
          ))}
          {accounts.length > 3 && (
            <Link
              href="/accounts"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              계좌 {accounts.length - 3}개 더 보기
            </Link>
          )}
        </div>
      ) : (
        <Link
          href="/accounts"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--r-md)] text-sm font-medium transition-colors"
          style={{ background: 'var(--rose-50)', color: 'var(--rose-600)' }}
        >
          계좌 등록하러 가기
          <ChevronRight className="size-4" />
        </Link>
      )}
    </div>
  )
}

export function AllStrategiesList({ strategies, accounts }: Props) {
  if (strategies.length === 0)
    return <EmptyState accounts={accounts} />

  const accountMap = new Map(accounts.map((a) => [a.id, a.accountNoMasked]))

  return (
    <div className="grid grid-cols-1 gap-2 lg:grid-cols-3 lg:gap-3">
      {strategies.map((s) => (
        <StrategyCard
          key={s.id}
          accountId={s.accountId}
          strategy={s}
          accountLabel={accountMap.get(s.accountId)}
        />
      ))}
    </div>
  )
}
