'use client'

import { useMemo, useState } from 'react'
import {
  autoAdjustedMonth,
  buildCategoryIndex,
  monthEndDate,
  monthStartDate,
  registerWindowUpperBound,
  shiftMonth,
  useFinanceCategoriesQuery,
  useLatestTransactionDateQuery,
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
// 요약·추이·예산 대비 집계와 내역 리스트(커서 페이지)는 각 위젯이 서버 쿼리로 직접 받는다 — 여기는
// 카테고리 트리(색·이름·필터)와 기간 상태만 소유한다.
export function useFinanceFlowData(flowType: FlowCategoryType) {
  const { userMonth, mode, setPeriod, trendMonths, trendYears, setTrendMonths, setTrendYears } = useFinancePeriod()
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

  // FinanceRecordList에 넘기는 registerWindow(내역 등록)는 "오늘 기준" 독립 창이다 —
  // flowWindow(조회 중인 기간)에 묶으면 과거 달을 보는 중엔 오늘 날짜조차 등록할 수
  // 없어진다. 상한 계산은 FinanceHeader.tsx(등록 버튼)와 동일해 entities/finance의
  // registerWindowUpperBound로 공유한다.
  const registerWindow = useMemo(() => ({ from: undefined, to: registerWindowUpperBound(today) }), [today])

  // 자산탭(최근 기록월 기본값)과의 일관성 — 사용자가 월을 직접 안 골랐고(userMonth === null)
  // 현재 선택월에 거래가 없으면, 오늘 기준 12개월 안의 가장 최근 거래 월로 옮긴다(autoMonth 로컬 상태로만).
  // 조회 범위를 period.month가 아닌 오늘 기준으로 잡는다 — autoMonth 반영 뒤 키가 바뀌어 재조회되는 일이 없다
  // (autoMonth 확정 전 period.month는 오늘 달이라 같은 12개월 창이다). 최신 거래 1건만 받는다.
  // effect가 아니라 렌더 중 상태 조정으로 반영한다 — React가 자식을 그리기 전에 다시 렌더하므로 집계 위젯이
  // 보정 전 달(오늘 달)로 한 번 조회하는 일이 없다. autoMonth 반영 후 그 달엔 거래가 있어 autoAdjustedMonth가
  // null을 돌려 안정된다.
  const todayMonth = today.slice(0, 7)
  // autoMonth가 한 번 정해지면 재평가하지 않는다 — 보는 중에 새 거래가 등록돼 latest가 바뀌어도 화면이 다른 달로 튀지 않는다.
  const autoAdjustEnabled = userMonth === null && mode === 'monthly' && autoMonth === null
  const latestQuery = useLatestTransactionDateQuery({
    from: monthStartDate(shiftMonth(todayMonth, -11)),
    to: monthEndDate(todayMonth),
    enabled: autoAdjustEnabled,
  })
  const adjustedMonth =
    autoAdjustEnabled && !latestQuery.isLoading
      ? autoAdjustedMonth(period.month, latestQuery.data ? [latestQuery.data] : [])
      : null
  if (adjustedMonth !== null) setAutoMonth(adjustedMonth)

  // 추이 차트 기간 — 월간은 개월 수, 연간은 년 수. 조회는 FinanceTrend가 서버 추이 쿼리로 한다.
  const trendRange = period.mode === 'yearly' ? trendYears : trendMonths
  const setTrendRange = period.mode === 'yearly' ? setTrendYears : setTrendMonths

  const incomeCategoriesQuery = useFinanceCategoriesQuery('INCOME')
  const expenseCategoriesQuery = useFinanceCategoriesQuery('EXPENSE')
  const savingCategoriesQuery = useFinanceCategoriesQuery('SAVING')
  const incomeCategories = useMemo(() => incomeCategoriesQuery.data ?? [], [incomeCategoriesQuery.data])
  const expenseCategories = useMemo(() => expenseCategoriesQuery.data ?? [], [expenseCategoriesQuery.data])
  const savingCategories = useMemo(() => savingCategoriesQuery.data ?? [], [savingCategoriesQuery.data])

  // 위젯은 기본값([])이 채워진 배열만 받아 "미수신"과 "빈 목록"을 구분할 수 없다 — 여기서 데이터 유무로 판정한다.
  // 재조회 실패는 이미 받은 데이터를 덮지 않도록, 데이터가 없을 때만 오류로 본다.
  const loadFailed = (query: { isError: boolean; data?: unknown }) => query.isError && !query.data
  const categoryQueries = [incomeCategoriesQuery, expenseCategoriesQuery, savingCategoriesQuery]
  // 카테고리 조회가 실패하면 거래가 카테고리 인덱스에 매칭되지 않아 "내역 없음"으로 보인다 — 실패로 묶어 오류를 띄운다.
  // 예산 대비·추이 위젯도 카테고리 트리로 색·이름을 그리므로 카테고리 로딩·실패를 함께 받는다.
  const isCategoriesError = categoryQueries.some(loadFailed)
  const isCategoriesLoading = categoryQueries.some((query) => query.isLoading)
  // 거래 목록의 로딩·실패는 FinanceRecordList가 직접 조회해 판정한다 — 여기는 카테고리만 본다.
  const isFlowError = isCategoriesError
  const isFlowLoading = isCategoriesLoading
  // 자동 월 보정 판정 전(사용자 미선택 월간 모드에서 최신 거래 조회 중)엔 기간이 확정되지 않았다 — 집계 위젯이
  // 오늘 달로 먼저 조회했다가 보정된 달로 다시 조회하며 "내역 없음"을 잠깐 그리지 않도록 로딩으로 묶는다.
  // 로딩이 끝난 렌더에서 보정이 필요하면 위의 렌더 중 setAutoMonth가 자식 렌더 전에 다시 그리므로 여기선 로딩만 본다.
  const isPeriodPending = userMonth === null && autoMonth === null && period.mode === 'monthly' && (latestQuery.isLoading || adjustedMonth !== null)

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
    trendRange,
    setTrendRange,
    categoryIndex,
    categoryTree: categoryTreeByType[flowType],
    isCategoriesLoading,
    isCategoriesError,
    isPeriodPending,
    isFlowLoading,
    isFlowError,
    registerWindow,
  }
}
