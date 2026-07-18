import { KpiCard } from '@widgets/kpi-card'
import { fmtUsd, fmtSignedUsd, pnlTextClass } from '@shared/lib/format'
import { cn } from '@shared/lib/utils'
import type { StatsSummary } from '@entities/stats'

interface Props {
  summary: StatsSummary
}

export function StatsKpiRow({ summary }: Props) {
  const closedCount = summary.byType.reduce((sum, t) => sum + t.closedCycleCount, 0)
  const activeCount = summary.byType.reduce((sum, t) => sum + t.activeCycleCount, 0)

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
      <KpiCard
        label="총 실현손익"
        value={fmtSignedUsd(summary.totalRealizedPnl, 2, '$')}
        sub={`종료 사이클 ${closedCount}개 누적`}
        className="min-w-0 p-4 sm:p-5"
        valueClassName={cn('break-words text-xl sm:text-2xl lg:text-3xl', pnlTextClass(summary.totalRealizedPnl))}
      />
      <KpiCard
        label="미실현 평가손익"
        value={fmtSignedUsd(summary.totalUnrealizedPnl, 2, '$')}
        sub={`진행 중 사이클 ${activeCount}개`}
        className="min-w-0 p-4 sm:p-5"
        valueClassName={cn('break-words text-xl sm:text-2xl lg:text-3xl', pnlTextClass(summary.totalUnrealizedPnl))}
      />
      <KpiCard
        label="운용 원금"
        value={`$${fmtUsd(summary.activePrincipal)}`}
        sub="진행 중 사이클 시드 합"
        className="col-span-2 min-w-0 p-4 sm:col-span-1 sm:p-5"
        valueClassName="break-words text-xl sm:text-2xl lg:text-3xl"
      />
    </div>
  )
}
