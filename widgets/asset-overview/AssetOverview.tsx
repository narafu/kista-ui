'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SectionError } from '@shared/ui/SectionError'
import { fmtKrw } from '@shared/lib/format'
import { formatAssetCategoryLabel } from '@shared/lib/api-schema'
import {
  calcAssetClassBreakdown,
  calcCategoryBreakdown,
  calcMonthlySummary,
  useAssetsQuery,
} from '@entities/asset'
import { KpiCard } from '@widgets/kpi-card'

// 카테고리별/자산군별 현황 바 색상 — 각 항목에 순서대로 순환 배정한다.
// widgets/asset-composition와 동일한 5색 팔레트 — 두 위젯이 각자 다른 길이로 순환하면
// 카테고리/자산군마다 위젯별로 다른 색이 배정된다.
const CHART_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

interface Props {
  month: string | null
  months: string[]
  onMonthChange: (month: string) => void
}

interface BreakdownBarProps {
  label: string
  amount: number
  percent: number
  color: string
}

function BreakdownBar({ label, amount, percent, color }: BreakdownBarProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 truncate text-sm text-muted-foreground">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: color }} />
      </div>
      <span className="w-28 shrink-0 text-right text-sm font-medium tabular-nums">{fmtKrw(amount)}</span>
    </div>
  )
}

export function AssetOverview({ month, months, onMonthChange }: Props) {
  const { data: assets = [], isLoading, isError } = useAssetsQuery()

  const summary = useMemo(() => (month ? calcMonthlySummary(assets, month) : null), [assets, month])
  const categoryBreakdown = useMemo(() => (month ? calcCategoryBreakdown(assets, month) : []), [assets, month])
  const assetClassBreakdown = useMemo(() => (month ? calcAssetClassBreakdown(assets, month) : []), [assets, month])

  const categoryTotal = categoryBreakdown.reduce((total, entry) => total + entry.amount, 0)
  const assetClassTotal = assetClassBreakdown.reduce((total, entry) => total + entry.amount, 0)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <CardTitle className="text-base lg:text-lg">이번 달 요약</CardTitle>
        {months.length > 0 && month !== null && (
          <Select items={months.map((m) => ({ value: m, label: m }))} value={month} onValueChange={(value) => { if (value) onMonthChange(value) }}>
            <SelectTrigger aria-label="기준 월" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">불러오는 중…</div>
        ) : isError ? (
          <SectionError message="자산 요약을 불러오지 못했습니다" />
        ) : month === null || summary === null ? (
          <p className="py-8 text-center text-sm text-muted-foreground">표시할 자산 기록이 없습니다.</p>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KpiCard label="순자산" value={fmtKrw(summary.netWorth)} variant="accent" />
              <KpiCard label="총자산" value={fmtKrw(summary.totalAssets)} />
              <KpiCard label="총부채" value={fmtKrw(summary.totalLiabilities)} />
              <KpiCard
                label="가장 큰 자산군"
                value={summary.largestAssetClass?.assetClass ?? '—'}
                sub={summary.largestAssetClass ? fmtKrw(summary.largestAssetClass.amount) : undefined}
              />
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">카테고리별 현황</h3>
              <div className="space-y-2">
                {categoryBreakdown.map((entry, index) => (
                  <BreakdownBar
                    key={entry.category}
                    label={formatAssetCategoryLabel(entry.category)}
                    amount={entry.amount}
                    percent={categoryTotal > 0 ? (entry.amount / categoryTotal) * 100 : 0}
                    color={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">자산군별 현황</h3>
              {assetClassBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">이번 달 기록이 없습니다</p>
              ) : (
                <div className="space-y-2">
                  {assetClassBreakdown.map((entry, index) => (
                    <BreakdownBar
                      key={entry.assetClass}
                      label={entry.assetClass}
                      amount={entry.amount}
                      percent={assetClassTotal > 0 ? (entry.amount / assetClassTotal) * 100 : 0}
                      color={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
