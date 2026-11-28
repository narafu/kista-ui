'use client'

import { Surface } from '@shared/ui/Surface'
import { SectionTitle } from '@shared/ui/SectionTitle'
import { SectionError } from '@shared/ui/SectionError'
import { LoadingRow } from '@shared/ui/LoadingRow'
import { maskAmount } from '@shared/lib/format'
import { useAmountHiddenPreference } from '@shared/lib/hooks/use-amount-hidden'
import { useMeta } from '@entities/meta'
import { useFlowSummaryQuery } from '@entities/finance'
import type { FinanceCategoryType, Period } from '@entities/finance'
import { RevealableValue } from '@widgets/revealable-value'
import { FinanceKpis, PeriodControls } from './FinanceSummaryParts'

interface Props {
  type: FinanceCategoryType
  // 부모가 아직 기간을 확정하지 못함(자동 월 보정 전) — 로딩으로 그리고 집계 조회도 미룬다.
  isLoading: boolean
  period: Period
  onPeriodChange: (period: Period) => void
  // 부모 페이지(useFinanceFlowData 훅)가 한 번만 계산해 내려주는 "오늘"(period 상태와 동일한 소유 방식) — 위젯마다
  // todayKst()를 각자 호출하지 않는다.
  today: string
}

export function FinanceSummary({ type, isLoading, period, onPeriodChange, today }: Props) {
  const { labelOf } = useMeta()
  const { hidden, masked } = useAmountHiddenPreference()

  function amountValue(display: string) {
    if (!masked) return display
    // 설정을 읽기 전(hidden === null)엔 보기 버튼 없이 가리기만 한다
    return hidden ? <RevealableValue value={display} hiddenDisplay={maskAmount(display)} /> : maskAmount(display)
  }

  // 합계·건수·전월/전년 동기간 합·선택 연도 월평균·남은 금액(수입)·수입 대비 비율(수입 외)을 서버가 한 번에 준다.
  const summaryQuery = useFlowSummaryQuery(type, period, { enabled: !isLoading })
  const summary = summaryQuery.data
  // 소비는 늘어난 게 나쁜 신호라 색상 부호를 뒤집는다 — AssetOverview의 부채 델타 반전과 같은 이유.
  // 수입·저축은 늘어난 게 좋은 신호라 그대로 둔다. 전월 합은 월간 모드에서만, 전년 동기간 합은 연간 모드에서만 온다.
  const previousDelta = summary?.previousTotal != null ? summary.total - summary.previousTotal : null
  const previousYearDelta = summary?.previousYearTotal != null ? summary.total - summary.previousYearTotal : null

  // 평균은 선택한 연도 기준이라 과거 연도를 보면서 "올해"라고 부르지 않는다
  const selectedYear = period.month.slice(0, 4)
  const yearlyAverageLabel = selectedYear === today.slice(0, 4) ? '올해 월평균' : `${selectedYear}년 월평균`

  return (
    <Surface size="compact" className="flex flex-col gap-4 overflow-hidden text-sm">
      <div className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <SectionTitle>{labelOf('financeCategoryTypes', type)} 요약</SectionTitle>
        <PeriodControls period={period} onPeriodChange={onPeriodChange} today={today} />
      </div>
      <div>
        {isLoading || summaryQuery.isLoading ? (
          <LoadingRow />
        ) : !summary ? (
          <SectionError message="요약을 불러오지 못했습니다." />
        ) : summary.count === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">표시할 거래내역이 없습니다.</p>
        ) : (
          <FinanceKpis
            type={type}
            mode={period.mode}
            total={summary.total}
            count={summary.count}
            previousDelta={previousDelta}
            previousYearDelta={previousYearDelta}
            incomeRatio={summary.incomeRatio ?? null}
            remainingAmount={summary.remaining ?? null}
            yearlyAverage={summary.yearlyAverage}
            yearlyAverageLabel={yearlyAverageLabel}
            amountValue={amountValue}
          />
        )}
      </div>
    </Surface>
  )
}
