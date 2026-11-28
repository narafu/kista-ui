'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { apiMsg } from '@shared/lib/api-client'
import {
  addAdminPrivacyOrder,
  createAdminPrivacyBase,
  deleteAdminPrivacyOrder,
  updateAdminPrivacyBase,
  updateAdminPrivacyOrder,
} from '../api'
import { privacyKeys } from '../model/queryKeys'
import type {
  AdminPrivacyBase,
  AdminPrivacyBaseCreateRequest,
  AdminPrivacyBaseUpdateRequest,
  AdminPrivacyOrderCreateRequest,
  AdminPrivacyOrderUpdateRequest,
} from '../model/types'

// 단건 응답은 cycleBoundary·yearlyReset이 null이고 이웃 행 판정도 바뀔 수 있다 — 목록 캐시에 넣지 않고 다시 받는다
function refetchBaseList(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: privacyKeys.list() })
}

export function useCreateAdminPrivacyBaseMutation() {
  const queryClient = useQueryClient()
  return useMutation<AdminPrivacyBase, Error, AdminPrivacyBaseCreateRequest>({
    mutationFn: createAdminPrivacyBase,
    onSuccess: () => refetchBaseList(queryClient),
    onError: (err) => toast.error(apiMsg(err, '등록에 실패했습니다.')),
  })
}

export function useUpdateAdminPrivacyBaseMutation(baseId: string) {
  const queryClient = useQueryClient()
  return useMutation<AdminPrivacyBase, Error, AdminPrivacyBaseUpdateRequest>({
    mutationFn: (data) => updateAdminPrivacyBase(baseId, data),
    onSuccess: () => refetchBaseList(queryClient),
    onError: (err) => toast.error(apiMsg(err, '수정에 실패했습니다.')),
  })
}

export function useAddAdminPrivacyOrderMutation(baseId: string) {
  const queryClient = useQueryClient()
  return useMutation<AdminPrivacyBase, Error, AdminPrivacyOrderCreateRequest>({
    mutationFn: (data) => addAdminPrivacyOrder(baseId, data),
    onSuccess: () => refetchBaseList(queryClient),
    onError: (err) => toast.error(apiMsg(err, '추가에 실패했습니다.')),
  })
}

export function useUpdateAdminPrivacyOrderMutation(baseId: string, orderId: string) {
  const queryClient = useQueryClient()
  return useMutation<AdminPrivacyBase, Error, AdminPrivacyOrderUpdateRequest>({
    mutationFn: (data) => updateAdminPrivacyOrder(baseId, orderId, data),
    onSuccess: () => refetchBaseList(queryClient),
    onError: (err) => toast.error(apiMsg(err, '수정에 실패했습니다.')),
  })
}

export function useDeleteAdminPrivacyOrderMutation() {
  const queryClient = useQueryClient()
  return useMutation<AdminPrivacyBase, Error, { baseId: string; orderId: string }>({
    mutationFn: ({ baseId, orderId }) => deleteAdminPrivacyOrder(baseId, orderId),
    onSuccess: () => refetchBaseList(queryClient),
    onError: (err) => toast.error(apiMsg(err, '삭제에 실패했습니다.')),
  })
}
