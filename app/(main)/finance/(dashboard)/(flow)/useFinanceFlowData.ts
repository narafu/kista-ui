'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
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

// 수입/소비/저축 카테고리만 다룬다 — ASSET 인덱싱은 이 탭들과 무관해 좁은 타입으로 선언한다
// (구 FinanceDashboard의 FLOW_TYPE 주석과 동일한 이유).
type FlowCategoryType = 'INCOME' | 'EXPENSE' | 'SAVING'

function parsePeriod(searchParams: URLSearchParams, today: string): Period {
  const month = searchParams.get('month')
  const mode = searchParams.get('mode')
  return {
    month: month ?? today.slice(0, 7),
    mode: mode === 'yearly' ? 'yearly' : 'monthly',
  }
}

// 수입/소비/저축 3개 서브라우트가 공유하는 조회 상태 — period를 URL 쿼리(?month=&mode=)에
// 실어 탭(라우트) 전환 후에도 조회 중이던 월/모드가 유지되게 한다. React Query 캐시가
// 전역이라 쿼리 결과 자체는 동일 키로 자동 공유되므로, 페이지 간 이어줘야 할 건 이 period뿐이다.
export function useFinanceFlowData(flowType: FlowCategoryType) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const today = todayKst()
  const period = useMemo(() => parsePeriod(searchParams, today), [searchParams, today])

  const setPeriod = (next: Period) => {
    const params = new URLSearchParams()
    params.set('month', next.month)
    if (next.mode === 'yearly') params.set('mode', 'yearly')
    // replace — push를 쓰면 월/연간 드롭다운을 조작할 때마다 히스토리 엔트리가 쌓여
    // 뒤로가기가 페이지 이탈이 아니라 직전 조회 기간으로만 계속 되돌아간다.
    router.replace(`${pathname}?${params.toString()}`)
  }

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

  // 자산탭(최근 기록월 기본값)과의 일관성 — URL에 ?month=가 없는 최초 진입(오늘 달 기본값)에
  // 아직 등록된 거래가 없으면, 조회된 12개월 윈도우 안에서 가장 최근 기록이 있는 달로 최초
  // 1회만 이동한다. 사용자가 이미 ?month=로 특정 월을 지정했거나 직접 고른 뒤에는 건드리지 않는다.
  const [monthAutoAdjusted, setMonthAutoAdjusted] = useState(false)
  useEffect(() => {
    if (monthAutoAdjusted || isTransactionsLoading) return
    setMonthAutoAdjusted(true)
    if (searchParams.get('month') || period.mode !== 'monthly') return
    if (transactions.some((transaction) => transaction.transactionDate.startsWith(period.month))) return
    const latestMonth = transactions.map((transaction) => transaction.transactionDate.slice(0, 7)).sort().at(-1)
    if (latestMonth && latestMonth !== period.month) setPeriod({ ...period, month: latestMonth })
  }, [monthAutoAdjusted, isTransactionsLoading, transactions, period, searchParams])

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
