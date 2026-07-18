'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@shared/ui/Badge'
import { EmptyState } from '@shared/ui/EmptyState'
import { TableHeadCell } from '@shared/ui/TableHeadCell'
import { cn } from '@shared/lib/utils'
import { fmtDate, fmtSignedUsd, pnlTextClass } from '@shared/lib/format'
import { useStatsCyclesQuery } from '@entities/stats'
import type { StrategyTypeStats } from '@entities/stats'

interface Props {
  byType: StrategyTypeStats[]
}

export function CyclePerformanceList({ byType }: Props) {
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined)
  const { cycles, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useStatsCyclesQuery(typeFilter)

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base lg:text-lg">사이클 성과</CardTitle>
          <div className="-mx-1 flex max-w-full items-center gap-0.5 overflow-x-auto rounded-md border border-border p-0.5">
            <button
              type="button"
              aria-pressed={typeFilter === undefined}
              onClick={() => setTypeFilter(undefined)}
              className={cn(
                'min-h-9 shrink-0 rounded px-2 text-xs font-medium transition-colors',
                typeFilter === undefined ? 'bg-[var(--brand-fg-soft)] text-[var(--background)]' : 'text-muted-foreground hover:text-foreground hover:bg-accent',
              )}
            >
              전체
            </button>
            {byType.map((t) => (
              <button
                key={t.type}
                type="button"
                aria-pressed={typeFilter === t.type}
                title={t.type}
                onClick={() => setTypeFilter(t.type)}
                className={cn(
                  'min-h-9 shrink-0 rounded px-2 text-xs font-medium transition-colors',
                  typeFilter === t.type ? 'bg-[var(--brand-fg-soft)] text-[var(--background)]' : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                )}
              >
                {t.type}
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
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[720px] text-sm" aria-label="사이클 성과">
                <thead className="bg-muted/50">
                  <tr>
                    <TableHeadCell className="text-left">전략</TableHeadCell>
                    <TableHeadCell className="text-left">종목</TableHeadCell>
                    <TableHeadCell className="text-left">기간</TableHeadCell>
                    <TableHeadCell className="text-right">손익</TableHeadCell>
                    <TableHeadCell className="text-right">수익률</TableHeadCell>
                  </tr>
                </thead>
                <tbody>
                  {cycles.map((cycle) => (
                    <tr key={cycle.cycleId} className="border-t transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Badge tone="brand" size="sm">
                          {cycle.strategyType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-medium tabular-nums">{cycle.ticker ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {fmtDate(cycle.startDate)} ~ {cycle.endDate ? fmtDate(cycle.endDate) : '진행 중'}
                      </td>
                      <td className={cn('px-4 py-3 text-right tabular-nums', cycle.pnl != null ? pnlTextClass(cycle.pnl) : 'text-muted-foreground')}>
                        {cycle.pnl != null ? fmtSignedUsd(cycle.pnl, 2, '$') : '—'}
                      </td>
                      <td className={cn('px-4 py-3 text-right tabular-nums', cycle.returnRate != null ? pnlTextClass(cycle.returnRate) : 'text-muted-foreground')}>
                        {cycle.returnRate != null ? `${cycle.returnRate >= 0 ? '+' : ''}${(cycle.returnRate * 100).toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y sm:hidden" role="list" aria-label="사이클 성과 모바일">
              {cycles.map((cycle) => (
                <section key={cycle.cycleId} className="px-4 py-4" role="listitem">
                  <div className="flex items-center justify-between gap-3">
                    <Badge tone="brand" size="sm">
                      {cycle.strategyType}
                    </Badge>
                    <span className="text-sm font-semibold tabular-nums">
                      {cycle.ticker ?? '—'}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    {fmtDate(cycle.startDate)} ~ {cycle.endDate ? fmtDate(cycle.endDate) : '진행 중'}
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 border-t pt-3 text-right">
                    <div>
                      <dt className="text-xs text-muted-foreground">손익</dt>
                      <dd className={cn('mt-1 text-sm tabular-nums', cycle.pnl != null ? pnlTextClass(cycle.pnl) : 'text-muted-foreground')}>
                        {cycle.pnl != null ? fmtSignedUsd(cycle.pnl, 2, '$') : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">수익률</dt>
                      <dd className={cn('mt-1 text-sm tabular-nums', cycle.returnRate != null ? pnlTextClass(cycle.returnRate) : 'text-muted-foreground')}>
                        {cycle.returnRate != null ? `${cycle.returnRate >= 0 ? '+' : ''}${(cycle.returnRate * 100).toFixed(1)}%` : '—'}
                      </dd>
                    </div>
                  </dl>
                </section>
              ))}
            </div>
            {(hasNextPage || isFetchingNextPage) && (
              <div className="flex justify-center py-4 border-t">
                <button type="button" onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="px-4 py-2 text-sm font-medium text-rose-600 hover:text-rose-700 disabled:opacity-50">
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
