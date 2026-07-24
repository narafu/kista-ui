'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getStrategyOrdersPreview, cancelAllOrders, cancelOneOrder, listStrategyOrders } from '../api'
import type { NextOrderPreview, StrategyOrder } from '../model/types'

export function useStrategyOrderPreviewQuery(strategyId: string, initialData?: NextOrderPreview) {
  return useQuery<NextOrderPreview>({
    queryKey: ['order-preview', 'strategy', strategyId],
    queryFn: () => getStrategyOrdersPreview(strategyId),
    retry: false,
    staleTime: 60_000, // 카드 목록 재진입 시 캐시 재사용 — "바로 주문"/취소는 invalidateQueries로 별도 강제 갱신되므로 신선도에 영향 없음
    initialData,
    // 서버에서 prefetch한 시점 기준으로 신선도를 매겨야 staleTime 동안 클라이언트 재요청을 건너뜀
    initialDataUpdatedAt: initialData ? Date.now() : undefined,
    // 라이브 예수금/판매가능수량 조회 실패로 판정 불가 상태면 짧은 주기로 자동 재시도 — 그렇지 않으면
    // staleTime 60초 동안 판정 불가 스냅샷이 그대로 고정돼 재조회 없이는 스스로 회복되지 않는다
    refetchInterval: (query) =>
      query.state.data?.competition?.liveBalanceUnavailable || query.state.data?.sellSufficiency?.liveQuantityUnavailable
        ? 5_000
        : false,
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
