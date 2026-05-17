'use client'

import Link from 'next/link'
import { StrategyBadge } from './StrategyBadge'
import { StatusDot } from './StatusDot'
import { ProfitDisplay } from './ProfitDisplay'
import type { Account } from '@/types/account'

interface Props {
  account: Account
}

export function AccountCard({ account }: Props) {
  return (
    <Link
      href={`/accounts/${account.id}`}
      className="group block rounded-[var(--r-lg)] border border-border bg-card p-5 shadow-[var(--sh-card)] hover:border-rose-300 hover:shadow-[var(--sh-rose)] transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-semibold text-base text-foreground leading-snug">{account.nickname}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{account.accountNoMasked}</p>
        </div>
        <StatusDot status={account.strategyStatus as 'ACTIVE' | 'PAUSED'} />
      </div>
      <div className="flex items-center gap-2 mb-3">
        <StrategyBadge strategy={account.strategyType} />
        <span className="text-xs text-muted-foreground">{account.ticker}</span>
      </div>
    </Link>
  )
}
