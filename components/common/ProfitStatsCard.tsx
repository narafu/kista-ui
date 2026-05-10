'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PortfolioChart } from './PortfolioChart'
import { createClient } from '@/lib/supabase/client'
import { getAccountProfit, getPortfolioSnapshots } from '@/lib/api/trades'
import type { ProfitSummary, PortfolioSnapshot } from '@/types/trade'

type Period = 7 | 30 | 90

interface Props {
  accountId: string
}

function getDateRange(days: Period): { from: string; to: string } {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)
  return {
    from: start.toISOString().split('T')[0],
    to: end.toISOString().split('T')[0],
  }
}

export function ProfitStatsCard({ accountId }: Props) {
  const [period, setPeriod] = useState<Period>(30)
  const [profit, setProfit] = useState<ProfitSummary | null>(null)
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const dateRange = getDateRange(period)
        const [profitData, snapshotData] = await Promise.all([
          getAccountProfit(accountId, dateRange, session.access_token).catch(() => null),
          getPortfolioSnapshots({ startDate: dateRange.from, endDate: dateRange.to }, session.access_token).catch((): PortfolioSnapshot[] => []),
        ])

        if (!cancelled) {
          setProfit(profitData)
          setSnapshots(snapshotData)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [accountId, period])

  return (
    <Card className="min-h-[240px]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">수익/손실 통계</CardTitle>
          <div className="flex gap-1">
            {([7, 30, 90] as Period[]).map((p) => (
              <Button
                key={p}
                variant={period === p ? 'default' : 'outline'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setPeriod(p)}
              >
                {p}일
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-[160px] text-sm text-muted-foreground">
            로딩 중...
          </div>
        ) : (
          <>
            {/* 손익 요약 */}
            {profit && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">기간 손익</p>
                  <p className={`text-lg font-bold ${profit.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {profit.totalProfitLoss >= 0 ? '+' : ''}${profit.totalProfitLoss.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">수익률</p>
                  <p className={`text-lg font-bold ${profit.totalProfitLossRate >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {profit.totalProfitLossRate >= 0 ? '+' : ''}{profit.totalProfitLossRate.toFixed(2)}%
                  </p>
                </div>
              </div>
            )}
            {/* 포트폴리오 추이 차트 */}
            <PortfolioChart snapshots={snapshots} />
          </>
        )}
      </CardContent>
    </Card>
  )
}
