'use client'

import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { CategoryIndex, FinanceCategoryType, FinanceTransaction } from '@entities/finance'

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
  transactions: FinanceTransaction[]
  index: CategoryIndex
  month: string
  isLoading: boolean
  isError: boolean
  className?: string
}

export function FinanceTrend({ type, transactions, index, month, isLoading, isError, className }: Props) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base lg:text-lg">최근 6개월 추이</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <FinanceTrendInner type={type} transactions={transactions} index={index} month={month} isLoading={isLoading} isError={isError} />
      </CardContent>
    </Card>
  )
}
