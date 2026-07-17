'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@shared/ui/Badge'
import { EmptyState } from '@shared/ui/EmptyState'
import { cn } from '@shared/lib/utils'
import { fmtDate, fmtSignedUsd, pnlTextClass } from '@shared/lib/format'
import { useStatsCyclesQuery } from '@entities/stats'
import type { StrategyTypeStats } from '@entities/stats'
import { strategyTypeShort } from '@entities/strategy'

interface Props {
  byType: StrategyTypeStats[]
}

export function CyclePerformanceList({ byType }: Props) {
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined)
  const { cycles, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useStatsCyclesQuery(typeFilter)

  const typeLabel = (type: string) => byType.find((t) => t.type === type)?.typeDescription ?? type

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base lg:text-lg">사이클 성과</CardTitle>
          <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5 flex-wrap">
            <button
              type="button"
              onClick={() => setTypeFilter(undefined)}
              className={cn(
                'text-xs px-2 py-1 rounded font-medium transition-colors',
                typeFilter === undefined
                  ? 'bg-[var(--brand-fg-soft)] text-[var(--background)]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent',
              )}
            >
              전체
            </button>
            {byType.map((t) => (
              <button
                key={t.type}
                type="button"
                title={t.typeDescription}
                onClick={() => setTypeFilter(t.type)}
                className={cn(
                  'text-xs px-2 py-1 rounded font-medium transition-colors',
                  typeFilter === t.type
                    ? 'bg-[var(--brand-fg-soft)] text-[var(--background)]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                )}
              >
                {strategyTypeShort(t.type)}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">불러오는 중…</div>
        ) : cycles.length === 0 ? (
          <EmptyState variant="text" message="사이클 내역이 없습니다." />
        ) : (
          <div>
            {cycles.map((cycle) => (
              <div key={cycle.cycleId} className="flex items-center gap-3 px-4 py-3 border-t first:border-t-0 flex-wrap">
                <Badge tone="brand" size="sm" className="shrink-0">{typeLabel(cycle.strategyType)}</Badge>
                <span className="text-sm font-medium tabular-nums w-16 shrink-0">{cycle.ticker ?? '—'}</span>
                <span className="text-xs text-muted-foreground flex-1 min-w-[160px] flex items-center gap-1.5">
                  {fmtDate(cycle.startDate)} ~ {cycle.endDate ? fmtDate(cycle.endDate) : '진행 중'}
                  {!cycle.closed && <Badge tone="neutral" size="sm">진행 중</Badge>}
                </span>
                <span
                  className={cn(
                    'text-sm tabular-nums w-24 text-right shrink-0',
                    cycle.pnl != null ? pnlTextClass(cycle.pnl) : 'text-muted-foreground',
                  )}
                >
                  {cycle.pnl != null ? fmtSignedUsd(cycle.pnl, 2, '$') : '—'}
                </span>
                <span
                  className={cn(
                    'text-sm tabular-nums w-16 text-right shrink-0',
                    cycle.returnRate != null ? pnlTextClass(cycle.returnRate) : 'text-muted-foreground',
                  )}
                >
                  {cycle.returnRate != null ? `${cycle.returnRate >= 0 ? '+' : ''}${(cycle.returnRate * 100).toFixed(1)}%` : '—'}
                </span>
                <span className="text-xs text-muted-foreground w-12 text-right shrink-0">
                  {cycle.durationDays != null ? `${cycle.durationDays}일` : '—'}
                </span>
              </div>
            ))}
            {(hasNextPage || isFetchingNextPage) && (
              <div className="flex justify-center py-4 border-t">
                <button
                  type="button"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="px-4 py-2 text-sm font-medium text-rose-600 hover:text-rose-700 disabled:opacity-50"
                >
                  {isFetchingNextPage ? '불러오는 중…' : '더 보기'}
                </button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
