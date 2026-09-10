'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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

// 수입/소비/저축 카테고리만 다룬다 — ASSET 인덱싱은 이 탭들과 무관해 좁은 타입으로 선언한다
// (구 FinanceDashboard의 FLOW_TYPE 주석과 동일한 이유).
export type FlowCategoryType = 'INCOME' | 'EXPENSE' | 'SAVING'

function parsePeriod(searchParams: URLSearchParams, today: string): Period {
  const month = searchParams.get('month')
  const mode = searchParams.get('mode')
  return {
    // 빈 문자열(?month=)도 오늘 달로 폴백 — shiftMonth('')가 NaN 날짜를 만드는 걸 막는다
    month: month || today.slice(0, 7),
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
  const monthParam = searchParams.get('month')

  // URL에 ?month=가 없는 동안에만 유효한 자동 선택월 — "데이터 있는 최근 월"을 URL에 쓰지 않고
  // 로컬 상태로만 잡는다. 그래야 새로고침(마운트)할 때마다 오늘 기준으로 다시 판정하고, 그 사이
  // 최근 월에 데이터가 생기면 그 달을 보여준다. 이 값을 URL에 쓰면 그게 "사용자가 고른 월"과
  // 구분되지 않아 재평가가 영구히 봉인됐던 게 기존 버그다. 사용자가 월/모드를 직접 고르면
  // setPeriod가 ?month=를 써서 아래 auto-adjust가 멈추고 period가 URL을 그대로 따른다.
  const [autoMonth, setAutoMonth] = useState<string | null>(null)
  const period = useMemo<Period>(() => {
    const urlPeriod = parsePeriod(searchParams, today)
    return monthParam || !autoMonth ? urlPeriod : { ...urlPeriod, month: autoMonth }
  }, [searchParams, today, monthParam, autoMonth])

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

  // 자산탭(최근 기록월 기본값)과의 일관성 — URL에 ?month=가 없고 현재 선택월에 거래가 없으면,
  // 조회된 12개월 윈도우 안에서 가장 최근 기록이 있는 달로 옮긴다(autoMonth 로컬 상태로만).
  // autoMonth 반영 후 그 달엔 거래가 있으므로 autoAdjustedMonth가 null을 돌려 effect가 안정된다.
  useEffect(() => {
    if (isTransactionsLoading || monthParam || period.mode !== 'monthly') return
    const adjusted = autoAdjustedMonth(
      period.month,
      transactions.map((transaction) => transaction.transactionDate),
    )
    if (adjusted) setAutoMonth(adjusted)
  }, [isTransactionsLoading, monthParam, period.mode, period.month, transactions])

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
