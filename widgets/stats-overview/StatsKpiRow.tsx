import { KpiCard } from '@widgets/kpi-card'
import { fmtUsd, fmtSignedUsd, pnlTextClass } from '@shared/lib/format'
import type { StatsSummary } from '@entities/stats'

interface Props {
  summary: StatsSummary
}

export function StatsKpiRow({ summary }: Props) {
  const closedCount = summary.byType.reduce((sum, t) => sum + t.closedCycleCount, 0)
  const activeCount = summary.byType.reduce((sum, t) => sum + t.activeCycleCount, 0)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <KpiCard
        label="총 실현손익"
        value={fmtSignedUsd(summary.totalRealizedPnl, 2, '$')}
        valueClassName={pnlTextClass(summary.totalRealizedPnl)}
        sub={`종료 사이클 ${closedCount}개 누적`}
      />
      <KpiCard
        label="미실현 평가손익"
        value={fmtSignedUsd(summary.totalUnrealizedPnl, 2, '$')}
        valueClassName={pnlTextClass(summary.totalUnrealizedPnl)}
        sub={`진행 중 사이클 ${activeCount}개`}
      />
      <KpiCard
        label="운용 원금"
        value={`$${fmtUsd(summary.activePrincipal)}`}
        sub="진행 중 사이클 시드 합"
      />
    </div>
  )
}
