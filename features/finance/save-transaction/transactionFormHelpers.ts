import { isMonthClosed } from '@entities/finance'
import type { FinanceTransaction } from '@entities/finance'

export function clampDate(date: string, min?: string, max?: string): string {
  if (min && date < min) return min
  if (max && date > max) return max
  return date
}

export function initialTransactionDate(
  initial: FinanceTransaction | undefined,
  duplicateFrom: Pick<FinanceTransaction, 'transactionDate'> | undefined,
  today: string,
  windowFrom?: string,
  windowTo?: string,
): string {
  return clampDate(initial?.transactionDate ?? duplicateFrom?.transactionDate ?? today, windowFrom, windowTo)
}

// 날짜가 기록 점검 완료(마감)된 달이면 서버가 등록·수정을 409로 거부한다 — 제출 전에 막는다.
// 수정은 새 날짜뿐 아니라 원본 날짜의 달도 잠겨 있으면 거부되므로(서버 가드와 동일) 둘 다 검사한다.
export function isTransactionLocked(
  closings: Parameters<typeof isMonthClosed>[0],
  scopeGroupId: Parameters<typeof isMonthClosed>[2],
  transactionDate: string,
  initial: FinanceTransaction | undefined,
): boolean {
  if (isMonthClosed(closings, transactionDate.slice(0, 7), scopeGroupId)) return true
  return initial ? isMonthClosed(closings, initial.transactionDate.slice(0, 7), scopeGroupId) : false
}

export function isDateInWindow(date: string, windowFrom?: string, windowTo?: string): boolean {
  return (!windowFrom || date >= windowFrom) && (!windowTo || date <= windowTo)
}
