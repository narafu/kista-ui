'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiMsg } from '@shared/lib/api-client'
import { synchronizeListQueries, upsertById } from '@shared/lib/query'
import {
  bulkRegisterFinance,
  createAssetSnapshot,
  createFinanceAccount,
  createFinanceBudget,
  createFinanceCategory,
  createFinanceGroupInvitation,
  createFinanceTransaction,
  createSystemFinanceCategory,
  deleteAssetSnapshot,
  deleteFinanceAccount,
  deleteFinanceBudget,
  deleteFinanceCategory,
  deleteFinanceTransaction,
  deleteSystemFinanceCategory,
  removeFinanceGroupMember,
  respondToInvitation,
  setMonthlyClosing,
  shareAssetSnapshot,
  shareFinanceAccount,
  shareFinanceBudget,
  shareFinanceCategory,
  shareFinanceTransaction,
  unshareAssetSnapshot,
  unshareFinanceAccount,
  unshareFinanceBudget,
  unshareFinanceCategory,
  unshareFinanceTransaction,
  updateAssetSnapshot,
  updateFinanceAccount,
  updateFinanceBudget,
  updateFinanceCategory,
  updateFinanceTransaction,
  updateSystemFinanceCategory,
} from '../api'
import type {
  AssetSnapshot,
  AssetSnapshotRequest,
  BulkFinanceRegisterRequest,
  BulkFinanceRegisterResponse,
  FinanceAccount,
  FinanceAccountRequest,
  FinanceBudget,
  FinanceBudgetRequest,
  FinanceCategory,
  FinanceCategoryRequest,
  FinanceGroup,
  FinanceGroupInvitation,
  FinanceTransaction,
  FinanceTransactionRequest,
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

// shareToGroup:true면 서버가 그룹 소유로 원자적으로 생성한다(kista-api AssetSnapshotService.create —
// ?shareToGroup=true, 대상 그룹은 서버가 userId로 해석). 생성이 성공하면 요청한 소유 형태 그대로다 —
// 부분 실패("저장됐지만 공유 실패") 상태가 없어졌다. 결과 groupId가 activeGroupId 캐시 키와
// 어긋날 수 있어(활성 그룹 전환 중) 특정 키 upsert 대신 root invalidate를 쓴다.
export function useCreateAssetSnapshotMutation() {
  return useInvalidateFinanceMutation<AssetSnapshot, AssetSnapshotRequest & { shareToGroup?: boolean }>(
    ({ shareToGroup, ...data }) => createAssetSnapshot(data, { shareToGroup }),
    financeKeys.assetSnapshotsRoot(),
    '자산 기록을 저장하지 못했습니다',
  )
}

// create와 동일한 이유로 groupId 스코프 upsert 대신 root invalidate를 쓴다.
export function useShareAssetSnapshotMutation() {
  return useInvalidateFinanceMutation<AssetSnapshot, string>(
    (id) => shareAssetSnapshot(id),
    financeKeys.assetSnapshotsRoot(),
    '자산 기록을 그룹에 공유하지 못했습니다',
  )
}

// unshare는 그룹 멤버 누구나 실행할 수 있어(소유자 한정 아님) 실행자 본인 소유가 아닌 항목이면
// 되돌린 뒤 실행자의 "내 스코프"에서 완전히 벗어날 수 있다(개인 소유가 되며 소유자는 원래 그대로
// 유지) — upsertById는 제거를 못 해 실행자 화면에 더 이상 접근 불가한 항목이 그대로 남는다.
// share/update/delete와 달리 로컬 upsert 대신 invalidate 후 재조회로 처리한다.
export function useUnshareAssetSnapshotMutation() {
  return useInvalidateFinanceMutation<AssetSnapshot, string>(
    (id) => unshareAssetSnapshot(id),
    financeKeys.assetSnapshotsRoot(),
    '자산 기록을 개인 소유로 되돌리지 못했습니다',
  )
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

// shareToGroup:true면 서버가 그룹 소유로 원자적으로 생성한다(kista-api FinanceCategoryService.create —
// ?shareToGroup=true). 부모가 개인 소유면 서버가 400 — 호출부(CategoryFormDialog)가 토글을 게이팅한다.
// 카테고리는 트리 응답이고 POST 응답의 children이 항상 []로 고정돼(kista-api FinanceCategoryController)
// upsertById 직접 쓰기가 부모 children을 깨므로, 다른 finance 리소스와 달리 invalidate 후 재조회한다.
export function useCreateFinanceCategoryMutation() {
  return useInvalidateFinanceMutation<FinanceCategory, FinanceCategoryRequest & { shareToGroup?: boolean }>(
    ({ shareToGroup, ...data }) => createFinanceCategory(data, { shareToGroup }),
    financeKeys.categoriesRoot(),
    '카테고리를 저장하지 못했습니다',
  )
}

export function useUpdateFinanceCategoryMutation(categoryId: string) {
  return useInvalidateFinanceMutation<FinanceCategory, FinanceCategoryRequest>(
    (data) => updateFinanceCategory(categoryId, data),
    financeKeys.categoriesRoot(),
    '카테고리를 수정하지 못했습니다',
  )
}

export function useDeleteFinanceCategoryMutation() {
  return useInvalidateFinanceMutation<void, string>(
    (id) => deleteFinanceCategory(id),
    financeKeys.categoriesRoot(),
    '카테고리를 삭제하지 못했습니다',
  )
}

// 하위 카테고리도 함께 그룹으로 공유 전환된다(kista-api cascade) — 트리 전체 invalidate로 반영.
export function useShareFinanceCategoryMutation() {
  return useInvalidateFinanceMutation<FinanceCategory, string>(
    (id) => shareFinanceCategory(id),
    financeKeys.categoriesRoot(),
    '카테고리를 그룹에 공유하지 못했습니다',
  )
}

export function useUnshareFinanceCategoryMutation() {
  return useInvalidateFinanceMutation<FinanceCategory, string>(
    (id) => unshareFinanceCategory(id),
    financeKeys.categoriesRoot(),
    '카테고리를 개인 소유로 되돌리지 못했습니다',
  )
}

// 관리자 시스템 카테고리 — 그룹 스코프 카테고리와 캐시 네임스페이스가 분리돼 있어 그룹 캐시를 건드리지 않는다.
export function useCreateSystemFinanceCategoryMutation() {
  return useInvalidateFinanceMutation<FinanceCategory, FinanceCategoryRequest>(
    (data) => createSystemFinanceCategory(data),
    financeKeys.systemCategoriesRoot(),
    '카테고리를 저장하지 못했습니다',
  )
}

export function useUpdateSystemFinanceCategoryMutation(categoryId: string) {
  return useInvalidateFinanceMutation<FinanceCategory, FinanceCategoryRequest>(
    (data) => updateSystemFinanceCategory(categoryId, data),
    financeKeys.systemCategoriesRoot(),
    '카테고리를 수정하지 못했습니다',
  )
}

export function useDeleteSystemFinanceCategoryMutation() {
  return useInvalidateFinanceMutation<void, string>(
    (id) => deleteSystemFinanceCategory(id),
    financeKeys.systemCategoriesRoot(),
    '카테고리를 삭제하지 못했습니다',
  )
}

// 거래내역/예산은 캐시 키에 조회 범위(from/to, 또는 없음)가 섞여 있어 특정 월 리스트에 saved 항목을
// upsertById로 직접 꽂아 넣으려면 "이 거래가 지금 열려 있는 어느 윈도우 캐시에 속하는지"를 매번 판정해야
// 한다 — 카테고리 뮤테이션과 같은 이유로 invalidate 후 재조회가 더 단순하고 안전하다.
function useInvalidateFinanceMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  rootKey: readonly unknown[],
  errorFallback: string,
) {
  const queryClient = useQueryClient()
  return useMutation<TData, Error, TVariables>({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rootKey }),
    onError: (err) => toast.error(apiMsg(err, errorFallback)),
  })
}

