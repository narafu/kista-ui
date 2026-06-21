'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { StatusDot } from '@widgets/status-dot'
import { fmtUsd } from '@shared/lib/format'
import { useMeta } from '@entities/meta'
import type { Strategy } from '@entities/strategy'

interface Props {
  accountId: string
  strategy: Strategy
  accountLabel?: string
}

const STATUS_ACCENT: Record<string, string> = {
  ACTIVE: 'var(--status-ok)',
  PAUSED: 'var(--warn)',
}

export function StrategyCard({ accountId, strategy, accountLabel }: Props) {
  const { findStrategyType } = useMeta()
  const isInfinite = (findStrategyType(strategy.type)?.availableTickers?.length ?? 0) > 1

  return (
    <Link
      href={`/accounts/${accountId}/strategies/${strategy.id}`}
      className="group relative block rounded-[var(--r-lg)] border border-border bg-card shadow-[var(--sh-card)] hover:border-rose-300 hover:shadow-[var(--sh-rose)] transition-all overflow-hidden"
    >
      {/* 상태 액센트 스트립 */}
      <span
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: STATUS_ACCENT[strategy.status] ?? 'var(--border)' }}
      />

      {/* 모바일: 컴팩트 행 */}
      <div className="flex items-center gap-3 pl-5 pr-4 py-3 lg:hidden">
        <span
          className="inline-flex items-center px-2.5 h-[22px] rounded-full text-[11px] font-semibold whitespace-nowrap"
          style={{ background: 'var(--rose-50)', color: 'var(--rose-600)' }}
        >
          {strategy.type}
        </span>
        <StatusDot status={(strategy.status as 'ACTIVE' | 'PAUSED') ?? 'UNKNOWN'} hideLabel />
        <span className="font-bold text-sm text-foreground">{strategy.ticker}</span>
        {accountLabel && (
          <span className="text-[11px] text-muted-foreground">{accountLabel}</span>
        )}
        <span className="ml-auto text-sm font-semibold text-foreground">
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
        <div className="pl-5 pr-4 pt-4 pb-3">
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            <span
              className="inline-flex items-center px-2.5 h-[22px] rounded-full text-[11px] font-semibold whitespace-nowrap"
              style={{ background: 'var(--rose-50)', color: 'var(--rose-600)' }}
            >
              {strategy.type}
            </span>
            {isInfinite && (
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
          <div className="flex items-center justify-between">
            <div className="flex items-end gap-2">
              <span className="font-bold text-xl tracking-tight text-foreground leading-none">
                {strategy.ticker}
              </span>
              {accountLabel && (
                <span className="text-[11px] text-muted-foreground pb-0.5">{accountLabel}</span>
              )}
            </div>
            <StatusDot status={(strategy.status as 'ACTIVE' | 'PAUSED') ?? 'UNKNOWN'} />
          </div>
        </div>
        <div className="flex items-center justify-between pl-5 pr-4 py-2.5 border-t border-border bg-muted/30">
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
