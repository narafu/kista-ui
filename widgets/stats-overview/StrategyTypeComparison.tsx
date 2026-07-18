import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TableHeadCell } from '@shared/ui/TableHeadCell'
import { Badge } from '@shared/ui/Badge'
import { EmptyState } from '@shared/ui/EmptyState'
import { fmtSignedUsd, pnlTextClass } from '@shared/lib/format'
import { cn } from '@shared/lib/utils'
import type { StrategyTypeStats } from '@entities/stats'

interface Props {
  byType: StrategyTypeStats[]
}

export function StrategyTypeComparison({ byType }: Props) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base lg:text-lg">전략 유형 비교</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {byType.length === 0 ? (
          <EmptyState variant="text" message="비교할 전략 데이터가 없습니다." />
        ) : (
          <>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm lg:text-base">
                <thead className="bg-muted/50">
                  <tr>
                    <TableHeadCell className="text-left">전략</TableHeadCell>
                    <TableHeadCell className="text-right">사이클</TableHeadCell>
                    <TableHeadCell className="text-right">평균 수익률</TableHeadCell>
                    <TableHeadCell className="text-right">평균 소요일</TableHeadCell>
                    <TableHeadCell className="text-right">실현손익</TableHeadCell>
                    <TableHeadCell className="text-right">미실현</TableHeadCell>
                  </tr>
                </thead>
                <tbody>
                  {byType.map((t) => (
                    <tr key={t.type} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Badge tone="brand" size="md">
                          {t.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        종료 {t.closedCycleCount} · 진행 {t.activeCycleCount}
                      </td>
                      <td className={cn('px-4 py-3 text-right tabular-nums', t.avgReturnRate != null && pnlTextClass(t.avgReturnRate))}>
                        {t.avgReturnRate != null ? `${t.avgReturnRate >= 0 ? '+' : ''}${(t.avgReturnRate * 100).toFixed(1)}%` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{t.avgDurationDays != null ? `${t.avgDurationDays.toFixed(1)}일` : '—'}</td>
                      <td className={cn('px-4 py-3 text-right tabular-nums font-medium', pnlTextClass(t.realizedPnl))}>{fmtSignedUsd(t.realizedPnl, 2, '$')}</td>
                      <td className={cn('px-4 py-3 text-right tabular-nums font-medium', pnlTextClass(t.unrealizedPnl))}>{fmtSignedUsd(t.unrealizedPnl, 2, '$')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y sm:hidden" role="list" aria-label="전략 유형 비교 모바일">
              {byType.map((item) => (
                <section key={item.type} className="px-4 py-4" role="listitem">
                  <Badge tone="brand" size="md">
                    {item.type}
                  </Badge>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">사이클</dt>
                      <dd className="mt-0.5 tabular-nums">
                        종료 {item.closedCycleCount} · 진행 {item.activeCycleCount}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">평균 수익률</dt>
                      <dd className={cn('mt-0.5 tabular-nums', item.avgReturnRate != null && pnlTextClass(item.avgReturnRate))}>
                        {item.avgReturnRate != null ? `${item.avgReturnRate >= 0 ? '+' : ''}${(item.avgReturnRate * 100).toFixed(1)}%` : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">평균 소요일</dt>
                      <dd className="mt-0.5 tabular-nums">{item.avgDurationDays != null ? `${item.avgDurationDays.toFixed(1)}일` : '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">실현손익</dt>
                      <dd className={cn('mt-0.5 font-medium tabular-nums', pnlTextClass(item.realizedPnl))}>{fmtSignedUsd(item.realizedPnl, 2, '$')}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">미실현</dt>
                      <dd className={cn('mt-0.5 font-medium tabular-nums', pnlTextClass(item.unrealizedPnl))}>{fmtSignedUsd(item.unrealizedPnl, 2, '$')}</dd>
                    </div>
                  </dl>
                </section>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
