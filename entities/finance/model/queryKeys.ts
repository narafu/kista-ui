import type { FinanceCategoryType } from './types'

// groupId 미지정 = 개인 그룹. undefined와 개인 그룹 UUID가 같은 캐시 항목을 가리키도록
// 'personal' 센티널로 정규화한다 — 그룹 전환기가 개인 그룹 선택 시 쿠키를 지우는 것과 대칭.
function groupSegment(groupId?: string) {
  return groupId ?? 'personal'
}

export const financeKeys = {
  all: ['finance'] as const,
  assetSnapshotsRoot: () => [...financeKeys.all, 'asset-snapshots'] as const,
  assetSnapshots: (groupId?: string) => [...financeKeys.assetSnapshotsRoot(), groupSegment(groupId), 'list'] as const,
  categoriesRoot: () => [...financeKeys.all, 'categories'] as const,
  categories: (type: FinanceCategoryType, groupId?: string) =>
    [...financeKeys.categoriesRoot(), type, groupSegment(groupId), 'list'] as const,
  // 관리자 시스템 카테고리 — groupId가 없는 별도 네임스페이스라 groupSegment()를 재사용하지 않는다.
  systemCategoriesRoot: () => [...financeKeys.all, 'system-categories'] as const,
  systemCategories: (type: FinanceCategoryType) => [...financeKeys.systemCategoriesRoot(), type, 'list'] as const,
  accountsRoot: () => [...financeKeys.all, 'accounts'] as const,
  accounts: (groupId?: string) => [...financeKeys.accountsRoot(), groupSegment(groupId), 'list'] as const,
  monthlyClosingsRoot: () => [...financeKeys.all, 'monthly-closings'] as const,
  monthlyClosings: (groupId?: string) => [...financeKeys.monthlyClosingsRoot(), groupSegment(groupId), 'list'] as const,
  groups: () => [...financeKeys.all, 'groups', 'list'] as const,
  groupMembers: (groupId: string) => [...financeKeys.all, 'groups', groupId, 'members'] as const,
}
