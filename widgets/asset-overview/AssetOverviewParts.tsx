'use client'

import type { ReactNode } from 'react'
import { fmtKrw, fmtSignedKrw, pnlTextClass } from '@shared/lib/format'
import { cn } from '@shared/lib/utils'
import { useAmountHiddenPreference } from '@shared/lib/hooks/use-amount-hidden'
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
  const { maskIfHidden } = useAmountHiddenPreference()
  return (
    <span className="flex items-center gap-3">
      <span className="w-24 shrink-0 truncate text-sm text-muted-foreground">{label}</span>
      <span className="block h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <span
          className="block h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </span>
      <span className="flex w-32 shrink-0 flex-col items-end">
        <span className="text-sm font-medium tabular-nums">{maskIfHidden(fmtKrw(amount))}</span>
        <span className={cn('text-xs tabular-nums', delta === null ? 'text-muted-foreground' : pnlTextClass(isLiability ? -delta : delta))}>
          {delta === null ? '—' : maskIfHidden(fmtSignedKrw(delta))}
        </span>
      </span>
    </span>
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

// 막대 차트까지 포함한 행 전체가 클릭 영역(카테고리 내역 보기)이라 공용 Button 대신 raw button + 이 클래스
const ROW_BUTTON_CLASS = 'block w-full rounded-md px-1 py-0.5 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function CategorySection({ breakdown, delta, onCategorySelect }: {
  breakdown: CategoryBreakdown
  delta: (category: string, amount: number) => number | null
  // 카테고리 행 클릭 — 아래 자산 기록 목록을 그 카테고리로 필터한다. 상태는 페이지(app)가 소유.
  onCategorySelect: (categoryId: string) => void
}) {
  const total = breakdown.reduce((sum, entry) => sum + entry.amount, 0)
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">카테고리별 현황</h3>
      <div className="space-y-2">
        {breakdown.map((entry) => (
          <button key={entry.category} type="button" onClick={() => onCategorySelect(entry.category)} className={ROW_BUTTON_CLASS}>
            <BreakdownBar
              label={formatAssetL1CategoryLabel(entry.category)}
              amount={entry.amount}
              percent={percentOf(entry.amount, total)}
              delta={delta(entry.category, entry.amount)}
              color={assetCategoryColor(entry.category)}
              isLiability={entry.category === SYSTEM_LOAN_CATEGORY_ID}
            />
            <span className="sr-only">내역 보기</span>
          </button>
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
        <p className="text-sm text-muted-foreground">선택한 달의 자산군 기록이 없습니다.</p>
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
