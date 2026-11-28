import type { CategoryIndex } from './categoryIndex'
import type { FinanceCategoryType, FinanceTransaction } from '../model/types'

// 수입/소비/저축 거래 원본의 탭 분류 — 집계(요약·추이·예산 대비)는 서버가 하고, 이 둘은 내역 리스트
// (FinanceRecordList)가 원본 목록을 탭별로 나누는 데만 쓴다.

// 카테고리가 삭제돼 인덱스에서 조회되지 않는 거래는 어느 탭에도 속하지 않는다 —
// unclassifiedTransactions()로 별도 집계해 "분류할 수 없는 내역"으로 노출한다.
export function filterByType(transactions: FinanceTransaction[], index: CategoryIndex, type: FinanceCategoryType): FinanceTransaction[] {
  return transactions.filter((t) => index.get(t.categoryId)?.type === type)
}

export function unclassifiedTransactions(transactions: FinanceTransaction[], index: CategoryIndex): FinanceTransaction[] {
  return transactions.filter((t) => !index.has(t.categoryId))
}
