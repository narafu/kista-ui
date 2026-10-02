'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SectionError } from '@shared/ui/SectionError'
import { LoadingRow } from '@shared/ui/LoadingRow'
import { maskAmount } from '@shared/lib/format'
import { useAmountHiddenPreference } from '@shared/lib/hooks/use-amount-hidden'
import { useMeta } from '@entities/meta'
import { calcFlowSummary, filterByType } from '@entities/finance'
import type { CategoryIndex, FinanceCategoryType, FinanceTransaction, Period } from '@entities/finance'
import { RevealableValue } from '@widgets/revealable-value'
import { FinanceKpis, PeriodControls } from './FinanceSummaryParts'
import { calcPreviousYearTotal, calcRemainingAmount, calcYearlyAverage } from './financeSummaryCalc'

interface Props {
  type: FinanceCategoryType
  transactions: FinanceTransaction[]
  index: CategoryIndex
  isLoading: boolean
  isError: boolean
  period: Period
  onPeriodChange: (period: Period) => void
  // 연간 모드 전년대비 전용 — period.mode==='yearly'일 때만 부모(income/expense/saving 페이지, useFinanceFlowData 훅)가 조회해 넘긴다.
  // 기존 12개월 슬라이딩 윈도우(windowRange)로는 전년 동기간을 커버할 수 없어 별도 쿼리가 필요하다.
  previousYearTransactions?: FinanceTransaction[]
  // 부모 페이지(useFinanceFlowData 훅)가 한 번만 계산해 내려주는 "오늘"(period 상태와 동일한 소유 방식) — 위젯마다
  // todayKst()를 각자 호출하지 않는다.
  today: string
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

  const previousYearTotal = useMemo(
    () => calcPreviousYearTotal(period, previousYearTransactions, index, type, today),
    [period, previousYearTransactions, index, type, today],
  )
  const previousYearDelta = previousYearTotal !== null ? summary.total - previousYearTotal : null

  const yearlyAverage = useMemo(
    () => calcYearlyAverage(typeTransactions, period.mode, period.month, today),
    [typeTransactions, period.mode, period.month, today],
  )

  // 수입 대비 비율 — INCOME 탭은 자기 자신 대비라 항상 100%로 무의미해 제외한다. 같은 기간 INCOME
  // 합계는 이미 받고 있는 unfiltered transactions+index에서 뽑아내 별도 쿼리 없이 계산한다.
  const incomeTotal = useMemo(() => {
    const incomeTransactions = filterByType(transactions, index, 'INCOME')
    return calcFlowSummary(incomeTransactions, period, today).total
  }, [transactions, index, period, today])
  const incomeRatio = type !== 'INCOME' && incomeTotal > 0 ? summary.total / incomeTotal : null

  const remainingAmount = useMemo(
    () => calcRemainingAmount(type, transactions, index, period, today, summary.total),
    [type, transactions, index, period, today, summary.total],
  )

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base lg:text-lg">{labelOf('financeCategoryTypes', type)} 요약</CardTitle>
        <PeriodControls period={period} onPeriodChange={onPeriodChange} today={today} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingRow />
        ) : isError ? (
          <SectionError message="요약을 불러오지 못했습니다" />
        ) : summary.count === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">표시할 거래내역이 없습니다</p>
        ) : (
          <FinanceKpis
            type={type}
            mode={period.mode}
            total={summary.total}
            count={summary.count}
            previousDelta={previousDelta}
            previousYearDelta={previousYearDelta}
            incomeRatio={incomeRatio}
            remainingAmount={remainingAmount}
            yearlyAverage={yearlyAverage}
            amountValue={amountValue}
          />
        )}
      </CardContent>
    </Card>
  )
}
