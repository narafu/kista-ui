'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiMsg } from '@shared/lib/api-client'
import { synchronizeListQueries, upsertById } from '@shared/lib/query'
import { createAssetSnapshot, deleteAssetSnapshot, setMonthlyClosing, updateAssetSnapshot } from '../api'
import type { AssetSnapshot, AssetSnapshotRequest, MonthlyClosing } from '../model/types'
import { financeKeys } from '../model/queryKeys'
import { assetSnapshotListQueryOptions, monthlyClosingListQueryOptions } from '../model/queryOptions'

async function synchronizeAssetSnapshotList(
  queryClient: QueryClient,
  update: (snapshots: AssetSnapshot[]) => AssetSnapshot[],
) {
  await synchronizeListQueries(
    queryClient,
    [{
      queryKey: financeKeys.assetSnapshots(),
      fetchCompleteList: () => queryClient.fetchQuery(assetSnapshotListQueryOptions()),
    }],
    update,
  )
}

export function useCreateAssetSnapshotMutation() {
  const queryClient = useQueryClient()
  return useMutation<AssetSnapshot, Error, AssetSnapshotRequest>({
    mutationFn: (data) => createAssetSnapshot(data),
    onSuccess: async (saved) => {
      await synchronizeAssetSnapshotList(queryClient, (snapshots) => upsertById(snapshots, saved))
    },
    onError: (err) => toast.error(apiMsg(err, '자산 기록을 저장하지 못했습니다')),
  })
}

export function useUpdateAssetSnapshotMutation(snapshotId: string) {
  const queryClient = useQueryClient()
  return useMutation<AssetSnapshot, Error, AssetSnapshotRequest>({
    mutationFn: (data) => updateAssetSnapshot(snapshotId, data),
    onSuccess: async (saved) => {
      await synchronizeAssetSnapshotList(queryClient, (snapshots) => upsertById(snapshots, saved))
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
      await synchronizeAssetSnapshotList(queryClient, (snapshots) =>
        snapshots.filter((snapshot) => !succeededIds.includes(snapshot.id)))
    },
  })
}

async function synchronizeMonthlyClosings(
  queryClient: QueryClient,
  update: (closings: MonthlyClosing[]) => MonthlyClosing[],
) {
  await synchronizeListQueries(
    queryClient,
    [{
      queryKey: financeKeys.monthlyClosings(),
      fetchCompleteList: () => queryClient.fetchQuery(monthlyClosingListQueryOptions()),
    }],
    update,
  )
}

export function useSetMonthlyClosingMutation() {
  const queryClient = useQueryClient()
  return useMutation<MonthlyClosing, Error, { month: string; completed: boolean }>({
    mutationFn: ({ month, completed }) => setMonthlyClosing(month, completed),
    onSuccess: async (saved) => {
      await synchronizeMonthlyClosings(queryClient, (closings) => {
        const exists = closings.some((closing) => closing.month === saved.month)
        return exists
          ? closings.map((closing) => (closing.month === saved.month ? saved : closing))
          : [...closings, saved]
      })
    },
    onError: (err) => toast.error(apiMsg(err, '기록 완료 상태를 저장하지 못했습니다')),
  })
}
