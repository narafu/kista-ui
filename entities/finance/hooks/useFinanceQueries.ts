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

export function useAssetSnapshotsQuery() {
  return useQuery(assetSnapshotListQueryOptions())
}

export function useFinanceCategoriesQuery(type: FinanceCategoryType) {
  return useQuery(financeCategoryListQueryOptions(type))
}

export function useFinanceAccountsQuery() {
  return useQuery(financeAccountListQueryOptions())
}

export function useMonthlyClosingsQuery() {
  return useQuery(monthlyClosingListQueryOptions())
}

// from/to는 lib/period.ts의 windowRange(month) — 수입/소비/저축 탭이 공유하는 12개월 윈도우.
// enabled: 연간 모드 전년대비 쿼리처럼 조건부로만 실행해야 하는 호출부를 위한 옵션(기본 true).
export function useFinanceTransactionsQuery(from: string | undefined, to: string, options?: { enabled?: boolean }) {
  return useQuery({ ...transactionListQueryOptions(from, to), enabled: options?.enabled ?? true })
}

export function useFinanceBudgetsQuery() {
  return useQuery(budgetListQueryOptions())
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

// 월 마감 판정 스코프. kista-api는 마감 조회·저장·쓰기 가드(MonthlyClosingGuard) 전부를 실제 그룹
// 소속(findCurrentGroupId)으로 판정한다 — 1인 1그룹이라 소속 그룹 = groups[0]. 마감 목록은 개인 행과
// 그룹 행이 섞여 오므로 이 값으로 행을 고른다. 클라이언트가 그룹 스코프를 아는 유일한 지점이다.
// 그룹 목록 로딩 전에는 undefined(개인 스코프)라 호출부가 필요하면 isLoading으로 게이팅한다.
export function useMonthlyClosingScopeGroupId(): string | undefined {
  return useFinanceGroupsQuery().data?.[0]?.id
}

export function useFinanceGroupMembersQuery(groupId: string) {
  return useQuery({
    queryKey: financeKeys.groupMembers(groupId),
    queryFn: () => listFinanceGroupMembers(groupId),
  })
}

// 관리자 시스템 카테고리 — 그룹과 무관한 별도 키.
export function useSystemFinanceCategoriesQuery(type: FinanceCategoryType) {
  return useQuery({
    queryKey: financeKeys.systemCategories(type),
    queryFn: () => listSystemFinanceCategories(type),
  })
}
