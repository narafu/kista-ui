import { queryOptions } from '@tanstack/react-query'
import {
  listAssetSnapshots,
  listFinanceAccounts,
  listFinanceBudgets,
  listFinanceCategories,
  listFinanceGroups,
  listFinanceTransactions,
  listMonthlyClosings,
} from '../api'
import { financeKeys } from './queryKeys'
import type {
  AssetSnapshot,
  FinanceAccount,
  FinanceBudget,
  FinanceCategory,
  FinanceCategoryType,
  FinanceGroup,
  FinanceTransaction,
  MonthlyClosing,
} from './types'

export function assetSnapshotListQueryOptions(groupId?: string, token?: string) {
  return queryOptions<AssetSnapshot[]>({
    queryKey: financeKeys.assetSnapshots(groupId),
    queryFn: () => listAssetSnapshots({ groupId, token }),
  })
}

export function financeCategoryListQueryOptions(type: FinanceCategoryType, groupId?: string, token?: string) {
  return queryOptions<FinanceCategory[]>({
    queryKey: financeKeys.categories(type, groupId),
    queryFn: () => listFinanceCategories(type, { groupId, token }),
  })
}

export function financeAccountListQueryOptions(groupId?: string, token?: string) {
  return queryOptions<FinanceAccount[]>({
    queryKey: financeKeys.accounts(groupId),
    queryFn: () => listFinanceAccounts({ groupId, token }),
  })
}

export function monthlyClosingListQueryOptions(groupId?: string, token?: string) {
  return queryOptions<MonthlyClosing[]>({
    queryKey: financeKeys.monthlyClosings(groupId),
    queryFn: () => listMonthlyClosings({ groupId, token }),
  })
}

export function financeGroupListQueryOptions(token?: string) {
  return queryOptions<FinanceGroup[]>({
    queryKey: financeKeys.groups(),
    queryFn: () => listFinanceGroups(token),
  })
}

// from/to는 lib/period.ts의 windowRange(month)가 계산한 12개월 윈도우 — 요약·추이·예산대비를
// 이 하나의 쿼리로 전부 클라이언트 필터링한다(설계 근거는 docs/agents/entities.md finance 항목 참고).
export function transactionListQueryOptions(groupId: string | undefined, from: string, to: string, token?: string) {
  return queryOptions<FinanceTransaction[]>({
    queryKey: financeKeys.transactions(groupId, from, to),
    queryFn: () => listFinanceTransactions({ groupId, from, to, token }),
  })
}

// date 파라미터 없이 전체 로드 — 예산 행 수가 적고 월 이동마다 재조회할 이유가 없다.
// 월별 유효성 판정은 lib/flowAggregate.ts의 calcBudgetProgress가 클라이언트에서 한다.
export function budgetListQueryOptions(groupId?: string, token?: string) {
  return queryOptions<FinanceBudget[]>({
    queryKey: financeKeys.budgets(groupId),
    queryFn: () => listFinanceBudgets({ groupId, token }),
  })
}
