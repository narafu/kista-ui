export type { AssetCategory } from '@shared/lib/api-schema'
import type { AssetCategory } from '@shared/lib/api-schema'

export interface Asset {
  id: string
  entryDate: string // 'YYYY-MM-DD'
  category: AssetCategory
  subcategory: string
  institution?: string
  assetClass: string
  strategy?: string
  amount: number
}

export interface AssetRequest {
  entryDate: string
  category: AssetCategory
  subcategory: string
  institution?: string
  assetClass: string
  strategy?: string
  amount: number
}

export interface AssetMonthlyCheck {
  month: string // 'YYYY-MM'
  completed: boolean
}
