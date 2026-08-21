'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SectionError } from '@shared/ui/SectionError'
import { fmtKrw, fmtSignedKrw, pnlTextClass, todayKst } from '@shared/lib/format'
import { cn } from '@shared/lib/utils'
import { useMeta } from '@entities/meta'
import { calcFlowSummary, elapsedDaysInMonth, elapsedMonthsInYear, filterByType, previousYearRange } from '@entities/finance'
import type { CategoryIndex, FinanceCategoryType, FinanceTransaction, Period, PeriodMode } from '@entities/finance'
import { KpiCard } from '@widgets/kpi-card'

interface Props {
  type: FinanceCategoryType
  transactions: FinanceTransaction[]
  index: CategoryIndex
  isLoading: boolean
  isError: boolean
  period: Period
  onPeriodChange: (period: Period) => void
  // 연간 모드 전년대비 전용 — period.mode==='yearly'일 때만 부모(FinanceDashboard)가 조회해 넘긴다.
  // 기존 12개월 슬라이딩 윈도우(windowRange)로는 전년 동기간을 커버할 수 없어 별도 쿼리가 필요하다.
  previousYearTransactions?: FinanceTransaction[]
}

const MODE_OPTIONS: { value: PeriodMode; label: string }[] = [
  { value: 'monthly', label: '월간' },
  { value: 'yearly', label: '연간' },
]

// FinanceDashboard.tsx의 로컬 TabButton과 동일한 스타일 — widget cross-import 금지라 직접 복제.
function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'min-h-9 rounded px-3 py-1 text-sm font-medium transition-colors',
        active
          ? 'bg-[var(--brand-fg-soft)] text-[var(--background)]'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent',
      )}
    >
      {children}
    </button>
  )
}

export function FinanceSummary({ type, transactions, index, isLoading, isError, period, onPeriodChange, previousYearTransactions }: Props) {
  const { labelOf } = useMeta()

  const typeTransactions = useMemo(() => filterByType(transactions, index, type), [transactions, index, type])
  const summary = useMemo(() => calcFlowSummary(typeTransactions, period), [typeTransactions, period])
  // 소비는 늘어난 게 나쁜 신호라 색상 부호를 뒤집는다 — AssetOverview의 부채(isLiability) 델타
  // 반전과 같은 이유. 수입·저축은 늘어난 게 좋은 신호라 그대로 둔다.
  const previousDelta = summary.previousTotal !== null ? summary.total - summary.previousTotal : null

  const previousYearTotal = useMemo(() => {
    if (period.mode !== 'yearly' || !previousYearTransactions) return null
    const { from, to } = previousYearRange(period)
    return filterByType(previousYearTransactions, index, type)
      .filter((t) => t.transactionDate >= from && t.transactionDate <= to)
      .reduce((sum, t) => sum + t.amount, 0)
  }, [period, previousYearTransactions, index, type])
  const previousYearDelta = previousYearTotal !== null ? summary.total - previousYearTotal : null

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base lg:text-lg">{labelOf('financeCategoryTypes', type)} 요약</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          {period.mode === 'monthly' ? (
            <input
              type="month"
              aria-label="기준 월"
              value={period.month}
              onChange={(e) => { if (e.target.value) onPeriodChange({ ...period, month: e.target.value }) }}
              className="h-9 rounded-md border border-border bg-background px-2 text-sm"
            />
          ) : (
            <input
              type="number"
              aria-label="기준 연도"
              value={Number(period.month.slice(0, 4))}
              onChange={(e) => {
                // 4자리 미만이면 커밋하지 않는다 — 도중에 "2-08" 같은 잘못된 month 문자열이
                // period 전체(elapsedMonthsInYear·previousYearRange 등)를 오염시키는 걸 막는다.
                if (e.target.value.length !== 4) return
                onPeriodChange({ ...period, month: `${e.target.value}-${period.month.slice(5, 7)}` })
              }}
              className="h-9 w-24 rounded-md border border-border bg-background px-2 text-sm"
            />
          )}
          <div role="group" aria-label="기간 모드" className="grid grid-cols-2 rounded-md border border-border p-0.5">
            {MODE_OPTIONS.map((option) => (
              <ModeButton
                key={option.value}
                active={period.mode === option.value}
                onClick={() => onPeriodChange({ ...period, mode: option.value })}
              >
                {option.label}
              </ModeButton>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">불러오는 중…</div>
        ) : isError ? (
          <SectionError message="요약을 불러오지 못했습니다" />
        ) : summary.count === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">표시할 거래내역이 없습니다</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="합계" value={fmtKrw(summary.total)} variant="accent" valueClassName="break-words text-base sm:text-2xl lg:text-3xl" />
            <KpiCard label="건수" value={`${summary.count}건`} valueClassName="break-words text-base sm:text-2xl lg:text-3xl" />
            {period.mode === 'monthly' && previousDelta !== null && (
              <KpiCard
                label="전월 대비"
                value={fmtSignedKrw(previousDelta)}
                valueClassName={cn('break-words text-base sm:text-2xl lg:text-3xl', pnlTextClass(type === 'EXPENSE' ? -previousDelta : previousDelta))}
              />
            )}
            {period.mode === 'yearly' && previousYearDelta !== null && (
              <KpiCard
                label="전년 대비"
                value={fmtSignedKrw(previousYearDelta)}
                valueClassName={cn('break-words text-base sm:text-2xl lg:text-3xl', pnlTextClass(type === 'EXPENSE' ? -previousYearDelta : previousYearDelta))}
              />
            )}
            <KpiCard
              label={period.mode === 'monthly' ? '일평균' : '월평균'}
              value={fmtKrw(
                Math.round(
                  summary.total /
                    (period.mode === 'monthly' ? elapsedDaysInMonth(period.month, todayKst()) : elapsedMonthsInYear(period.month)),
                ),
              )}
              valueClassName="break-words text-base sm:text-2xl lg:text-3xl"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
