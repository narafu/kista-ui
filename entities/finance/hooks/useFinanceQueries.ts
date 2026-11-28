'use client'

import { useQuery } from '@tanstack/react-query'
import {
  assetCheckQueryOptions,
  assetCompositionQueryOptions,
  assetSnapshotListQueryOptions,
  assetSummaryQueryOptions,
  assetTrendQueryOptions,
  budgetListQueryOptions,
  budgetProgressQueryOptions,
  bulkRegisterPreviewQueryOptions,
  financeAccountListQueryOptions,
  financeCategoryListQueryOptions,
  financeGroupListQueryOptions,
  flowSummaryQueryOptions,
  flowTrendQueryOptions,
  monthlyClosingListQueryOptions,
  transactionListQueryOptions,
} from '../model/queryOptions'
import { listFinanceGroupMembers, listSystemFinanceCategories } from '../api'
import { financeKeys } from '../model/queryKeys'
import type { AssetCompositionBasis, FinanceCategoryType } from '../model/types'
import type { Period, TrendRange } from '../lib/period'

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

// from/to는 조회 범위(from 생략 = 하한 없음). enabled: 조건부로만 실행해야 하는 호출부를 위한 옵션(기본 true).
export function useFinanceTransactionsQuery(from: string | undefined, to: string, options?: { enabled?: boolean }) {
  return useQuery({ ...transactionListQueryOptions(from, to), enabled: options?.enabled ?? true })
}

export function useFinanceBudgetsQuery() {
  return useQuery(budgetListQueryOptions())
}

export function useFinanceGroupsQuery({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({ ...financeGroupListQueryOptions(), enabled })
}

// 그룹 소속이어야 개인 소유 거래내역/예산을 공유 전환할 수 있다 — 공유 버튼 게이팅을
// 호출부(FinanceRecordList/BudgetManager)마다 중복 계산하지 않고 여기서 한 번만 정의한다.
// enabled=false면 그룹 목록을 조회하지 않고 false — 관리자 시스템 카테고리처럼 그룹 개념이 없는 화면용
export function useCanShareToGroup({ enabled = true }: { enabled?: boolean } = {}): boolean {
  const { data: groups } = useFinanceGroupsQuery({ enabled })
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

// ── 서버 집계 쿼리. 키는 전부 financeKeys.aggregatesRoot() 아래라 원본 mutation이 함께 무효화한다.
// 수입/소비/저축 집계의 enabled: 자동 월 보정이 끝나기 전(기간 미확정)에는 조회하지 않게 한다.
export function useAssetSummaryQuery(month?: string) {
  return useQuery(assetSummaryQueryOptions(month))
}

export function useAssetTrendQuery(range: TrendRange, endMonth?: string) {
  return useQuery(assetTrendQueryOptions(range, endMonth))
}

export function useAssetCompositionQuery(basis: AssetCompositionBasis, range: TrendRange, endMonth?: string) {
  return useQuery(assetCompositionQueryOptions(basis, range, endMonth))
}

export function useAssetCheckQuery(month: string) {
  return useQuery(assetCheckQueryOptions(month))
}

export function useFlowSummaryQuery(type: FinanceCategoryType, period: Period, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({ ...flowSummaryQueryOptions(type, period), enabled })
}

export function useFlowTrendQuery(type: FinanceCategoryType, period: Period, range: TrendRange, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({ ...flowTrendQueryOptions(type, period, range), enabled })
}

export function useBudgetProgressQuery(type: FinanceCategoryType, period: Period, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({ ...budgetProgressQueryOptions(type, period), enabled })
}

export function useBulkRegisterPreviewQuery(sourceMonth: string) {
  return useQuery(bulkRegisterPreviewQueryOptions(sourceMonth))
}
