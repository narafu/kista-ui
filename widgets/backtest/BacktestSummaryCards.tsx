import { KpiCard } from '@widgets/kpi-card'
import { fmtUsd, fmtSignedPercent } from '@shared/lib/format'
import type { BacktestSummary } from '@entities/backtest'

interface Props {
  summary: BacktestSummary
}

export function BacktestSummaryCards({ summary }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <KpiCard label="최종 자산" value={`$${fmtUsd(summary.finalAsset)}`} />
      <KpiCard label="누적 수익률" value={fmtSignedPercent(summary.totalReturnRate)} />
      <KpiCard label="CAGR" value={fmtSignedPercent(summary.cagr)} />
      <KpiCard label="MDD" value={fmtSignedPercent(summary.mdd)} />
      <KpiCard label="체결 건수" value={`${summary.tradeCount}건`} />
      <KpiCard label="사이클 수" value={`${summary.cycleCount}회`} />
    </div>
  )
}
