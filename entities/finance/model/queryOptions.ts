import { queryOptions } from '@tanstack/react-query'
import { listAssetSnapshots, listFinanceAccounts, listFinanceCategories, listMonthlyClosings } from '../api'
import { financeKeys } from './queryKeys'
import type { AssetSnapshot, FinanceAccount, FinanceCategory, MonthlyClosing } from './types'

export function assetSnapshotListQueryOptions(token?: string) {
  return queryOptions<AssetSnapshot[]>({
    queryKey: financeKeys.assetSnapshots(),
    queryFn: () => listAssetSnapshots(token),
  })
}

export function financeCategoryListQueryOptions(token?: string) {
  return queryOptions<FinanceCategory[]>({
    queryKey: financeKeys.categories(),
    queryFn: () => listFinanceCategories(token),
  })
}

export function financeAccountListQueryOptions(token?: string) {
  return queryOptions<FinanceAccount[]>({
    queryKey: financeKeys.accounts(),
    queryFn: () => listFinanceAccounts(token),
  })
}

export function monthlyClosingListQueryOptions(token?: string) {
  return queryOptions<MonthlyClosing[]>({
    queryKey: financeKeys.monthlyClosings(),
    queryFn: () => listMonthlyClosings(token),
  })
}