// shareToGroup:true면 서버가 그룹 소유로 원자적으로 생성한다(kista-api FinanceTransactionService.create —
// ?shareToGroup=true). 생성이 성공하면 요청한 소유 형태 그대로다(부분 실패 상태 없음).
export function useCreateFinanceTransactionMutation() {
  return useInvalidateFinanceMutation<FinanceTransaction, FinanceTransactionRequest & { shareToGroup?: boolean }>(
    ({ shareToGroup, ...data }) => createFinanceTransaction(data, { shareToGroup }),
    financeKeys.transactionsRoot(),
    '거래내역을 저장하지 못했습니다',
  )
}

export function useUpdateFinanceTransactionMutation(transactionId: string) {
  return useInvalidateFinanceMutation<FinanceTransaction, FinanceTransactionRequest>(
    (data) => updateFinanceTransaction(transactionId, data),
    financeKeys.transactionsRoot(),
    '거래내역을 수정하지 못했습니다',
  )
}

export function useDeleteFinanceTransactionMutation() {
  return useInvalidateFinanceMutation<void, string>(
    (id) => deleteFinanceTransaction(id),
    financeKeys.transactionsRoot(),
    '거래내역을 삭제하지 못했습니다',
  )
}

export function useShareFinanceTransactionMutation() {
  return useInvalidateFinanceMutation<FinanceTransaction, string>(
    (id) => shareFinanceTransaction(id),
    financeKeys.transactionsRoot(),
    '거래내역을 그룹에 공유하지 못했습니다',
  )
}

