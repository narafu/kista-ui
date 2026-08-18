import { queryOptions } from '@tanstack/react-query'
import { listAssetSnapshots, listFinanceAccounts, listFinanceCategories, listFinanceGroups, listMonthlyClosings } from '../api'
import { financeKeys } from './queryKeys'
import type { AssetSnapshot, FinanceAccount, FinanceCategory, FinanceCategoryType, FinanceGroup, MonthlyClosing } from './types'

export function assetSnapshotListQueryOptions(groupId?: string, token?: string) {
  return queryOptions<AssetSnapshot[]>({
    queryKey: financeKeys.assetSnapshots(groupId),
    queryFn: () => listAssetSnapshots(groupId, token),
  })
}

export function financeCategoryListQueryOptions(type: FinanceCategoryType, groupId?: string, token?: string) {
  return queryOptions<FinanceCategory[]>({
    queryKey: financeKeys.categories(type, groupId),
    queryFn: () => listFinanceCategories(type, groupId, token),
  })
}

export function financeAccountListQueryOptions(groupId?: string, token?: string) {
  return queryOptions<FinanceAccount[]>({
    queryKey: financeKeys.accounts(groupId),
    queryFn: () => listFinanceAccounts(groupId, token),
  })
}

export function monthlyClosingListQueryOptions(groupId?: string, token?: string) {
  return queryOptions<MonthlyClosing[]>({
    queryKey: financeKeys.monthlyClosings(groupId),
    queryFn: () => listMonthlyClosings(groupId, token),
  })
}

export function financeGroupListQueryOptions(token?: string) {
  return queryOptions<FinanceGroup[]>({
    queryKey: financeKeys.groups(),
    queryFn: () => listFinanceGroups(token),
  })
}
