'use client'

import { KpiCard } from '@widgets/kpi-card'
import { useAllStrategiesQuery } from '@entities/strategy'
import { useWeeklyTradeSummaryQuery } from '@entities/trade'

interface Props {
  accountIds: string[]
  brokerCount: number
  weekStartDate: string // 'YYYY-MM-DD', WeeklyMarketCalendar와 동일 쿼리 캐시 공유용
}

export function DashboardKpiRow({ accountIds, brokerCount, weekStartDate }: Props) {
  const { data: strategies = [], isLoading: strategiesLoading } = useAllStrategiesQuery()
  const activeCount = strategies.filter(s => s.status === 'ACTIVE').length

  // WeeklyMarketCalendar와 동일 파라미터(accountIds, weekStart)로 호출해 queryKey를 맞추고 캐시를 공유한다
  const weekStart = new Date(weekStartDate + 'T00:00:00')
  const { data: tradeSummary, isLoading: tradesLoading } = useWeeklyTradeSummaryQuery(accountIds, weekStart)

  let buyCount = 0
  let sellCount = 0
  if (tradeSummary) {
    for (const day of tradeSummary.values()) {
      buyCount += day.buyCount
      sellCount += day.sellCount
    }
  }
  const totalTrades = buyCount + sellCount

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
      <KpiCard
        label="계좌"
        value={accountIds.length}
        sub={`연결 증권사 ${brokerCount}곳`}
        variant="default"
        valueClassName="display text-3xl lg:text-4xl"
      />
      <KpiCard
        label="운영 전략"
        value={activeCount}
        sub={`전체 ${strategies.length}개 중`}
        variant="soft"
        skeleton={strategiesLoading}
        valueClassName="display text-3xl lg:text-4xl"
      />
      <KpiCard
        label="이번 주 체결"
        value={totalTrades}
        sub={`매수 ${buyCount} · 매도 ${sellCount}`}
        variant="default"
        className="col-span-2 lg:col-span-1"
        skeleton={tradesLoading}
        valueClassName="display text-3xl lg:text-4xl"
      />
    </div>
  )
}
