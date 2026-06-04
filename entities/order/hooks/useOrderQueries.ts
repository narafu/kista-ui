'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getNextOrdersPreview, cancelAllOrders, cancelOneOrder } from '../api'
import type { NextOrderPreview } from '../model/types'

export function useNextOrderPreviewQuery(accountId: string) {
  return useQuery<NextOrderPreview>({
    queryKey: ['nextOrderPreview', accountId],
    queryFn: () => getNextOrdersPreview(accountId),
    retry: false,
  })
}

export function useCancelAllOrdersMutation(strategyId: string | undefined) {
  return useMutation({
    mutationFn: () => cancelAllOrders(strategyId!),
    onError: () => toast.error('취소 중 오류가 발생했습니다.'),
  })
}

export function useCancelOneOrderMutation() {
  return useMutation({
    mutationFn: (orderId: string) => cancelOneOrder(orderId),
    onError: () => toast.error('주문 취소 중 오류가 발생했습니다.'),
  })
}
