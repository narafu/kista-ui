export type { AssetClass, FinanceAccountType, FinanceCategoryType, Market } from '@shared/lib/api-schema'
import type { AssetClass, FinanceAccountType, FinanceCategoryType, Market } from '@shared/lib/api-schema'

export interface AssetSnapshot {
  id: string
  // null이면 개인 소유(본인만 조회) — 값이 있으면 그룹 공유. 공유 버튼 노출 판정에 쓴다.
  groupId?: string
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
  // null이면 개인 소유(본인만 조회) — 값이 있으면 그룹 공유. 공유 버튼 노출 판정에 쓴다.
  groupId?: string
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

export interface FinanceCategoryRequest {
  parentId?: string
  type: FinanceCategoryType
  name: string
  sortOrder: number
}

export interface FinanceAccountRequest {
  accountType: FinanceAccountType
  name: string
  accountNo?: string
  memo?: string
}

export interface FinanceGroup {
  id: string
}

// nickname은 kista-api FinanceGroupMemberResponse에 아직 없다(userId/role만 응답) —
// 후속으로 서버가 필드를 추가하면 이 옵셔널 필드가 UI 변경 없이 채워진다.
export interface FinanceGroupMember {
  userId: string
  role: string
  nickname?: string
}

export interface FinanceGroupInvitation {
  code: string
  expiresAt: string
}

export interface FinanceTransaction {
  id: string
  categoryId: string
  // null이면 개인 소유(본인만 조회) — 값이 있으면 그룹 공유. 공유 버튼 노출 판정에 쓴다.
  groupId?: string
  transactionDate: string // 'YYYY-MM-DD'
  amount: number
  memo?: string
}

export interface FinanceTransactionRequest {
  categoryId: string
  transactionDate: string
  amount: number
  memo?: string
}

export interface FinanceBudget {
  id: string
  categoryId: string
  // null이면 개인 소유(본인만 조회) — 값이 있으면 그룹 공유. 공유 버튼 노출 판정에 쓴다.
  groupId?: string
  applyStartDate: string // 'YYYY-MM-DD'
  applyEndDate?: string // 무기한이면 undefined
  amount: number // 월 할당 예산
}

export interface FinanceBudgetRequest {
  categoryId: string
  applyStartDate: string
  applyEndDate?: string
  amount: number
}
