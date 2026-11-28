'use client'

import { useRef, useState } from 'react'
import { getCategoryPath } from '@entities/finance'
import { FinanceSummary } from '@widgets/finance-summary'
import { FinanceBudgetProgress } from '@widgets/finance-budget-progress'
import { FinanceTrend } from '@widgets/finance-trend'
import { FinanceRecordList } from '@widgets/finance-record-list'
import { useFinanceFlowData, type FlowCategoryType } from './useFinanceFlowData'

// income/expense/saving 3개 라우트가 type만 다르고 완전히 동일한 위젯 조합을 쓴다 — 이 컴포넌트 하나를 공유한다.
export function FlowPageView({ type }: { type: FlowCategoryType }) {
  const {
    period,
    setPeriod,
    today,
    trendRange,
    setTrendRange,
    categoryIndex,
    categoryTree,
    isCategoriesLoading,
    isCategoriesError,
    isPeriodPending,
    isFlowLoading,
    isFlowError,
    registerWindow,
  } = useFinanceFlowData(type)

  // 예산 대비 카드 행 클릭 → 거래내역 카테고리 필터. 두 위젯이 공유하는 상태라 여기(app)가 소유한다.
  const [categoryPath, setCategoryPath] = useState<string[]>([])
  const recordListRef = useRef<HTMLDivElement>(null)

  function handleCategorySelect(categoryId: string) {
    setCategoryPath(getCategoryPath(categoryTree, categoryId).map((c) => c.id))
    recordListRef.current?.scrollIntoView({ block: 'start' })
  }

  return (
    <div className="space-y-6">
      <FinanceSummary
        type={type}
        isLoading={isPeriodPending}
        period={period}
        onPeriodChange={setPeriod}
        today={today}
      />
      <FinanceBudgetProgress
        type={type}
        categoryTree={categoryTree}
        index={categoryIndex}
        period={period}
        isLoading={isPeriodPending || isCategoriesLoading}
        isError={isCategoriesError}
        onCategorySelect={handleCategorySelect}
      />
      <FinanceTrend
        type={type}
        range={trendRange}
        onRangeChange={setTrendRange}
        categoryTree={categoryTree}
        index={categoryIndex}
        period={period}
        isLoading={isPeriodPending || isCategoriesLoading}
      />
      <div ref={recordListRef} className="scroll-mt-20">
        <FinanceRecordList
          type={type}
          categoryTree={categoryTree}
          index={categoryIndex}
          period={period}
          isLoading={isPeriodPending || isFlowLoading}
          today={today}
          isError={isFlowError}
          registerWindowFrom={registerWindow.from}
          registerWindowTo={registerWindow.to}
          categoryPath={categoryPath}
          onCategoryPathChange={setCategoryPath}
        />
      </div>
    </div>
  )
}