export function useUnshareFinanceTransactionMutation() {
  return useInvalidateFinanceMutation<FinanceTransaction, string>(
    (id) => unshareFinanceTransaction(id),
    financeKeys.transactionsRoot(),
    '거래내역을 개인 소유로 되돌리지 못했습니다',
  )
}

// shareToGroup:true면 서버가 그룹 소유로 원자적으로 생성한다(kista-api FinanceBudgetService.create —
// ?shareToGroup=true). 그룹 스코프 기간 중첩(finance_budgets_no_overlap)은 이 create가 그대로 409로
// 낸다 — apiMsg가 서버 메시지를 노출하므로 폴백만 지정한다. 개인 스코프 중첩은 서버가 규칙대로
// 자동 트림/삭제한다. 별도 공유 전환·롤백 단계가 없어졌다.
export function useCreateFinanceBudgetMutation() {
  return useInvalidateFinanceMutation<FinanceBudget, FinanceBudgetRequest & { shareToGroup?: boolean }>(
    ({ shareToGroup, ...data }) => createFinanceBudget(data, { shareToGroup }),
    financeKeys.budgetsRoot(),
    '예산을 저장하지 못했습니다',
  )
}

export function useUpdateFinanceBudgetMutation(budgetId: string) {
  return useInvalidateFinanceMutation<FinanceBudget, FinanceBudgetRequest>(
    (data) => updateFinanceBudget(budgetId, data),
    financeKeys.budgetsRoot(),
    '예산을 수정하지 못했습니다',
  )
}

export function useDeleteFinanceBudgetMutation() {
  return useInvalidateFinanceMutation<void, string>(
    (id) => deleteFinanceBudget(id),
    financeKeys.budgetsRoot(),
    '예산을 삭제하지 못했습니다',
  )
}

export function useShareFinanceBudgetMutation() {
  return useInvalidateFinanceMutation<FinanceBudget, string>(
    (id) => shareFinanceBudget(id),
    financeKeys.budgetsRoot(),
    '예산을 그룹에 공유하지 못했습니다',
  )
}

