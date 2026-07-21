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
    staleTime: 60_000, // 카드 목록 재진입 시 캐시 재사용 — "바로 주문"/취소는 invalidateQueries로 별도 강제 갱신되므로 신선도에 영향 없음
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
  from: string | undefined,
  to: string | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery<StrategyOrder[]>({
    queryKey: ['strategy-orders', strategyId, from ?? '', to ?? ''],
    queryFn: () => listStrategyOrders(strategyId, from, to),
    enabled: options?.enabled !== false,
    staleTime: 1000 * 60, // 1분 — 과거 체결 이력, 매 마운트마다 재요청할 필요 없음
  })
}
