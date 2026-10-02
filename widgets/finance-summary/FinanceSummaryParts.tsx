'use client'

import type { ReactNode } from 'react'
import { SegmentedToggle } from '@shared/ui/SegmentedToggle'
import { YearMonthSelect } from '@shared/ui/YearMonthSelect'
import { YearSelect } from '@shared/ui/YearSelect'
import { fmtKrw, fmtSignedKrw, pnlTextClass, ratioToPercent } from '@shared/lib/format'
import { cn } from '@shared/lib/utils'
import type { FinanceCategoryType, Period, PeriodMode } from '@entities/finance'
import { KpiCard } from '@widgets/kpi-card'

type AmountValue = (display: string) => ReactNode

const MODE_OPTIONS: { value: PeriodMode; label: string }[] = [
  { value: 'monthly', label: '월간' },
  { value: 'yearly', label: '연간' },
]

const KPI_VALUE_CLASS = 'break-words text-base sm:text-2xl lg:text-3xl'

export function PeriodControls({ period, onPeriodChange, today }: {
  period: Period
  onPeriodChange: (period: Period) => void
  today: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {period.mode === 'monthly' ? (
        <YearMonthSelect
          value={period.month}
          onValueChange={(month) => onPeriodChange({ ...period, month })}
          today={today}
        />
      ) : (
        <YearSelect
          value={Number(period.month.slice(0, 4))}
          onValueChange={(year) => onPeriodChange({ ...period, month: `${year}-${period.month.slice(5, 7)}` })}
          today={today}
        />
      )}
      <SegmentedToggle
        aria-label="기간 모드"
        options={MODE_OPTIONS}
        value={period.mode}
        onChange={(mode) => onPeriodChange({ ...period, mode })}
        className="grid grid-cols-2"
        itemClassName="px-3 py-1 text-sm"
      />
    </div>
  )
}

// 소비는 늘어난 게 나쁜 신호라 색상 부호를 뒤집는다(AssetOverview의 부채 델타 반전과 동일 이유).
function deltaLabel(label: string, delta: number, type: FinanceCategoryType, amountValue: AmountValue) {
  return (
    <span className={cn('tabular-nums', pnlTextClass(type === 'EXPENSE' ? -delta : delta))}>
      {label} {amountValue(fmtSignedKrw(delta))}
    </span>
  )
}

function totalSub(
  mode: PeriodMode,
  previousDelta: number | null,
  previousYearDelta: number | null,
  type: FinanceCategoryType,
  amountValue: AmountValue,
): ReactNode {
  if (mode === 'monthly' && previousDelta !== null) return deltaLabel('전월대비', previousDelta, type, amountValue)
  if (mode === 'yearly' && previousYearDelta !== null) return deltaLabel('전년대비', previousYearDelta, type, amountValue)
  return undefined
}

export function FinanceKpis({ type, mode, total, count, previousDelta, previousYearDelta, incomeRatio, remainingAmount, yearlyAverage, amountValue }: {
  type: FinanceCategoryType
  mode: PeriodMode
  total: number
  count: number
  previousDelta: number | null
  previousYearDelta: number | null
  incomeRatio: number | null
  remainingAmount: number | null
  yearlyAverage: number
  amountValue: AmountValue
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="합계"
        value={amountValue(fmtKrw(total))}
        sub={totalSub(mode, previousDelta, previousYearDelta, type, amountValue)}
        valueClassName={KPI_VALUE_CLASS}
      />
      {incomeRatio !== null && (
        <KpiCard label="수입 대비 비율" value={`${ratioToPercent(incomeRatio)}%`} valueClassName={KPI_VALUE_CLASS} />
      )}
      {/* 남은 금액 카드는 수입 탭에서만 노출한다(올해 월평균 카드보다 앞) — 소비·저축 탭은 예산 대비
          카드가 이미 있어 중복 정보로 판단돼 제외됐다. */}
      {remainingAmount !== null && (
        <KpiCard
          label="남은 금액"
          value={amountValue(fmtSignedKrw(remainingAmount))}
          valueClassName={cn(KPI_VALUE_CLASS, pnlTextClass(remainingAmount))}
        />
      )}
      <KpiCard label="올해 월평균" value={amountValue(fmtKrw(yearlyAverage))} valueClassName={KPI_VALUE_CLASS} />
      <KpiCard label="거래건수" value={`${count}건`} valueClassName={KPI_VALUE_CLASS} />
    </div>
  )
}