export function useUnshareFinanceBudgetMutation() {
  return useInvalidateFinanceMutation<FinanceBudget, string>(
    (id) => unshareFinanceBudget(id),
    financeKeys.budgetsRoot(),
    '예산을 개인 소유로 되돌리지 못했습니다',
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

// shareToGroup:true면 서버가 그룹 소유로 원자적으로 생성한다(kista-api FinanceAccountService.create —
// ?shareToGroup=true). saved.groupId가 activeGroupId 스코프와 어긋날 수 있어(개인 스코프로 보는데
// 그룹 저장, 또는 그 반대) 특정 groupId 캐시 키로의 upsert 대신 root invalidate를 쓴다 — 계좌
// share/unshare가 같은 이유로 invalidate 방식인 것과 동일.
export function useCreateFinanceAccountMutation() {
  return useInvalidateFinanceMutation<FinanceAccount, FinanceAccountRequest & { shareToGroup?: boolean }>(
    ({ shareToGroup, ...data }) => createFinanceAccount(data, { shareToGroup }),
    financeKeys.accountsRoot(),
    '계좌를 저장하지 못했습니다',
  )
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

// share/unshare는 계좌가 flat 목록이어도 create/update와 다르게 invalidate 방식을 쓴다 — unshare는
// 그룹 멤버 누구나 실행할 수 있어(소유자 한정 아님) 실행자 본인 소유가 아닌 계좌를 되돌리면 실행자의
// groupId 스코프 목록에서 그 항목이 빠져야 한다. upsertById는 제거를 못 해 캐시에 그대로 남는다 —
// asset-snapshot/budget/transaction/category의 share/unshare가 전부 invalidate를 쓰는 것과 같은 이유.
export function useShareFinanceAccountMutation() {
  return useInvalidateFinanceMutation<FinanceAccount, string>(
    (id) => shareFinanceAccount(id),
    financeKeys.accountsRoot(),
    '계좌를 그룹에 공유하지 못했습니다',
  )
}

export function useUnshareFinanceAccountMutation() {
  return useInvalidateFinanceMutation<FinanceAccount, string>(
    (id) => unshareFinanceAccount(id),
    financeKeys.accountsRoot(),
    '계좌를 개인 소유로 되돌리지 못했습니다',
  )
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
        queryClient.invalidateQueries({ queryKey: financeKeys.groupMembers(groupId) }).catch(() => null),
        queryClient.invalidateQueries({ queryKey: financeKeys.groups() }).catch(() => null),
      ])
    },
    onError: (err) => toast.error(apiMsg(err, '처리하지 못했습니다')),
  })
}

// 초대 발급 자체의 응답은 캐시할 목록이 없다(발급 이력 조회 API 자체가 없음) — 다만 무그룹
// 유저가 발급하면 kista-api가 그 자리에서 새 그룹을 만들고 본인을 OWNER로 등록하므로, groups()를
// 무효화해야 GroupManager가 방금 생겨난 그룹을 곧바로 반영한다.
export function useCreateFinanceGroupInvitationMutation(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation<FinanceGroupInvitation, Error, number>({
    mutationFn: (expiresInHours) => createFinanceGroupInvitation(groupId, expiresInHours),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.groups() }),
    onError: (err) => toast.error(apiMsg(err, '초대 코드를 발급하지 못했습니다')),
  })
}

// 자산/거래 배치 등록 — 항목별 성공/실패는 응답에 담겨 오므로 mutation 자체는 항상 성공(reject
// 없음, 서버가 400을 내는 요청 자체 오류만 error가 된다). asset/transaction 양쪽 루트를 함께
// 무효화해야 해 financeKeys.all(공통 루트)을 그대로 쓴다.
// shareToGroup:true면 서버가 각 항목을 그룹 공유로 등록한다 — 공유 전환 실패 항목은 서버가 롤백해
// 응답 failures[]로 내려오므로 호출부(BulkRegisterForm)의 failures.length 분기가 그대로 커버한다.
export function useBulkRegisterFinanceMutation() {
  return useInvalidateFinanceMutation<BulkFinanceRegisterResponse, BulkFinanceRegisterRequest & { shareToGroup?: boolean }>(
    ({ shareToGroup, ...data }) => bulkRegisterFinance(data, { shareToGroup }),
    financeKeys.all,
    '일괄 등록에 실패했습니다',
  )
}

export function useRespondToInvitationMutation() {
  const queryClient = useQueryClient()
  return useMutation<FinanceGroup, Error, { code: string; status: 'ACCEPTED' | 'DECLINED' }>({
    mutationFn: ({ code, status }) => respondToInvitation(code, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.groups() }),
    onError: (err) => toast.error(apiMsg(err, '초대를 처리하지 못했습니다')),
  })
}
