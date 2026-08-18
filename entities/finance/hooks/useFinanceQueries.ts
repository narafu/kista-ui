'use client'

import { useQuery } from '@tanstack/react-query'
import {
  assetSnapshotListQueryOptions,
  financeAccountListQueryOptions,
  financeCategoryListQueryOptions,
  monthlyClosingListQueryOptions,
} from '../model/queryOptions'

export function useAssetSnapshotsQuery() {
  return useQuery(assetSnapshotListQueryOptions())
}

export function useFinanceCategoriesQuery() {
  return useQuery(financeCategoryListQueryOptions())
}

export function useFinanceAccountsQuery() {
  return useQuery(financeAccountListQueryOptions())
}

export function useMonthlyClosingsQuery() {
  return useQuery(monthlyClosingListQueryOptions())
}
