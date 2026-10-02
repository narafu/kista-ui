'use client'

import dynamic from 'next/dynamic'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MONTHLY_TREND_RANGE_OPTIONS, YEARLY_TREND_RANGE_OPTIONS } from '@entities/finance'
import type { CategoryIndex, FinanceCategory, FinanceCategoryType, FinanceTransaction, Period, TrendRange } from '@entities/finance'
import { SegmentedToggle } from '@shared/ui/SegmentedToggle'

const FinanceTrendInner = dynamic(() => import('./FinanceTrendInner'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[240px] flex-1 items-center justify-center text-sm text-muted-foreground sm:min-h-[280px]">
      차트 불러오는 중…
    </div>
  ),
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
    <Card className={className}>
      <CardHeader className="items-center pb-3">
        <CardTitle className="text-base lg:text-lg">{period.mode === 'yearly' ? '연도별 추이' : '월별 추이'}</CardTitle>
        <CardAction>
          <SegmentedToggle
            aria-label="추이 기간"
            options={period.mode === 'yearly' ? YEARLY_TREND_RANGE_OPTIONS : MONTHLY_TREND_RANGE_OPTIONS}
            value={range}
            onChange={onRangeChange}
          />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
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
      </CardContent>
    </Card>
  )
}
