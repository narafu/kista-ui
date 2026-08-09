'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiMsg } from '@shared/lib/api-client'
import { synchronizeListQueries, upsertById } from '@shared/lib/query'
import { createAsset, deleteAsset, setAssetMonthlyCheck, updateAsset } from '../api'
import type { Asset, AssetMonthlyCheck, AssetRequest } from '../model/types'
import { assetKeys } from '../model/queryKeys'
import { assetListQueryOptions, assetMonthlyChecksQueryOptions } from '../model/queryOptions'

async function synchronizeAssetList(queryClient: QueryClient, update: (assets: Asset[]) => Asset[]) {
  await synchronizeListQueries(
    queryClient,
    [{ queryKey: assetKeys.list(), fetchCompleteList: () => queryClient.fetchQuery(assetListQueryOptions()) }],
    update,
  )
}

export function useCreateAssetMutation() {
  const queryClient = useQueryClient()
  return useMutation<Asset, Error, AssetRequest>({
    mutationFn: (data) => createAsset(data),
    onSuccess: async (saved) => {
      await synchronizeAssetList(queryClient, (assets) => upsertById(assets, saved))
    },
    onError: (err) => toast.error(apiMsg(err, '자산 기록을 저장하지 못했습니다')),
  })
}

export function useUpdateAssetMutation(assetId: string) {
  const queryClient = useQueryClient()
  return useMutation<Asset, Error, AssetRequest>({
    mutationFn: (data) => updateAsset(assetId, data),
    onSuccess: async (saved) => {
      await synchronizeAssetList(queryClient, (assets) => upsertById(assets, saved))
    },
    onError: (err) => toast.error(apiMsg(err, '자산 기록을 수정하지 못했습니다')),
  })
}

export interface DeleteManyAssetsResult {
  succeededIds: string[]
  failedCount: number
}

// 벌크 삭제 전용 엔드포인트 없음 — 개별 DELETE를 Promise.allSettled로 병렬 호출해 부분 실패를 허용한다.
// mutationFn이 개별 실패를 흡수해 절대 reject하지 않으므로 onError는 발생하지 않는다 — 전체 실패는
// onSuccess 안에서 직접 판정해 toast를 띄운다. 부분 실패(일부만 성공) 메시지는 호출 feature가
// failedCount를 보고 직접 표시한다("N건 성공, M건 실패" 등 조합 메시지가 필요하므로).
export function useDeleteManyAssetsMutation() {
  const queryClient = useQueryClient()
  return useMutation<DeleteManyAssetsResult, Error, string[]>({
    mutationFn: async (ids) => {
      const results = await Promise.allSettled(ids.map((id) => deleteAsset(id)))
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
      await synchronizeAssetList(queryClient, (assets) =>
        assets.filter((asset) => !succeededIds.includes(asset.id)))
    },
  })
}

async function synchronizeMonthlyChecks(
  queryClient: QueryClient,
  update: (checks: AssetMonthlyCheck[]) => AssetMonthlyCheck[],
) {
  await synchronizeListQueries(
    queryClient,
    [{
      queryKey: assetKeys.monthlyChecks(),
      fetchCompleteList: () => queryClient.fetchQuery(assetMonthlyChecksQueryOptions()),
    }],
    update,
  )
}

export function useSetAssetMonthlyCheckMutation() {
  const queryClient = useQueryClient()
  return useMutation<AssetMonthlyCheck, Error, { month: string; completed: boolean }>({
    mutationFn: ({ month, completed }) => setAssetMonthlyCheck(month, completed),
    onSuccess: async (saved) => {
      await synchronizeMonthlyChecks(queryClient, (checks) => {
        const exists = checks.some((check) => check.month === saved.month)
        return exists
          ? checks.map((check) => (check.month === saved.month ? saved : check))
          : [...checks, saved]
      })
    },
    onError: (err) => toast.error(apiMsg(err, '기록 완료 상태를 저장하지 못했습니다')),
  })
}
