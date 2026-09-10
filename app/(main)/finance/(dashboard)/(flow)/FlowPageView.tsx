'use client'

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
    transactions,
    previousYearTransactions,
    yearlyTrendTransactions,
    categoryIndex,
    categoryTree,
    budgets,
    isFlowLoading,
    isTransactionsError,
    registerWindow,
  } = useFinanceFlowData(type)

  return (
    <div className="space-y-6">
      <FinanceSummary
        type={type}
        transactions={transactions}
        index={categoryIndex}
        isLoading={isFlowLoading}
        isError={isTransactionsError}
        period={period}
        onPeriodChange={setPeriod}
        previousYearTransactions={previousYearTransactions}
        today={today}
      />
      <FinanceBudgetProgress
        type={type}
        budgets={budgets}
        transactions={transactions}
        categoryTree={categoryTree}
        index={categoryIndex}
        period={period}
        isLoading={isFlowLoading}
        isError={isTransactionsError}
        today={today}
      />
      <FinanceTrend
        type={type}
        transactions={transactions}
        yearlyTransactions={yearlyTrendTransactions}
        categoryTree={categoryTree}
        index={categoryIndex}
        period={period}
        isLoading={isFlowLoading}
        isError={isTransactionsError}
        today={today}
      />
      <FinanceRecordList
        type={type}
        transactions={transactions}
        categoryTree={categoryTree}
        index={categoryIndex}
        period={period}
        isLoading={isFlowLoading}
        today={today}
        isError={isTransactionsError}
        registerWindowFrom={registerWindow.from}
        registerWindowTo={registerWindow.to}
      />
    </div>
  )
}
