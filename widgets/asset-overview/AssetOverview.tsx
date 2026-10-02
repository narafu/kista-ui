'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SectionError } from '@shared/ui/SectionError'
import { LoadingRow } from '@shared/ui/LoadingRow'
import { YearMonthSelect } from '@shared/ui/YearMonthSelect'
import { maskAmount } from '@shared/lib/format'
import { useAmountHiddenPreference } from '@shared/lib/hooks/use-amount-hidden'
import { useMeta } from '@entities/meta'
import {
  calcAssetClassBreakdown,
  calcCategoryBreakdown,
  calcMonthlySummary,
  previousMonthOf,
  useAssetSnapshotsQuery,
} from '@entities/finance'
import { RevealableValue } from '@widgets/revealable-value'
import { AssetClassSection, CategorySection, SummaryKpis } from './AssetOverviewParts'

interface Props {
  month: string
  months: string[]
  onMonthChange: (month: string) => void
  today: string
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <CardTitle className="text-base lg:text-lg">이번 달 요약</CardTitle>
        <YearMonthSelect value={month} onValueChange={onMonthChange} today={today} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingRow />
        ) : isError ? (
          <SectionError message="자산 요약을 불러오지 못했습니다" />
        ) : summary.recordCount === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">표시할 자산 기록이 없습니다.</p>
        ) : (
          <div className="space-y-6">
            <SummaryKpis summary={summary} previousSummary={previousSummary} amountValue={amountValue} labelOf={labelOf} />
            <CategorySection breakdown={categoryBreakdown} delta={categoryDelta} />
            <AssetClassSection breakdown={assetClassBreakdown} delta={assetClassDelta} labelOf={labelOf} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
