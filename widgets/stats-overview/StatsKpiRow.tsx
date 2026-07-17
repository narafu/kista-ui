import { KpiCard } from '@widgets/kpi-card'
import { fmtUsd, pnlTextClass } from '@shared/lib/format'
import { excessReturnPp } from './lib/normalizeEquityCurve'
import type { NormalizedRow } from './lib/normalizeEquityCurve'
import type { BenchmarkSymbol, StatsSummary } from '@entities/stats'
import type { RangeKey } from './StatsOverview'

interface Props {
  summary: StatsSummary
  rows: NormalizedRow[]
  range: RangeKey
  benchmark: BenchmarkSymbol
}

const RANGE_LABEL: Record<RangeKey, string> = {
  '1M': '최근 1개월',
  '3M': '최근 3개월',
  '6M': '최근 6개월',
  '1Y': '최근 1년',
  ALL: '전체 기간',
}

function fmtSignedDollar(n: number): string {
  return n < 0 ? `-$${fmtUsd(Math.abs(n))}` : `+$${fmtUsd(n)}`
}

export function StatsKpiRow({ summary, rows, range, benchmark }: Props) {
  const closedCount = summary.byType.reduce((sum, t) => sum + t.closedCycleCount, 0)
  const activeCount = summary.byType.reduce((sum, t) => sum + t.activeCycleCount, 0)
  const excess = excessReturnPp(rows)

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        variant="accent"
        label="총 실현손익"
        value={fmtSignedDollar(summary.totalRealizedPnl)}
        sub={`종료 사이클 ${closedCount}개 누적`}
      />
      <KpiCard
        label="미실현 평가손익"
        value={fmtSignedDollar(summary.totalUnrealizedPnl)}
        valueClassName={pnlTextClass(summary.totalUnrealizedPnl)}
        sub={`진행 중 사이클 ${activeCount}개`}
      />
      <KpiCard
        label="운용 원금"
        value={`$${fmtUsd(summary.activePrincipal)}`}
        sub="진행 중 사이클 시드 합"
      />
      <KpiCard
        label="지수 대비 초과수익"
        value={excess != null ? `${excess >= 0 ? '+' : ''}${excess.toFixed(1)}%p` : '—'}
        valueClassName={excess != null ? pnlTextClass(excess) : undefined}
        sub={`${RANGE_LABEL[range]} · ${benchmark} 기준`}
      />
    </div>
  )
}
