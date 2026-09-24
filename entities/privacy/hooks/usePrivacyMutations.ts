'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { apiMsg } from '@shared/lib/api-client'
import { upsertById, synchronizeListQueries } from '@shared/lib/query'
import {
  addAdminPrivacyOrder,
  createAdminPrivacyBase,
  deleteAdminPrivacyOrder,
  updateAdminPrivacyBase,
  updateAdminPrivacyOrder,
} from '../api'
import { adminPrivacyBasesQueryOptions } from '../model/queryOptions'
import { privacyKeys } from '../model/queryKeys'
import type {
  AdminPrivacyBase,
  AdminPrivacyBaseCreateRequest,
  AdminPrivacyBaseUpdateRequest,
  AdminPrivacyOrderCreateRequest,
  AdminPrivacyOrderUpdateRequest,
} from '../model/types'

// kista-api가 releaseDate DESC로 내려주고(entities/privacy/api 참고), 필터링·페이지 슬라이싱이
// 이 정렬을 그대로 가정한다(AdminPrivacyBaseTable) — upsert 후 재정렬해 신규 등록도 순서를 지킨다.
function byReleaseDateDesc(a: AdminPrivacyBase, b: AdminPrivacyBase): number {
  return b.releaseDate.localeCompare(a.releaseDate)
}

async function upsertBaseInList(queryClient: QueryClient, saved: AdminPrivacyBase) {
  await synchronizeListQueries(
    queryClient,
    [{
      queryKey: privacyKeys.list(),
      fetchCompleteList: () => queryClient.fetchQuery(adminPrivacyBasesQueryOptions()),
    }],
    (bases) => upsertById(bases, saved).sort(byReleaseDateDesc),
  )
}

export function useCreateAdminPrivacyBaseMutation() {
  const queryClient = useQueryClient()
  return useMutation<AdminPrivacyBase, Error, AdminPrivacyBaseCreateRequest>({
    mutationFn: createAdminPrivacyBase,
    onSuccess: (saved) => upsertBaseInList(queryClient, saved),
    onError: (err) => toast.error(apiMsg(err, '등록에 실패했습니다.')),
  })
}

export function useUpdateAdminPrivacyBaseMutation(baseId: string) {
  const queryClient = useQueryClient()
  return useMutation<AdminPrivacyBase, Error, AdminPrivacyBaseUpdateRequest>({
    mutationFn: (data) => updateAdminPrivacyBase(baseId, data),
    onSuccess: (saved) => upsertBaseInList(queryClient, saved),
    onError: (err) => toast.error(apiMsg(err, '수정에 실패했습니다.')),
  })
}

export function useAddAdminPrivacyOrderMutation(baseId: string) {
  const queryClient = useQueryClient()
  return useMutation<AdminPrivacyBase, Error, AdminPrivacyOrderCreateRequest>({
    mutationFn: (data) => addAdminPrivacyOrder(baseId, data),
    onSuccess: (saved) => upsertBaseInList(queryClient, saved),
    onError: (err) => toast.error(apiMsg(err, '추가에 실패했습니다.')),
  })
}

export function useUpdateAdminPrivacyOrderMutation(baseId: string, orderId: string) {
  const queryClient = useQueryClient()
  return useMutation<AdminPrivacyBase, Error, AdminPrivacyOrderUpdateRequest>({
    mutationFn: (data) => updateAdminPrivacyOrder(baseId, orderId, data),
    onSuccess: (saved) => upsertBaseInList(queryClient, saved),
    onError: (err) => toast.error(apiMsg(err, '수정에 실패했습니다.')),
  })
}

export function useDeleteAdminPrivacyOrderMutation() {
  const queryClient = useQueryClient()
  return useMutation<AdminPrivacyBase, Error, { baseId: string; orderId: string }>({
    mutationFn: ({ baseId, orderId }) => deleteAdminPrivacyOrder(baseId, orderId),
    onSuccess: (saved) => upsertBaseInList(queryClient, saved),
    onError: (err) => toast.error(apiMsg(err, '삭제에 실패했습니다.')),
  })
}
