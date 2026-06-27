'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getStrategyOrdersPreview, cancelAllOrders, cancelOneOrder, listStrategyOrders } from '../api'
import type { NextOrderPreview, StrategyOrder } from '../model/types'

export function useStrategyOrderPreviewQuery(strategyId: string) {
  return useQuery<NextOrderPreview>({
    queryKey: ['order-preview', 'strategy', strategyId],
    queryFn: () => getStrategyOrdersPreview(strategyId),
    retry: false,
  })
}

export function useCancelAllOrdersMutation(strategyId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => cancelAllOrders(strategyId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-preview', 'strategy', strategyId] })
    },
    onError: () => toast.error('취소 중 오류가 발생했습니다.'),
  })
}

export function useCancelOneOrderMutation(strategyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) => cancelOneOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-preview', 'strategy', strategyId] })
    },
    onError: () => toast.error('주문 취소 중 오류가 발생했습니다.'),
  })
}

export function useStrategyOrdersQuery(
  strategyId: string,
  from: string,
  to: string,
) {
  return useQuery<StrategyOrder[]>({
    queryKey: ['strategy-orders', strategyId, from, to],
    queryFn: () => listStrategyOrders(strategyId, from, to),
  })
}
