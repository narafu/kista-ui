'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SectionError } from '@shared/ui/SectionError'
import { fmtKrw, fmtSignedKrw, maskAmount, pnlTextClass, ratioToPercent } from '@shared/lib/format'
import { cn } from '@shared/lib/utils'
import { useAmountHiddenPreference } from '@shared/lib/hooks/use-amount-hidden'
import { useMeta } from '@entities/meta'
import { calcFlowSummary, filterByType, previousYearRange } from '@entities/finance'
import type { CategoryIndex, FinanceCategoryType, FinanceTransaction, Period, PeriodMode } from '@entities/finance'
import { KpiCard } from '@widgets/kpi-card'
import { RevealableValue } from '@widgets/revealable-value'

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
  // FinanceDashboard가 한 번만 계산해 내려주는 "오늘"(period 상태와 동일한 소유 방식) — 위젯마다
  // todayKst()를 각자 호출하지 않는다.
  today: string
}

// 기준 연도·기준 월 select 한 쌍 — 월간 모드(연도+월)와 연간 모드(연도만)가 값·옵션만 다르고
// Select/SelectTrigger/SelectValue/SelectContent 구조는 동일해 공유한다.
function PeriodSelect({ ariaLabel, items, value, onValueChange, className }: {
  ariaLabel: string
  items: { value: string; label: string }[]
  value: string
  onValueChange: (value: string) => void
  className: string
}) {
  return (
    <Select items={items} value={value} onValueChange={(v) => { if (v) onValueChange(v) }}>
      <SelectTrigger aria-label={ariaLabel} className={cn('h-9 text-sm', className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
      </SelectContent>
    </Select>
  )
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

export function FinanceSummary({ type, transactions, index, isLoading, isError, period, onPeriodChange, previousYearTransactions, today }: Props) {
  const { labelOf } = useMeta()
  const { hidden } = useAmountHiddenPreference()

  function amountValue(display: string) {
    return hidden ? <RevealableValue value={display} hiddenDisplay={maskAmount(display)} /> : display
  }

  const typeTransactions = useMemo(() => filterByType(transactions, index, type), [transactions, index, type])
  const summary = useMemo(() => calcFlowSummary(typeTransactions, period, today), [typeTransactions, period, today])
  // 소비는 늘어난 게 나쁜 신호라 색상 부호를 뒤집는다 — AssetOverview의 부채(isLiability) 델타
  // 반전과 같은 이유. 수입·저축은 늘어난 게 좋은 신호라 그대로 둔다.
  const previousDelta = summary.previousTotal !== null ? summary.total - summary.previousTotal : null

  const previousYearTotal = useMemo(() => {
    if (period.mode !== 'yearly' || !previousYearTransactions) return null
    const { from, to } = previousYearRange(period, today)
    return filterByType(previousYearTransactions, index, type)
      .filter((t) => t.transactionDate >= from && t.transactionDate <= to)
      .reduce((sum, t) => sum + t.amount, 0)
  }, [period, previousYearTransactions, index, type, today])
  const previousYearDelta = previousYearTotal !== null ? summary.total - previousYearTotal : null

  // 수입 대비 비율 — INCOME 탭은 자기 자신 대비라 항상 100%로 무의미해 제외한다. 같은 기간 INCOME
  // 합계는 이미 받고 있는 unfiltered transactions+index에서 뽑아내 별도 쿼리 없이 계산한다.
  const incomeTotal = useMemo(() => {
    const incomeTransactions = filterByType(transactions, index, 'INCOME')
    return calcFlowSummary(incomeTransactions, period, today).total
  }, [transactions, index, period, today])
  const incomeRatio = type !== 'INCOME' && incomeTotal > 0 ? summary.total / incomeTotal : null

  // 남은 금액(INCOME 탭 전용) = 수입 - 소비 - 저축. incomeTotal과 동일 패턴으로 unfiltered
  // transactions+index에서 EXPENSE/SAVING 합계를 뽑아낸다(별도 쿼리 없이 계산).
  const remainingAmount = useMemo(() => {
    if (type !== 'INCOME') return null
    const expenseTotal = calcFlowSummary(filterByType(transactions, index, 'EXPENSE'), period, today).total
    const savingTotal = calcFlowSummary(filterByType(transactions, index, 'SAVING'), period, today).total
    return summary.total - expenseTotal - savingTotal
  }, [type, transactions, index, period, today, summary.total])

  // 연도 select 옵션 — 최근 15개년을 기본으로 잡되, 월간 모드에서 그 범위 밖 연도(과거든 미래든)를
  // 고른 뒤 연간 모드로 전환해도 현재 선택값이 항상 목록에 포함되도록 보정한다(안 하면 SelectValue가
  // 목록에 없는 값이라 빈칸으로 보인다).
  const currentYear = Number(today.slice(0, 4))
  const selectedYear = Number(period.month.slice(0, 4))
  const latestYear = Math.max(selectedYear, currentYear)
  const earliestYear = Math.min(selectedYear, currentYear - 14)
  const yearOptions = Array.from({ length: latestYear - earliestYear + 1 }, (_, i) => latestYear - i)
  const monthOptions = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base lg:text-lg">{labelOf('financeCategoryTypes', type)} 요약</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          {period.mode === 'monthly' ? (
            // 네이티브 <input type="month">은 데스크탑 사파리가 지원하지 않아(텍스트 입력으로 깨짐)
            // 연도·월 select 쌍으로 대체한다.
            <div className="flex items-center gap-1">
              <PeriodSelect
                ariaLabel="기준 연도"
                className="w-20"
                items={yearOptions.map((y) => ({ value: String(y), label: `${y}년` }))}
                value={period.month.slice(0, 4)}
                onValueChange={(value) => onPeriodChange({ ...period, month: `${value}-${period.month.slice(5, 7)}` })}
              />
              <PeriodSelect
                ariaLabel="기준 월"
                className="w-16"
                items={monthOptions.map((m) => ({ value: m, label: `${Number(m)}월` }))}
                value={period.month.slice(5, 7)}
                onValueChange={(value) => onPeriodChange({ ...period, month: `${period.month.slice(0, 4)}-${value}` })}
              />
            </div>
          ) : (
            <PeriodSelect
              ariaLabel="기준 연도"
              className="w-24"
              items={yearOptions.map((y) => ({ value: String(y), label: `${y}년` }))}
              value={period.month.slice(0, 4)}
              onValueChange={(value) => onPeriodChange({ ...period, month: `${value}-${period.month.slice(5, 7)}` })}
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="합계" value={amountValue(fmtKrw(summary.total))} variant="accent" valueClassName="break-words text-base sm:text-2xl lg:text-3xl" />
            {period.mode === 'monthly' && previousDelta !== null && (
              <KpiCard
                label="전월 대비"
                value={amountValue(fmtSignedKrw(previousDelta))}
                valueClassName={cn('break-words text-base sm:text-2xl lg:text-3xl', pnlTextClass(type === 'EXPENSE' ? -previousDelta : previousDelta))}
              />
            )}
            {period.mode === 'yearly' && previousYearDelta !== null && (
              <KpiCard
                label="전년 대비"
                value={amountValue(fmtSignedKrw(previousYearDelta))}
                valueClassName={cn('break-words text-base sm:text-2xl lg:text-3xl', pnlTextClass(type === 'EXPENSE' ? -previousYearDelta : previousYearDelta))}
              />
            )}
            {incomeRatio !== null && (
              <KpiCard label="수입 대비 비율" value={`${ratioToPercent(incomeRatio)}%`} valueClassName="break-words text-base sm:text-2xl lg:text-3xl" />
            )}
            {/* 남은 금액 카드는 수입 탭에서만 노출한다(건수 카드보다 앞) — 소비·저축 탭은 예산 대비
                카드가 이미 있어 중복 정보로 판단돼 제외됐다. */}
            {remainingAmount !== null && (
              <KpiCard
                label="남은 금액"
                value={amountValue(fmtSignedKrw(remainingAmount))}
                valueClassName={cn('break-words text-base sm:text-2xl lg:text-3xl', pnlTextClass(remainingAmount))}
              />
            )}
            <KpiCard label="건수" value={`${summary.count}건`} valueClassName="break-words text-base sm:text-2xl lg:text-3xl" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
