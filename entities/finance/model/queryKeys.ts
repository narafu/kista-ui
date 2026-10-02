import type { FinanceCategoryType } from './types'

// 목록 키에 그룹 세그먼트가 없다 — kista-api가 그룹 스코프를 호출자의 실제 소속(1인 1그룹)으로
// 판정해 클라이언트가 그룹을 고를 수 없다. 소속이 바뀌면(초대 수락·탈퇴·추방) financeKeys.all을
// 무효화해 새 스코프로 재조회한다.
export const financeKeys = {
  all: ['finance'] as const,
  assetSnapshotsRoot: () => [...financeKeys.all, 'asset-snapshots'] as const,
  assetSnapshots: () => [...financeKeys.assetSnapshotsRoot(), 'list'] as const,
  categoriesRoot: () => [...financeKeys.all, 'categories'] as const,
  categories: (type: FinanceCategoryType) => [...financeKeys.categoriesRoot(), type, 'list'] as const,
  // 관리자 시스템 카테고리 — 그룹과 무관한 별도 네임스페이스.
  systemCategoriesRoot: () => [...financeKeys.all, 'system-categories'] as const,
  systemCategories: (type: FinanceCategoryType) => [...financeKeys.systemCategoriesRoot(), type, 'list'] as const,
  accountsRoot: () => [...financeKeys.all, 'accounts'] as const,
  accounts: () => [...financeKeys.accountsRoot(), 'list'] as const,
  monthlyClosingsRoot: () => [...financeKeys.all, 'monthly-closings'] as const,
  monthlyClosings: () => [...financeKeys.monthlyClosingsRoot(), 'list'] as const,
  groups: () => [...financeKeys.all, 'groups', 'list'] as const,
  groupMembers: (groupId: string) => [...financeKeys.all, 'groups', groupId, 'members'] as const,
  // from/to는 12개월 윈도우 시작·끝('YYYY-MM-DD') — lib/period.ts의 windowRange(month)가 계산한다.
  // 월을 옮길 때마다 새 키로 재조회되지만 gcTime(10분) 안이면 캐시 히트다.
  transactionsRoot: () => [...financeKeys.all, 'transactions'] as const,
  transactions: (from: string | undefined, to: string) => [...financeKeys.transactionsRoot(), from, to, 'list'] as const,
  budgetsRoot: () => [...financeKeys.all, 'budgets'] as const,
  budgets: () => [...financeKeys.budgetsRoot(), 'list'] as const,
}
