import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TableHeadCell } from '@shared/ui/TableHeadCell'
import { TableDataCell } from '@shared/ui/TableDataCell'
import { Badge } from '@shared/ui/Badge'
import { EmptyState } from '@shared/ui/EmptyState'
import { fmtSignedUsd, pnlTextClass, fmtSignedPercent } from '@shared/lib/format'
import { cn } from '@shared/lib/utils'
import type { StrategyTypeStats } from '@entities/stats'
import { useMeta } from '@entities/meta'

interface Props {
  byType: StrategyTypeStats[]
}

export function StrategyTypeComparison({ byType }: Props) {
  const { labelOf } = useMeta()
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle role="heading" aria-level={2} className="text-base lg:text-lg">전략 유형 비교</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {byType.length === 0 ? (
          <EmptyState variant="text" message="비교할 전략 데이터가 없습니다." />
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block" role="region" aria-label="전략 유형 비교 표" tabIndex={0}>
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <TableHeadCell>전략</TableHeadCell>
                    <TableHeadCell numeric>사이클</TableHeadCell>
                    <TableHeadCell numeric>평균 수익률</TableHeadCell>
                    <TableHeadCell numeric>평균 소요일</TableHeadCell>
                    <TableHeadCell numeric>실현손익</TableHeadCell>
                    <TableHeadCell numeric>미실현</TableHeadCell>
                  </tr>
                </thead>
                <tbody>
                  {byType.map((t) => (
                    <tr key={t.type} className="border-t hover:bg-muted/30 transition-colors">
                      <TableDataCell>
                        <Badge tone="brand" size="md">
                          {labelOf('strategyTypes', t.type)}
                        </Badge>
                      </TableDataCell>
                      <TableDataCell className="text-right tabular-nums whitespace-nowrap text-muted-foreground">
                        종료 {t.closedCycleCount} · 진행 {t.activeCycleCount}
                      </TableDataCell>
                      <TableDataCell className={cn('text-right tabular-nums whitespace-nowrap', t.avgReturnRate != null && pnlTextClass(t.avgReturnRate))}>
                        {fmtSignedPercent(t.avgReturnRate)}
                      </TableDataCell>
                      <TableDataCell className="text-right tabular-nums whitespace-nowrap">{t.avgDurationDays != null ? `${t.avgDurationDays.toFixed(1)}일` : '—'}</TableDataCell>
                      <TableDataCell className={cn('text-right tabular-nums whitespace-nowrap font-medium', pnlTextClass(t.realizedPnl))}>{fmtSignedUsd(t.realizedPnl, 2, '$')}</TableDataCell>
                      <TableDataCell className={cn('text-right tabular-nums whitespace-nowrap font-medium', pnlTextClass(t.unrealizedPnl))}>{fmtSignedUsd(t.unrealizedPnl, 2, '$')}</TableDataCell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y lg:hidden list-none p-0 m-0" aria-label="전략 유형 비교">
              {byType.map((item) => (
                <li key={item.type} className="px-4 py-4">
                  <Badge tone="brand" size="md">
                    {labelOf('strategyTypes', item.type)}
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
                        {fmtSignedPercent(item.avgReturnRate)}
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
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  )
}
