import { KpiCard } from '@widgets/kpi-card'
import { fmtMoney, fmtSignedMoney, pnlTextClass, roundMoney } from '@shared/lib/format'
import type { Currency } from '@shared/lib/api-schema'
import { cn } from '@shared/lib/utils'
import type { StatsSummary } from '@entities/stats'

interface Props {
  summary: StatsSummary
  currency: Currency
}

export function StatsKpiRow({ summary, currency }: Props) {
  const activeCount = summary.byType.reduce((sum, t) => sum + t.activeCycleCount, 0)

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
      <KpiCard
        label="실현손익"
        value={fmtSignedMoney(summary.totalRealizedPnl, currency)}
        sub="매도 확정분 · 진행 중 매도 포함 (VR 승계 보유분은 매도 전 미실현)"
        className="min-w-0 p-4 sm:p-5"
        valueClassName={cn('break-words text-xl sm:text-2xl lg:text-3xl', pnlTextClass(roundMoney(summary.totalRealizedPnl, currency)))}
      />
      <KpiCard
        label="미실현 평가손익"
        value={fmtSignedMoney(summary.totalUnrealizedPnl, currency)}
        sub={`진행 중 사이클 ${activeCount}개`}
        className="min-w-0 p-4 sm:p-5"
        valueClassName={cn('break-words text-xl sm:text-2xl lg:text-3xl', pnlTextClass(roundMoney(summary.totalUnrealizedPnl, currency)))}
      />
      <KpiCard
        label="운용 원금"
        value={fmtMoney(summary.activePrincipal, currency)}
        sub="진행 중 사이클 개장 시가 평가 + 추가·인출"
        className="col-span-2 min-w-0 p-4 sm:col-span-1 sm:p-5"
        valueClassName="break-words text-xl sm:text-2xl lg:text-3xl"
      />
    </div>
  )
}
