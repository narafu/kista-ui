import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { StatusDot } from '@widgets/status-dot'
import { fmtUsd } from '@shared/lib/format'
import type { Strategy } from '@entities/strategy'

interface Props {
  accountId: string
  strategy: Strategy
  accountLabel?: string
}

export function StrategyCard({ accountId, strategy, accountLabel }: Props) {
  return (
    <Link
      href={`/accounts/${accountId}/strategies/${strategy.id}`}
      className="group flex items-center gap-3 rounded-[var(--r-lg)] border border-border bg-card px-4 py-3 shadow-[var(--sh-card)] hover:border-rose-300 hover:shadow-[var(--sh-rose)] transition-all"
    >
      <span className="inline-flex items-center px-2.5 h-[22px] rounded-full text-[11px] font-semibold whitespace-nowrap bg-rose-50 text-rose-600">
        {strategy.type}
      </span>
      <StatusDot status={(strategy.status as 'ACTIVE' | 'PAUSED') ?? 'UNKNOWN'} hideLabel />
      <span className="font-semibold text-sm text-foreground">{strategy.ticker}</span>
      {accountLabel && (
        <span className="text-[11px] text-muted-foreground">{accountLabel}</span>
      )}
      <span className="ml-auto text-sm font-medium text-foreground">
        {strategy.initialUsdDeposit != null ? (
          `$${fmtUsd(strategy.initialUsdDeposit)}`
        ) : (
          <span className="text-muted-foreground font-normal">미설정</span>
        )}
      </span>
      <ChevronRight className="size-4 text-muted-foreground group-hover:text-rose-500 transition-colors shrink-0" />
    </Link>
  )
}
