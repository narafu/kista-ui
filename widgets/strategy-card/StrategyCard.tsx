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
      className="group block rounded-[var(--r-lg)] border border-border bg-card shadow-[var(--sh-card)] hover:border-rose-300 hover:shadow-[var(--sh-rose)] transition-all"
    >
      {/* 모바일: 컴팩트 행 */}
      <div className="flex items-center gap-3 px-4 py-3 lg:hidden">
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
      </div>

      {/* PC: 카드 형태 */}
      <div className="hidden lg:flex flex-col">
        <div className="flex flex-wrap items-center gap-1.5 px-4 pt-4 pb-0">
          <span className="inline-flex items-center px-2.5 h-[22px] rounded-full text-[11px] font-semibold whitespace-nowrap bg-rose-50 text-rose-600">
            {strategy.type}
          </span>
          {strategy.type === 'INFINITE' && (
            <span className="inline-flex items-center px-2 h-[22px] rounded-full text-[11px] font-medium whitespace-nowrap bg-muted text-muted-foreground">
              {strategy.divisionCount}분할
            </span>
          )}
          {strategy.isReverseMode && (
            <span className="inline-flex items-center px-2 h-[22px] rounded-full text-[11px] font-semibold whitespace-nowrap bg-amber-50 text-amber-600">
              리버스
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 px-4 py-3">
          <StatusDot status={(strategy.status as 'ACTIVE' | 'PAUSED') ?? 'UNKNOWN'} />
          <span className="font-bold text-[15px] text-foreground">{strategy.ticker}</span>
          {accountLabel && (
            <span className="text-[11px] text-muted-foreground">{accountLabel}</span>
          )}
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <span className="text-[11px] text-muted-foreground">시작금액</span>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-foreground">
              {strategy.initialUsdDeposit != null ? (
                `$${fmtUsd(strategy.initialUsdDeposit)}`
              ) : (
                <span className="text-muted-foreground font-normal">미설정</span>
              )}
            </span>
            <ChevronRight className="size-4 text-muted-foreground group-hover:text-rose-500 transition-colors shrink-0" />
          </div>
        </div>
      </div>
    </Link>
  )
}
