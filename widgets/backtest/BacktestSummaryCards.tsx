import { KpiCard } from '@widgets/kpi-card'
import { fmtUsd, fmtSignedPercent, pnlTextClass } from '@shared/lib/format'
import { cn } from '@shared/lib/utils'
import type { BacktestSummary } from '@entities/backtest'

interface Props {
  /** 없으면 실행 중 스켈레톤으로 그린다 */
  summary?: BacktestSummary
}

// 모바일 2열에서 큰 금액이 카드 밖으로 넘치지 않게 성과 탭(StatsKpiRow)과 같은 크기·줄바꿈 규칙을 쓴다
const CARD_CLASS = 'min-w-0'
const VALUE_CLASS = 'break-words text-xl sm:text-2xl lg:text-3xl'

export function BacktestSummaryCards({ summary }: Props) {
  const card = (label: string, value: string | undefined, valueClassName?: string, sub?: string) => (
    <KpiCard
      label={label}
      value={value}
      sub={sub}
      skeleton={!summary}
      className={CARD_CLASS}
      valueClassName={cn(VALUE_CLASS, valueClassName)}
    />
  )
  const cagr = summary?.cagr

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {card('최종 자산', summary && `$${fmtUsd(summary.finalAsset)}`)}
      {card('누적 수익률', summary && fmtSignedPercent(summary.totalReturnRate), summary && pnlTextClass(summary.totalReturnRate))}
      {/* 서버가 365일 미만 구간은 연환산 왜곡을 피하려 null로 준다 */}
      {card('연평균 수익률', summary && fmtSignedPercent(cagr), cagr != null ? pnlTextClass(cagr) : undefined, summary && cagr == null ? '1년 미만 구간은 미표시' : undefined)}
      {/* 낙폭은 항상 0 이하라 손익색을 칠하지 않는다 */}
      {card('최대 낙폭', summary && fmtSignedPercent(summary.mdd))}
      {card('체결 건수', summary && `${summary.tradeCount}건`)}
      {card('사이클 수', summary && `${summary.cycleCount}회`)}
    </div>
  )
}
