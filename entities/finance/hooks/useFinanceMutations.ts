'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiMsg } from '@shared/lib/api-client'
import { synchronizeListQueries, upsertById } from '@shared/lib/query'
import {
  createAssetSnapshot,
  createFinanceAccount,
  createFinanceCategory,
  createFinanceGroupInvitation,
  deleteAssetSnapshot,
  deleteFinanceAccount,
  deleteFinanceCategory,
  removeFinanceGroupMember,
  respondToInvitation,
  setMonthlyClosing,
  updateAssetSnapshot,
  updateFinanceAccount,
  updateFinanceCategory,
} from '../api'
import type {
  AssetSnapshot,
  AssetSnapshotRequest,
  FinanceAccount,
  FinanceAccountRequest,
  FinanceCategory,
  FinanceCategoryRequest,
  FinanceGroup,
  FinanceGroupInvitation,
  MonthlyClosing,
} from '../model/types'
import { financeKeys } from '../model/queryKeys'
import { assetSnapshotListQueryOptions, financeAccountListQueryOptions, monthlyClosingListQueryOptions } from '../model/queryOptions'
import { useActiveGroupId } from './useFinanceQueries'

async function synchronizeAssetSnapshotList(
  queryClient: QueryClient,
  groupId: string | undefined,
  update: (snapshots: AssetSnapshot[]) => AssetSnapshot[],
) {
  await synchronizeListQueries(
    queryClient,
    [{
      queryKey: financeKeys.assetSnapshots(groupId),
      fetchCompleteList: () => queryClient.fetchQuery(assetSnapshotListQueryOptions(groupId)),
    }],
    update,
  )
}

export function useCreateAssetSnapshotMutation() {
  const queryClient = useQueryClient()
  const groupId = useActiveGroupId()
  return useMutation<AssetSnapshot, Error, AssetSnapshotRequest>({
    mutationFn: (data) => createAssetSnapshot(data, groupId),
    onSuccess: async (saved) => {
      await synchronizeAssetSnapshotList(queryClient, groupId, (snapshots) => upsertById(snapshots, saved))
    },
    onError: (err) => toast.error(apiMsg(err, '자산 기록을 저장하지 못했습니다')),
  })
}

export function useUpdateAssetSnapshotMutation(snapshotId: string) {
  const queryClient = useQueryClient()
  const groupId = useActiveGroupId()
  return useMutation<AssetSnapshot, Error, AssetSnapshotRequest>({
    mutationFn: (data) => updateAssetSnapshot(snapshotId, data),
    onSuccess: async (saved) => {
      await synchronizeAssetSnapshotList(queryClient, groupId, (snapshots) => upsertById(snapshots, saved))
    },
    onError: (err) => toast.error(apiMsg(err, '자산 기록을 수정하지 못했습니다')),
  })
}

export interface DeleteManyAssetSnapshotsResult {
  succeededIds: string[]
  failedCount: number
}

// 벌크 삭제 전용 엔드포인트 없음 — 개별 DELETE를 Promise.allSettled로 병렬 호출해 부분 실패를 허용한다.
// mutationFn이 개별 실패를 흡수해 절대 reject하지 않으므로 onError는 발생하지 않는다 — 전체 실패는
// onSuccess 안에서 직접 판정해 toast를 띄운다. 부분 실패(일부만 성공) 메시지는 호출 feature가
// failedCount를 보고 직접 표시한다("N건 성공, M건 실패" 등 조합 메시지가 필요하므로).
export function useDeleteManyAssetSnapshotsMutation() {
  const queryClient = useQueryClient()
  const groupId = useActiveGroupId()
  return useMutation<DeleteManyAssetSnapshotsResult, Error, string[]>({
    mutationFn: async (ids) => {
      const results = await Promise.allSettled(ids.map((id) => deleteAssetSnapshot(id)))
      return {
        succeededIds: ids.filter((_, index) => results[index].status === 'fulfilled'),
        failedCount: results.filter((result) => result.status === 'rejected').length,
      }
    },
    onSuccess: async ({ succeededIds, failedCount }, ids) => {
      if (succeededIds.length === 0) {
        if (failedCount > 0) {
          toast.error(ids.length > 1 ? `자산 기록 ${failedCount}건을 삭제하지 못했습니다` : '자산 기록을 삭제하지 못했습니다')
        }
        return
      }
      await synchronizeAssetSnapshotList(queryClient, groupId, (snapshots) =>
        snapshots.filter((snapshot) => !succeededIds.includes(snapshot.id)))
    },
  })
}

async function synchronizeMonthlyClosings(
  queryClient: QueryClient,
  groupId: string | undefined,
  update: (closings: MonthlyClosing[]) => MonthlyClosing[],
) {
  await synchronizeListQueries(
    queryClient,
    [{
      queryKey: financeKeys.monthlyClosings(groupId),
      fetchCompleteList: () => queryClient.fetchQuery(monthlyClosingListQueryOptions(groupId)),
    }],
    update,
  )
}

export function useSetMonthlyClosingMutation() {
  const queryClient = useQueryClient()
  const groupId = useActiveGroupId()
  return useMutation<MonthlyClosing, Error, { month: string; completed: boolean }>({
    mutationFn: ({ month, completed }) => setMonthlyClosing(month, completed),
    onSuccess: async (saved) => {
      await synchronizeMonthlyClosings(queryClient, groupId, (closings) => {
        const exists = closings.some((closing) => closing.month === saved.month)
        return exists
          ? closings.map((closing) => (closing.month === saved.month ? saved : closing))
          : [...closings, saved]
      })
    },
    onError: (err) => toast.error(apiMsg(err, '기록 완료 상태를 저장하지 못했습니다')),
  })
}

