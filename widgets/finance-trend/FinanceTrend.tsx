'use client'

import dynamic from 'next/dynamic'
import { asyncFallback } from '@shared/ui/AsyncSection'
import { Surface } from '@shared/ui/Surface'
import { SectionTitle } from '@shared/ui/SectionTitle'
import { cn } from '@shared/lib/utils'
import { MONTHLY_TREND_RANGE_OPTIONS, YEARLY_TREND_RANGE_OPTIONS } from '@entities/finance'
import type { CategoryIndex, FinanceCategory, FinanceCategoryType, FinanceTransaction, Period, TrendRange } from '@entities/finance'
import { SegmentedToggle } from '@shared/ui/SegmentedToggle'

const FinanceTrendInner = dynamic(() => import('./FinanceTrendInner'), {
  ssr: false,
  loading: () => asyncFallback({ isLoading: true, skeleton: 'chart', fallbackClassName: 'min-h-[240px] flex-1 sm:min-h-[280px]' }),
})

interface Props {
  type: FinanceCategoryType
  transactions: FinanceTransaction[] // 추이 전용 윈도우(useFinanceFlowData.ts의 trendWindow 조회 결과)
  range: TrendRange // 월간 모드: 개월 수, 연간 모드: 년 수
  onRangeChange: (range: TrendRange) => void
  categoryTree: FinanceCategory[]
  index: CategoryIndex
  period: Period
  isLoading: boolean
  isError: boolean
  className?: string
  // useFinanceFlowData.ts가 한 번만 계산해 내려주는 "오늘" — 위젯마다 todayKst()를 각자 호출하지 않는다.
  today: string
}

export function FinanceTrend({ type, transactions, range, onRangeChange, categoryTree, index, period, isLoading, isError, className, today }: Props) {
  return (
    <Surface size="compact" className={cn('flex flex-col gap-4 overflow-hidden text-sm', className)}>
      <div className="flex items-center justify-between gap-1 pb-3">
        <SectionTitle>{period.mode === 'yearly' ? '연도별 추이' : '월별 추이'}</SectionTitle>
        <div>
          <SegmentedToggle
            aria-label="추이 기간"
            options={period.mode === 'yearly' ? YEARLY_TREND_RANGE_OPTIONS : MONTHLY_TREND_RANGE_OPTIONS}
            value={range}
            onChange={onRangeChange}
          />
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        <FinanceTrendInner
          type={type}
          transactions={transactions}
          range={range}
          categoryTree={categoryTree}
          index={index}
          period={period}
          isLoading={isLoading}
          isError={isError}
          today={today}
        />
      </div>
    </Surface>
  )
}
