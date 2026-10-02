import { calcFlowSummary, elapsedMonthsInYear, filterByType, monthEndDate, periodRange, previousYearRange } from '@entities/finance'
import type { CategoryIndex, FinanceCategoryType, FinanceTransaction, Period } from '@entities/finance'

export function sumInRange(transactions: FinanceTransaction[], from: string, to: string): number {
  return transactions
    .filter((t) => t.transactionDate >= from && t.transactionDate <= to)
    .reduce((sum, t) => sum + t.amount, 0)
}

export function calcPreviousYearTotal(
  period: Period,
  previousYearTransactions: FinanceTransaction[] | undefined,
  index: CategoryIndex,
  type: FinanceCategoryType,
  today: string,
): number | null {
  if (period.mode !== 'yearly' || !previousYearTransactions) return null
  const { from, to } = previousYearRange(period, today)
  return sumInRange(filterByType(previousYearTransactions, index, type), from, to)
}

// 올해 월평균 — 월간/연간 탭 상관없이 항상 노출. 선택 월이 속한 연도의 YTD(또는 종료 연도면
// 연간 전체) 합계를 periodRange로 구해 elapsedMonthsInYear로 나눈다. 월간 모드의 typeTransactions는
// windowRange(선택 월 기준 trailing 12개월)라 선택 연도 1월~선택 월 구간만 보장된다 — today를 그대로
// 쓰면 실제 조회 안 된 선택월 이후 구간(과거 월 선택 시)까지 합계·분모에 걸쳐 있다고 가정해
// 과소집계된다. 그래서 월간 모드에선 today 대신 선택 월 말일을 기준일로 대체해 periodRange·
// elapsedMonthsInYear 둘 다 "선택 월까지"로 일관되게 계산한다(연간 모드는 today 그대로 — 이미
// 조회 윈도우 자체가 periodRange(period, today)와 동일해 일관됨).
export function calcYearlyAverage(typeTransactions: FinanceTransaction[], mode: Period['mode'], month: string, today: string): number {
  const year = month.slice(0, 4)
  const refDate = mode === 'monthly' ? monthEndDate(month) : today
  const yearRange = periodRange({ month: `${year}-01`, mode: 'yearly' }, refDate)
  const yearTotal = sumInRange(typeTransactions, yearRange.from, yearRange.to)
  return Math.round(yearTotal / elapsedMonthsInYear(month, refDate))
}

// 남은 금액(INCOME 탭 전용) = 수입 - 소비 - 저축. unfiltered transactions+index에서
// EXPENSE/SAVING 합계를 뽑아낸다(별도 쿼리 없이 계산).
export function calcRemainingAmount(
  type: FinanceCategoryType,
  transactions: FinanceTransaction[],
  index: CategoryIndex,
  period: Period,
  today: string,
  total: number,
): number | null {
  if (type !== 'INCOME') return null
  const flowTotal = (t: FinanceCategoryType) => calcFlowSummary(filterByType(transactions, index, t), period, today).total
  return total - flowTotal('EXPENSE') - flowTotal('SAVING')
}
