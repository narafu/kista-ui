'use client'

import type { ReactNode } from 'react'
import { fmtKrw, fmtSignedKrw, pnlTextClass } from '@shared/lib/format'
import { cn } from '@shared/lib/utils'
import {
  SYSTEM_LOAN_CATEGORY_ID,
  assetCategoryColor,
  assetClassColor,
  formatAssetL1CategoryLabel,
} from '@entities/finance'
import type { AssetClass, calcAssetClassBreakdown, calcCategoryBreakdown, calcMonthlySummary } from '@entities/finance'
import { KpiCard } from '@widgets/kpi-card'

type Summary = ReturnType<typeof calcMonthlySummary>
type CategoryBreakdown = ReturnType<typeof calcCategoryBreakdown>
type AssetClassBreakdown = ReturnType<typeof calcAssetClassBreakdown>
type AmountValue = (display: string) => ReactNode
type LabelOf = (category: 'assetClasses', code: string) => string

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

const KPI_VALUE_CLASS = 'break-words text-base sm:text-2xl lg:text-3xl'

export function SummaryKpis({ summary, previousSummary, amountValue, labelOf }: {
  summary: Summary
  previousSummary: Summary | null
  amountValue: AmountValue
  labelOf: LabelOf
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="순자산"
        value={amountValue(fmtKrw(summary.netWorth))}
        sub={previousSummary && summaryDeltaLabel(summary.netWorth - previousSummary.netWorth, amountValue)}
        valueClassName={KPI_VALUE_CLASS}
      />
      <KpiCard
        label="총자산"
        value={amountValue(fmtKrw(summary.totalAssets))}
        sub={previousSummary && summaryDeltaLabel(summary.totalAssets - previousSummary.totalAssets, amountValue)}
        valueClassName={KPI_VALUE_CLASS}
      />
      <KpiCard
        label="총부채"
        value={amountValue(fmtKrw(summary.totalLiabilities))}
        sub={previousSummary && summaryDeltaLabel(summary.totalLiabilities - previousSummary.totalLiabilities, amountValue, { isLiability: true })}
        valueClassName={KPI_VALUE_CLASS}
      />
      <KpiCard
        label="가장 큰 자산군"
        value={summary.largestAssetClass ? labelOf('assetClasses', summary.largestAssetClass.assetClass) : '—'}
        sub={summary.largestAssetClass ? amountValue(fmtKrw(summary.largestAssetClass.amount)) : undefined}
      />
    </div>
  )
}

const percentOf = (amount: number, total: number) => (total > 0 ? (amount / total) * 100 : 0)

export function CategorySection({ breakdown, delta }: {
  breakdown: CategoryBreakdown
  delta: (category: string, amount: number) => number | null
}) {
  const total = breakdown.reduce((sum, entry) => sum + entry.amount, 0)
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">카테고리별 현황</h3>
      <div className="space-y-2">
        {breakdown.map((entry) => (
          <BreakdownBar
            key={entry.category}
            label={formatAssetL1CategoryLabel(entry.category)}
            amount={entry.amount}
            percent={percentOf(entry.amount, total)}
            delta={delta(entry.category, entry.amount)}
            color={assetCategoryColor(entry.category)}
            isLiability={entry.category === SYSTEM_LOAN_CATEGORY_ID}
          />
        ))}
      </div>
    </div>
  )
}

export function AssetClassSection({ breakdown, delta, labelOf }: {
  breakdown: AssetClassBreakdown
  delta: (assetClass: string, amount: number) => number | null
  labelOf: LabelOf
}) {
  const total = breakdown.reduce((sum, entry) => sum + entry.amount, 0)
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">자산군별 현황</h3>
      {breakdown.length === 0 ? (
        <p className="text-sm text-muted-foreground">이번 달 기록이 없습니다</p>
      ) : (
        <div className="space-y-2">
          {breakdown.map((entry) => (
            <BreakdownBar
              key={entry.assetClass}
              label={labelOf('assetClasses', entry.assetClass)}
              amount={entry.amount}
              percent={percentOf(entry.amount, total)}
              delta={delta(entry.assetClass, entry.amount)}
              color={assetClassColor(entry.assetClass as AssetClass)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
