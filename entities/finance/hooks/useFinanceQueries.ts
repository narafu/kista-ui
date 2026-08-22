'use client'

import { useQuery } from '@tanstack/react-query'
import {
  assetSnapshotListQueryOptions,
  budgetListQueryOptions,
  financeAccountListQueryOptions,
  financeCategoryListQueryOptions,
  financeGroupListQueryOptions,
  monthlyClosingListQueryOptions,
  transactionListQueryOptions,
} from '../model/queryOptions'
import { listFinanceGroupMembers, listSystemFinanceCategories } from '../api'
import { financeKeys } from '../model/queryKeys'
import type { FinanceCategoryType } from '../model/types'
import { useActiveGroupContext } from '../providers/ActiveGroupProvider'

// 저장된 활성 그룹이 더 이상 내 소속이 아니면(추방 등) 렌더 중 파생으로 개인 그룹 취급한다 —
// FinanceDashboard의 selectedMonth와 동일하게 useEffect 동기화 없이 순수 계산만 한다. 그룹
// 목록 로딩 전에는 저장된 값을 낙관적으로 신뢰하고, 로드 후 무효로 판명되면 다음 렌더부터 undefined.
export function useActiveGroupId(): string | undefined {
  const { groupId } = useActiveGroupContext()
  const { data: groups } = useFinanceGroupsQuery()
  if (!groupId) return undefined
  if (!groups) return groupId
  return groups.some((g) => g.id === groupId) ? groupId : undefined
}

export function useSetActiveGroupId(): (groupId: string | undefined) => void {
  return useActiveGroupContext().setGroupId
}

export function useAssetSnapshotsQuery() {
  const groupId = useActiveGroupId()
  return useQuery(assetSnapshotListQueryOptions(groupId))
}

export function useFinanceCategoriesQuery(type: FinanceCategoryType) {
  const groupId = useActiveGroupId()
  return useQuery(financeCategoryListQueryOptions(type, groupId))
}

export function useFinanceAccountsQuery() {
  const groupId = useActiveGroupId()
  return useQuery(financeAccountListQueryOptions(groupId))
}

export function useMonthlyClosingsQuery() {
  const groupId = useActiveGroupId()
  return useQuery(monthlyClosingListQueryOptions(groupId))
}

// from/to는 lib/period.ts의 windowRange(month) — 수입/소비/저축 탭이 공유하는 12개월 윈도우.
// enabled: 연간 모드 전년대비 쿼리처럼 조건부로만 실행해야 하는 호출부를 위한 옵션(기본 true).
export function useFinanceTransactionsQuery(from: string, to: string, options?: { enabled?: boolean }) {
  const groupId = useActiveGroupId()
  return useQuery({ ...transactionListQueryOptions(groupId, from, to), enabled: options?.enabled ?? true })
}

export function useFinanceBudgetsQuery() {
  const groupId = useActiveGroupId()
  return useQuery(budgetListQueryOptions(groupId))
}

export function useFinanceGroupsQuery() {
  return useQuery(financeGroupListQueryOptions())
}

// 그룹 소속이어야 개인 소유 거래내역/예산을 공유 전환할 수 있다 — 공유 버튼 게이팅을
// 호출부(FinanceRecordList/BudgetManager)마다 중복 계산하지 않고 여기서 한 번만 정의한다.
export function useCanShareToGroup(): boolean {
  const { data: groups } = useFinanceGroupsQuery()
  return (groups?.length ?? 0) > 0
}

export function useFinanceGroupMembersQuery(groupId: string) {
  return useQuery({
    queryKey: financeKeys.groupMembers(groupId),
    queryFn: () => listFinanceGroupMembers(groupId),
  })
}

// 관리자 시스템 카테고리 — groupId가 없어 useActiveGroupId()/useFinanceGroupsQuery()를 구독하지 않는다.
export function useSystemFinanceCategoriesQuery(type: FinanceCategoryType) {
  return useQuery({
    queryKey: financeKeys.systemCategories(type),
    queryFn: () => listSystemFinanceCategories(type),
  })
}
