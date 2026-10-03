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
      {/* 서버가 365일 미만 구간은 연환산 왜곡을 피하려 null로 준다 */}
      <KpiCard label="CAGR" value={fmtSignedPercent(summary.cagr)} sub={summary.cagr == null ? '1년 미만 구간은 미표시' : undefined} />
      <KpiCard label="MDD" value={fmtSignedPercent(summary.mdd)} />
      <KpiCard label="체결 건수" value={`${summary.tradeCount}건`} />
      <KpiCard label="사이클 수" value={`${summary.cycleCount}회`} />
    </div>
  )
}
