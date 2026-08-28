'use client'

import { FinanceSummary } from '@widgets/finance-summary'
import { FinanceBudgetProgress } from '@widgets/finance-budget-progress'
import { FinanceTrend } from '@widgets/finance-trend'
import { FinanceRecordList } from '@widgets/finance-record-list'
import { useFinanceFlowData } from '../useFinanceFlowData'

export default function FinanceExpensePage() {
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
  } = useFinanceFlowData('EXPENSE')

  return (
    <div className="space-y-6">
      <FinanceSummary
        type="EXPENSE"
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
        type="EXPENSE"
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
        type="EXPENSE"
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
        type="EXPENSE"
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
