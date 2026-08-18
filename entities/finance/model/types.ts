export type { AssetClass, FinanceAccountType, FinanceCategoryType, Market } from '@shared/lib/api-schema'
import type { AssetClass, FinanceAccountType, FinanceCategoryType, Market } from '@shared/lib/api-schema'

export interface AssetSnapshot {
  id: string
  categoryId: string
  rootCategoryId: string
  categoryName: string
  accountId?: string
  accountName?: string
  entryDate: string // 'YYYY-MM-DD'
  assetClass: AssetClass
  market: Market
  strategy?: string
  amount: number
}

export interface AssetSnapshotRequest {
  categoryId: string
  accountId?: string
  entryDate: string
  assetClass: AssetClass
  market: Market
  strategy?: string
  amount: number
}

export interface FinanceCategory {
  id: string
  groupId?: string
  parentId?: string
  type: FinanceCategoryType
  name: string
  sortOrder: number
  system: boolean
  children: FinanceCategory[]
}

export interface FinanceAccount {
  id: string
  accountType: FinanceAccountType
  name: string
  accountNo?: string
  memo?: string
}

export interface MonthlyClosing {
  month: string // 'YYYY-MM'
  completed: boolean
  closedAt?: string
}
