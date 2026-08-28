'use client'

import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { CategoryIndex, FinanceCategory, FinanceCategoryType, FinanceTransaction, Period } from '@entities/finance'

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
  transactions: FinanceTransaction[] // 월간 모드: 12개월 윈도우
  yearlyTransactions: FinanceTransaction[] // 연간 모드: 최근 6개년 윈도우(useFinanceFlowData.ts가 period.mode==='yearly'일 때만 조회)
  categoryTree: FinanceCategory[]
  index: CategoryIndex
  period: Period
  isLoading: boolean
  isError: boolean
  className?: string
  // useFinanceFlowData.ts가 한 번만 계산해 내려주는 "오늘" — 위젯마다 todayKst()를 각자 호출하지 않는다.
  today: string
}

export function FinanceTrend({ type, transactions, yearlyTransactions, categoryTree, index, period, isLoading, isError, className, today }: Props) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base lg:text-lg">{period.mode === 'yearly' ? '최근 6개년 추이' : '최근 6개월 추이'}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <FinanceTrendInner
          type={type}
          transactions={transactions}
          yearlyTransactions={yearlyTransactions}
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
