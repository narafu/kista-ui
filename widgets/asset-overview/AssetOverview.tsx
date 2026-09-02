'use client'

import { useMemo, type ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SectionError } from '@shared/ui/SectionError'
import { YearMonthSelect } from '@shared/ui/YearMonthSelect'
import { fmtKrw, fmtSignedKrw, maskAmount, pnlTextClass } from '@shared/lib/format'
import { cn } from '@shared/lib/utils'
import { useAmountHiddenPreference } from '@shared/lib/hooks/use-amount-hidden'
import { useMeta } from '@entities/meta'
import {
  SYSTEM_LOAN_CATEGORY_ID,
  assetCategoryColor,
  assetClassColor,
  calcAssetClassBreakdown,
  calcCategoryBreakdown,
  calcMonthlySummary,
  formatAssetL1CategoryLabel,
  previousMonthOf,
  useAssetSnapshotsQuery,
} from '@entities/finance'
import type { AssetClass } from '@entities/finance'
import { KpiCard } from '@widgets/kpi-card'
import { RevealableValue } from '@widgets/revealable-value'

interface Props {
  month: string
  months: string[]
  onMonthChange: (month: string) => void
  today: string
}

interface BreakdownBarProps {
  label: string
  amount: number
  percent: number
  delta: number | null
  color: string
  isLiability?: boolean
}

function BreakdownBar({ label, amount, percent, delta, color, isLiability = false }: BreakdownBarProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 truncate text-sm text-muted-foreground">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex w-32 shrink-0 flex-col items-end">
        <span className="text-sm font-medium tabular-nums">{fmtKrw(amount)}</span>
        <span className={cn('text-xs tabular-nums', !delta ? 'text-muted-foreground' : pnlTextClass(isLiability ? -delta : delta))}>
          {delta === null ? '—' : fmtSignedKrw(delta)}
        </span>
      </div>
    </div>
  )
}

function summaryDeltaLabel(
  delta: number,
  amountValue: (display: string) => ReactNode,
  { isLiability = false }: { isLiability?: boolean } = {},
) {
  return (
    <span className={cn('tabular-nums', pnlTextClass(isLiability ? -delta : delta))}>
      전월대비 {amountValue(fmtSignedKrw(delta))}
    </span>
  )
}

export function AssetOverview({ month, months, onMonthChange, today }: Props) {
  const { data: snapshots = [], isLoading, isError } = useAssetSnapshotsQuery()
  const { labelOf } = useMeta()
  const { hidden } = useAmountHiddenPreference()

  function amountValue(display: string) {
    return hidden ? <RevealableValue value={display} hiddenDisplay={maskAmount(display)} /> : display
  }

  const summary = useMemo(() => calcMonthlySummary(snapshots, month), [snapshots, month])
  const categoryBreakdown = useMemo(() => calcCategoryBreakdown(snapshots, month), [snapshots, month])
  const assetClassBreakdown = useMemo(() => calcAssetClassBreakdown(snapshots, month), [snapshots, month])

  const previousMonth = previousMonthOf(months, month)
  const previousSummary = useMemo(
    () => (previousMonth ? calcMonthlySummary(snapshots, previousMonth) : null),
    [snapshots, previousMonth],
  )
  const previousCategoryBreakdown = useMemo(
    () => (previousMonth ? calcCategoryBreakdown(snapshots, previousMonth) : []),
    [snapshots, previousMonth],
  )
  const previousAssetClassBreakdown = useMemo(
    () => (previousMonth ? calcAssetClassBreakdown(snapshots, previousMonth) : []),
    [snapshots, previousMonth],
  )
  const categoryDelta = (category: string, amount: number): number | null => {
    if (!previousMonth) return null
    const previousAmount = previousCategoryBreakdown.find((entry) => entry.category === category)?.amount ?? 0
    return amount - previousAmount
  }
  const assetClassDelta = (assetClass: string, amount: number): number | null => {
    if (!previousMonth) return null
    const previousAmount = previousAssetClassBreakdown.find((entry) => entry.assetClass === assetClass)?.amount ?? 0
    return amount - previousAmount
  }

  const categoryTotal = categoryBreakdown.reduce((total, entry) => total + entry.amount, 0)
  const assetClassTotal = assetClassBreakdown.reduce((total, entry) => total + entry.amount, 0)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <CardTitle className="text-base lg:text-lg">이번 달 요약</CardTitle>
        <YearMonthSelect value={month} onValueChange={onMonthChange} today={today} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">불러오는 중…</div>
        ) : isError ? (
          <SectionError message="자산 요약을 불러오지 못했습니다" />
        ) : summary.recordCount === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">표시할 자산 기록이 없습니다.</p>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="순자산"
                value={amountValue(fmtKrw(summary.netWorth))}
                sub={previousSummary && summaryDeltaLabel(summary.netWorth - previousSummary.netWorth, amountValue)}
                valueClassName="break-words text-base sm:text-2xl lg:text-3xl"
              />
              <KpiCard
                label="총자산"
                value={amountValue(fmtKrw(summary.totalAssets))}
                sub={previousSummary && summaryDeltaLabel(summary.totalAssets - previousSummary.totalAssets, amountValue)}
                valueClassName="break-words text-base sm:text-2xl lg:text-3xl"
              />
              <KpiCard
                label="총부채"
                value={amountValue(fmtKrw(summary.totalLiabilities))}
                sub={previousSummary && summaryDeltaLabel(summary.totalLiabilities - previousSummary.totalLiabilities, amountValue, { isLiability: true })}
                valueClassName="break-words text-base sm:text-2xl lg:text-3xl"
              />
              <KpiCard
                label="가장 큰 자산군"
                value={summary.largestAssetClass ? labelOf('assetClasses', summary.largestAssetClass.assetClass) : '—'}
                sub={summary.largestAssetClass ? amountValue(fmtKrw(summary.largestAssetClass.amount)) : undefined}
              />
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">카테고리별 현황</h3>
              <div className="space-y-2">
                {categoryBreakdown.map((entry) => (
                  <BreakdownBar
                    key={entry.category}
                    label={formatAssetL1CategoryLabel(entry.category)}
                    amount={entry.amount}
                    percent={categoryTotal > 0 ? (entry.amount / categoryTotal) * 100 : 0}
                    delta={categoryDelta(entry.category, entry.amount)}
                    color={assetCategoryColor(entry.category)}
                    isLiability={entry.category === SYSTEM_LOAN_CATEGORY_ID}
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
                  {assetClassBreakdown.map((entry) => (
                    <BreakdownBar
                      key={entry.assetClass}
                      label={labelOf('assetClasses', entry.assetClass)}
                      amount={entry.amount}
                      percent={assetClassTotal > 0 ? (entry.amount / assetClassTotal) * 100 : 0}
                      delta={assetClassDelta(entry.assetClass, entry.amount)}
                      color={assetClassColor(entry.assetClass as AssetClass)}
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
