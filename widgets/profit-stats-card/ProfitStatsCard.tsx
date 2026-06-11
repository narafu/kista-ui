'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PortfolioChart } from './PortfolioChart'
import { useProfitStatsQuery } from '@entities/trade'
import { fmtUsd, fmtPercent } from '@shared/lib/format'

type Period = 7 | 30 | 90

interface Props {
  accountId: string
}

export function ProfitStatsCard({ accountId }: Props) {
  const [period, setPeriod] = useState<Period>(30)
  const { profit, snapshots, isLoading } = useProfitStatsQuery(accountId, period)

  const totalPL = profit?.totalProfitLoss ?? profit?.totalRealizedProfit ?? 0
  const totalRate = profit?.totalProfitLossRate ?? profit?.totalReturnRate ?? 0
  const latestSnapshot = snapshots.length
    ? snapshots.reduce((a, b) => (a.createdAt > b.createdAt ? a : b))
    : null
  const realized = profit?.totalRealizedProfit ?? profit?.totalProfitLoss ?? 0
  const unrealized = latestSnapshot
    ? (latestSnapshot.marketValueUsd ?? 0) -
      (latestSnapshot.avgPrice ?? 0) * (latestSnapshot.holdings ?? 0)
    : 0

  return (
    <Card className="min-h-[240px]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">수익/손실 통계</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              최근 {period}일 포트폴리오 추이
            </p>
          </div>
          <div className="flex gap-0.5 rounded-lg bg-muted p-1 shrink-0">
            {([7, 30, 90] as Period[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                  period === p
                    ? 'bg-background text-rose-600 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {p}일
              </button>
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
            {profit && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">기간 손익</p>
                  <p
                    className="text-lg font-bold"
                    style={{ color: totalPL >= 0 ? 'var(--pos)' : 'var(--neg)' }}
                  >
                    {totalPL >= 0 ? '+' : ''}${fmtUsd(totalPL)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">수익률</p>
                  <p
                    className="text-lg font-bold"
                    style={{ color: totalRate >= 0 ? 'var(--pos)' : 'var(--neg)' }}
                  >
                    {fmtPercent(totalRate)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">실현 손익</p>
                  <p
                    className="text-lg font-bold"
                    style={{ color: realized >= 0 ? 'var(--pos)' : 'var(--neg)' }}
                  >
                    {realized >= 0 ? '+' : ''}${fmtUsd(realized)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">평가 손익</p>
                  <p
                    className="text-lg font-bold"
                    style={{ color: unrealized >= 0 ? 'var(--pos)' : 'var(--neg)' }}
                  >
                    {unrealized >= 0 ? '+' : ''}${fmtUsd(unrealized)}
                  </p>
                </div>
              </div>
            )}
            <PortfolioChart snapshots={snapshots} />
          </>
        )}
      </CardContent>
    </Card>
  )
}
