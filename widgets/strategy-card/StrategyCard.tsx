'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { StatusDot } from '@widgets/status-dot'
import { fmtUsd } from '@shared/lib/format'
import { useMeta } from '@entities/meta'
import type { Strategy } from '@entities/strategy'

interface Props {
  accountId: string
  strategy: Strategy
  accountLabel?: string | ReactNode
}

const STATUS_ACCENT: Record<string, string> = {
  ACTIVE: 'var(--status-ok)',
  PAUSED: 'var(--warn)',
}

const CYCLE_SEED_BADGE_CLS: Record<string, string> = {
  NONE:     'bg-muted text-muted-foreground',
  MAX:      'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400',
  MAINTAIN: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
}

export function StrategyCard({ accountId, strategy, accountLabel }: Props) {
  const { findStrategyType, labelOf } = useMeta()
  const isInfinite = (findStrategyType(strategy.type)?.availableTickers?.length ?? 0) > 1
  const seedLabel = labelOf('cycleSeedTypes', strategy.cycleSeedType)
  const seedBadgeCls = CYCLE_SEED_BADGE_CLS[strategy.cycleSeedType] ?? 'bg-muted text-muted-foreground'

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

      {/* 모바일: 2행 레이아웃 */}
      <div className="flex flex-col gap-1.5 pl-5 pr-4 py-3 lg:hidden">
        {/* 1행: 배지 + 계좌번호 */}
        <div className="flex items-center gap-1.5">
          <span
            className="inline-flex items-center px-2.5 h-[20px] rounded-full text-xs font-semibold whitespace-nowrap"
            style={{ background: 'var(--rose-50)', color: 'var(--rose-600)' }}
          >
            {strategy.type}
          </span>
          {isInfinite && (
            <span className="inline-flex items-center px-2 h-[20px] rounded-full text-xs font-semibold whitespace-nowrap bg-muted text-foreground">
              {strategy.divisionCount}분할
            </span>
          )}
          {accountLabel && (
            <span className="ml-auto text-xs font-semibold text-foreground/60 shrink-0 font-mono tracking-wider">{accountLabel}</span>
          )}
        </div>
        {/* 2행: 상태 + 티커 + 시드 + 금액 */}
        <div className="flex items-center gap-2">
          <StatusDot status={(strategy.status as 'ACTIVE' | 'PAUSED') ?? 'UNKNOWN'} hideLabel />
          <span className="font-bold text-base text-foreground">{strategy.ticker}</span>
          <span className={`inline-flex items-center px-2 h-[20px] rounded-full text-xs font-semibold whitespace-nowrap ${seedBadgeCls}`}>{seedLabel}</span>
          <span className="ml-auto text-sm font-semibold text-foreground">
            {strategy.initialUsdDeposit != null ? (
              `$${fmtUsd(strategy.initialUsdDeposit)}`
            ) : (
              <span className="text-muted-foreground font-normal">미설정</span>
            )}
          </span>
          <ChevronRight className="size-4 text-muted-foreground group-hover:text-[var(--brand-fg-soft)] transition-colors shrink-0" />
        </div>
      </div>

      {/* PC: 카드 형태 */}
      <div className="hidden lg:flex flex-col">
        <div className="pl-5 pr-4 pt-4 pb-3">
          {/* 배지 row + 계좌번호 우측 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className="inline-flex items-center px-2.5 h-[22px] rounded-full text-xs font-semibold whitespace-nowrap"
                style={{ background: 'var(--rose-50)', color: 'var(--rose-600)' }}
              >
                {strategy.type}
              </span>
              {isInfinite && (
                <span className="inline-flex items-center px-2 h-[22px] rounded-full text-xs font-semibold whitespace-nowrap bg-muted text-foreground">
                  {strategy.divisionCount}분할
                </span>
              )}
              {strategy.isReverseMode && (
                <span className="inline-flex items-center px-2 h-[22px] rounded-full text-xs font-semibold whitespace-nowrap bg-amber-50 text-amber-600">
                  리버스
                </span>
              )}
            </div>
            {accountLabel && (
              <span className="text-xs font-semibold text-foreground/60 shrink-0 ml-3 font-mono tracking-wider">{accountLabel}</span>
            )}
          </div>
          {/* 티커 + 상태 */}
          <div className="flex items-center justify-between">
            <span className="font-bold text-xl tracking-tight text-foreground leading-none">
              {strategy.ticker}
            </span>
            <StatusDot status={(strategy.status as 'ACTIVE' | 'PAUSED') ?? 'UNKNOWN'} />
          </div>
        </div>
        {/* 시드 정보 행 */}
        <div className="flex items-center justify-between pl-5 pr-4 py-2 border-t border-border">
          <span className="text-sm text-muted-foreground">다음 사이클</span>
          <span className={`inline-flex items-center px-2 h-[20px] rounded-full text-xs font-semibold whitespace-nowrap ${seedBadgeCls}`}>{seedLabel}</span>
        </div>
        {/* 시작금액 푸터 */}
        <div className="flex items-center justify-between pl-5 pr-4 py-2.5 border-t border-border bg-muted/30">
          <span className="text-sm text-muted-foreground">시작금액</span>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-foreground">
              {strategy.initialUsdDeposit != null ? (
                `$${fmtUsd(strategy.initialUsdDeposit)}`
              ) : (
                <span className="text-muted-foreground font-normal">미설정</span>
              )}
            </span>
            <ChevronRight className="size-4 text-muted-foreground group-hover:text-[var(--brand-fg-soft)] transition-colors shrink-0" />
          </div>
        </div>
      </div>
    </Link>
  )
}
