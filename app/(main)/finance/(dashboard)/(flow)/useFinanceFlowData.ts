'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  autoAdjustedMonth,
  buildCategoryIndex,
  displayWindow,
  previousYearRange,
  registerWindowUpperBound,
  useFinanceBudgetsQuery,
  useFinanceCategoriesQuery,
  useFinanceTransactionsQuery,
  yearsRange,
} from '@entities/finance'
import type { Period } from '@entities/finance'
import { todayKst } from '@shared/lib/format'
import { useFinancePeriod } from '../FinancePeriodProvider'

// 수입/소비/저축 카테고리만 다룬다 — ASSET 인덱싱은 이 탭들과 무관해 좁은 타입으로 선언한다
// (구 FinanceDashboard의 FLOW_TYPE 주석과 동일한 이유).
export type FlowCategoryType = 'INCOME' | 'EXPENSE' | 'SAVING'

// 수입/소비/저축 3개 서브라우트가 공유하는 조회 상태 — 월/모드(Period)는 FinancePeriodProvider가
// (dashboard)/layout.tsx 레벨에서 들고 있어 탭(라우트) 전환 후에도 유지되고 새로고침엔 초기화된다.
// React Query 캐시가 전역이라 쿼리 결과는 동일 키로 자동 공유되므로 이어줘야 할 건 이 period뿐이다.
export function useFinanceFlowData(flowType: FlowCategoryType) {
  const { userMonth, mode, setPeriod } = useFinancePeriod()
  const today = todayKst()

  // 사용자가 아직 월을 직접 고르지 않았을 때(userMonth === null)의 자동 선택월 — "데이터 있는
  // 최근 월"을 프로바이더가 아닌 이 훅 로컬 상태로만 잡는다. 프로바이더 userMonth에 쓰면 그게
  // 사용자 선택과 구분되지 않아 재평가가 영구히 봉인된다(구 URL ?month= 방식의 버그). 로컬이라
  // 새로고침·탭 전환 시 다시 오늘 기준으로 판정되고, 그 사이 최근 월에 데이터가 생기면 그 달을 본다.
  const [autoMonth, setAutoMonth] = useState<string | null>(null)
  const period = useMemo<Period>(
    () => ({ month: userMonth ?? autoMonth ?? today.slice(0, 7), mode }),
    [userMonth, autoMonth, mode, today],
  )

  const flowWindow = useMemo(() => displayWindow(period, today), [period, today])
  // FinanceRecordList에 넘기는 registerWindow(내역 등록)는 "오늘 기준" 독립 창이다 —
  // flowWindow(조회 중인 기간)에 묶으면 과거 달을 보는 중엔 오늘 날짜조차 등록할 수
  // 없어진다. 상한 계산은 FinanceHeader.tsx(등록 버튼)와 동일해 entities/finance의
  // registerWindowUpperBound로 공유한다.
  const registerWindow = useMemo(() => ({ from: undefined, to: registerWindowUpperBound(today) }), [today])

  const {
    data: transactions = [],
    isLoading: isTransactionsLoading,
    isError: isTransactionsError,
  } = useFinanceTransactionsQuery(flowWindow.from, flowWindow.to)

  // 자산탭(최근 기록월 기본값)과의 일관성 — 사용자가 월을 직접 안 골랐고(userMonth === null)
  // 현재 선택월에 거래가 없으면, 조회된 12개월 윈도우에서 가장 최근 기록 월로 옮긴다(autoMonth
  // 로컬 상태로만). autoMonth 반영 후 그 달엔 거래가 있어 autoAdjustedMonth가 null을 돌려 안정된다.
  useEffect(() => {
    if (isTransactionsLoading || userMonth !== null || period.mode !== 'monthly') return
    const adjusted = autoAdjustedMonth(
      period.month,
      transactions.map((transaction) => transaction.transactionDate),
    )
    if (adjusted) setAutoMonth(adjusted)
  }, [isTransactionsLoading, userMonth, period.mode, period.month, transactions])

  const previousYearWindow = useMemo(() => previousYearRange(period, today), [period, today])
  const { data: previousYearTransactions = [], isLoading: isPreviousYearLoading } = useFinanceTransactionsQuery(
    previousYearWindow.from,
    previousYearWindow.to,
    { enabled: period.mode === 'yearly' },
  )

  const yearlyTrendWindow = useMemo(() => yearsRange(period.month, 6, today), [period.month, today])
  const { data: yearlyTrendTransactions = [], isLoading: isYearlyTrendLoading } = useFinanceTransactionsQuery(
    yearlyTrendWindow.from,
    yearlyTrendWindow.to,
    { enabled: period.mode === 'yearly' },
  )

  const { data: incomeCategories = [], isLoading: isIncomeCategoriesLoading } = useFinanceCategoriesQuery('INCOME')
  const { data: expenseCategories = [], isLoading: isExpenseCategoriesLoading } = useFinanceCategoriesQuery('EXPENSE')
  const { data: savingCategories = [], isLoading: isSavingCategoriesLoading } = useFinanceCategoriesQuery('SAVING')
  const { data: budgets = [] } = useFinanceBudgetsQuery()

  const isFlowLoading =
    isTransactionsLoading ||
    isIncomeCategoriesLoading ||
    isExpenseCategoriesLoading ||
    isSavingCategoriesLoading ||
    (period.mode === 'yearly' && (isPreviousYearLoading || isYearlyTrendLoading))

  const categoryIndex = useMemo(
    () => buildCategoryIndex({ INCOME: incomeCategories, EXPENSE: expenseCategories, SAVING: savingCategories }),
    [incomeCategories, expenseCategories, savingCategories],
  )
  const categoryTreeByType: Record<FlowCategoryType, typeof incomeCategories> = {
    INCOME: incomeCategories,
    EXPENSE: expenseCategories,
    SAVING: savingCategories,
  }

  return {
    period,
    setPeriod,
    today,
    transactions,
    previousYearTransactions,
    yearlyTrendTransactions,
    categoryIndex,
    categoryTree: categoryTreeByType[flowType],
    budgets,
    isFlowLoading,
    isTransactionsError,
    registerWindow,
  }
}
