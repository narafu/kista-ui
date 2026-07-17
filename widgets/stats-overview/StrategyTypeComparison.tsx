import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TableHeadCell } from '@shared/ui/TableHeadCell'
import { Badge } from '@shared/ui/Badge'
import { EmptyState } from '@shared/ui/EmptyState'
import { fmtSignedUsd, pnlTextClass } from '@shared/lib/format'
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm lg:text-base">
              <thead className="bg-muted/50">
                <tr>
                  <TableHeadCell className="text-left">전략</TableHeadCell>
                  <TableHeadCell className="text-right">사이클</TableHeadCell>
                  <TableHeadCell className="text-right">승률</TableHeadCell>
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
                      <Badge tone="brand" size="md">{t.typeDescription}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      종료 {t.closedCycleCount} · 진행 {t.activeCycleCount}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {t.winRate != null ? `${Math.round(t.winRate * 100)}%` : '—'}
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums ${t.avgReturnRate != null ? pnlTextClass(t.avgReturnRate) : ''}`}>
                      {t.avgReturnRate != null ? `${t.avgReturnRate >= 0 ? '+' : ''}${(t.avgReturnRate * 100).toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {t.avgDurationDays != null ? `${t.avgDurationDays.toFixed(1)}일` : '—'}
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums font-medium ${pnlTextClass(t.realizedPnl)}`}>
                      {fmtSignedUsd(t.realizedPnl, 2, '$')}
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums font-medium ${pnlTextClass(t.unrealizedPnl)}`}>
                      {fmtSignedUsd(t.unrealizedPnl, 2, '$')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