// 카테고리는 트리 응답이고 POST/PUT 응답의 children이 항상 []로 고정된다(kista-api
// FinanceCategoryController) — upsertById로 직접 캐시에 쓰면 부모의 children이 깨진다.
// 그래서 다른 finance 리소스와 달리 invalidate 후 재조회하는 방식으로 뺀다.
function useInvalidateCategoriesMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  errorFallback: string,
) {
  const queryClient = useQueryClient()
  return useMutation<TData, Error, TVariables>({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.categoriesRoot() }),
    onError: (err) => toast.error(apiMsg(err, errorFallback)),
  })
}

export function useCreateFinanceCategoryMutation() {
  const groupId = useActiveGroupId()
  return useInvalidateCategoriesMutation<FinanceCategory, FinanceCategoryRequest>(
    (data) => createFinanceCategory(data, groupId),
    '카테고리를 저장하지 못했습니다',
  )
}

export function useUpdateFinanceCategoryMutation(categoryId: string) {
  return useInvalidateCategoriesMutation<FinanceCategory, FinanceCategoryRequest>(
    (data) => updateFinanceCategory(categoryId, data),
    '카테고리를 수정하지 못했습니다',
  )
}

export function useDeleteFinanceCategoryMutation() {
  return useInvalidateCategoriesMutation<void, string>(
    (id) => deleteFinanceCategory(id),
    '카테고리를 삭제하지 못했습니다',
  )
}

async function synchronizeAccountList(
  queryClient: QueryClient,
  groupId: string | undefined,
  update: (accounts: FinanceAccount[]) => FinanceAccount[],
) {
  await synchronizeListQueries(
    queryClient,
    [{
      queryKey: financeKeys.accounts(groupId),
      fetchCompleteList: () => queryClient.fetchQuery(financeAccountListQueryOptions(groupId)),
    }],
    update,
  )
}

export function useCreateFinanceAccountMutation() {
  const queryClient = useQueryClient()
  const groupId = useActiveGroupId()
  return useMutation<FinanceAccount, Error, FinanceAccountRequest>({
    mutationFn: (data) => createFinanceAccount(data, groupId),
    onSuccess: async (saved) => {
      await synchronizeAccountList(queryClient, groupId, (accounts) => upsertById(accounts, saved))
    },
    onError: (err) => toast.error(apiMsg(err, '계좌를 저장하지 못했습니다')),
  })
}

export function useUpdateFinanceAccountMutation(accountId: string) {
  const queryClient = useQueryClient()
  const groupId = useActiveGroupId()
  return useMutation<FinanceAccount, Error, FinanceAccountRequest>({
    mutationFn: (data) => updateFinanceAccount(accountId, data),
    onSuccess: async (saved) => {
      await synchronizeAccountList(queryClient, groupId, (accounts) => upsertById(accounts, saved))
    },
    onError: (err) => toast.error(apiMsg(err, '계좌를 수정하지 못했습니다')),
  })
}

export function useDeleteFinanceAccountMutation() {
  const queryClient = useQueryClient()
  const groupId = useActiveGroupId()
  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteFinanceAccount(id),
    onSuccess: async (_, id) => {
      await synchronizeAccountList(queryClient, groupId, (accounts) => accounts.filter((a) => a.id !== id))
    },
    onError: (err) => toast.error(apiMsg(err, '계좌를 삭제하지 못했습니다')),
  })
}

// 탈퇴·추방 겸용 — 성공 시 멤버 목록과 함께 그룹 목록도 무효화한다(본인 탈퇴 시 내가 속한
// 그룹 자체가 바뀌므로 groups() 캐시를 갱신 안 하면 GroupSwitcher가 이미 나간 그룹을 계속
// 선택 가능한 상태로 보여줄 수 있다). 활성 그룹이 사라지는 경우(본인이 나감)의 쿠키 클리어는
// 호출 feature(manage-group)가 판단해 useSetActiveGroupId로 직접 처리한다.
export function useRemoveFinanceGroupMemberMutation(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (userId) => removeFinanceGroupMember(groupId, userId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: financeKeys.groupMembers(groupId) }),
        queryClient.invalidateQueries({ queryKey: financeKeys.groups() }),
      ])
    },
    onError: (err) => toast.error(apiMsg(err, '처리하지 못했습니다')),
  })
}

// 초대 발급은 응답을 캐시할 목록이 없다(발급 이력 조회 API 자체가 없음) — 사이드이펙트 없음.
export function useCreateFinanceGroupInvitationMutation(groupId: string) {
  return useMutation<FinanceGroupInvitation, Error, number>({
    mutationFn: (expiresInHours) => createFinanceGroupInvitation(groupId, expiresInHours),
    onError: (err) => toast.error(apiMsg(err, '초대 코드를 발급하지 못했습니다')),
  })
}

export function useRespondToInvitationMutation() {
  const queryClient = useQueryClient()
  return useMutation<FinanceGroup, Error, { code: string; status: 'ACCEPTED' | 'DECLINED' }>({
    mutationFn: ({ code, status }) => respondToInvitation(code, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.groups() }),
    onError: (err) => toast.error(apiMsg(err, '초대를 처리하지 못했습니다')),
  })
}
