'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getNextOrdersPreview, cancelAllOrders, cancelOneOrder } from '@/lib/api/orders'
import { getMargin } from '@/lib/api/accounts'
import { executeStrategy } from '@/lib/api/strategies'
import { getMarketSession, getMonthlyHolidaysClient } from '@/lib/api/market'
import { ApiError } from '@/lib/api/client'
import type { PlacedOrder } from '@/types/preview'

export function useNextOrderPreview(accountId: string, strategyId: string | undefined) {
  const [mode, setMode] = useState<'preview' | 'executed'>('preview')
  const [placedOrders, setPlacedOrders] = useState<PlacedOrder[]>([])

  const previewQuery = useQuery({
    queryKey: ['nextOrderPreview', accountId],
    queryFn: () => getNextOrdersPreview(accountId),
    retry: false,
  })

  const { data: margin } = useQuery({
    queryKey: ['previewMargin', accountId],
    queryFn: () => getMargin(accountId).catch(() => null),
  })

  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1
  const todayStr = today.toISOString().slice(0, 10)

  const { data: marketSession } = useQuery({
    queryKey: ['marketSession'],
    queryFn: () => getMarketSession().catch(() => null),
    staleTime: 1000 * 60,
  })

  const { data: holidays = [] } = useQuery<string[]>({
    queryKey: ['holidays', year, month],
    queryFn: () => getMonthlyHolidaysClient(year, month).catch((): string[] => []),
    staleTime: 1000 * 60 * 60,
  })

  const executeMutation = useMutation({
    mutationFn: () => executeStrategy(strategyId!),
    onSuccess: (orders) => {
      toast.success('매매 실행이 요청됐습니다. 장 마감 후 체결 결과를 확인하세요.')
      setMode('executed')
      setPlacedOrders(orders)
    },
    onError: (e) => {
      if (e instanceof ApiError) {
        if (e.status === 409) toast.error('오늘 이미 실행됐습니다.')
        else if (e.status === 400) toast.error('실행할 수 없는 전략입니다.')
        else if (e.status === 403) toast.error('권한이 없습니다.')
        else toast.error('실행 중 오류가 발생했습니다.')
      } else {
        toast.error('실행 중 오류가 발생했습니다.')
      }
    },
  })

  const cancelAllMutation = useMutation({
    mutationFn: () => cancelAllOrders(strategyId!),
    onSuccess: (result) => {
      if (result.failedCount === 0) {
        toast.success(`${result.cancelledCount}건 모두 취소됐습니다.`)
        setMode('preview')
        setPlacedOrders([])
        previewQuery.refetch()
      } else {
        toast.warning(
          `${result.cancelledCount}건 취소, ${result.failedCount}건 실패 — KIS에서 직접 확인하세요.`,
        )
      }
    },
    onError: () => toast.error('취소 중 오류가 발생했습니다.'),
  })

  const cancelOneMutation = useMutation({
    mutationFn: (orderId: string) => cancelOneOrder(orderId),
    onSuccess: (_, orderId) => {
      const remaining = placedOrders.filter((o) => o.id !== orderId)
      setPlacedOrders(remaining)
      if (remaining.length === 0) {
        setMode('preview')
        previewQuery.refetch()
      }
    },
    onError: () => toast.error('주문 취소 중 오류가 발생했습니다.'),
  })

  const error: 'no-strategy' | 'kis-fail' | null =
    previewQuery.error instanceof ApiError && previewQuery.error.status === 404
      ? 'no-strategy'
      : previewQuery.error
        ? 'kis-fail'
        : null

  return {
    preview: previewQuery.data ?? null,
    margin,
    isLoading: previewQuery.isLoading,
    isFetching: previewQuery.isFetching,
    error,
    lastUpdatedAt: previewQuery.dataUpdatedAt
      ? new Date(previewQuery.dataUpdatedAt).toLocaleTimeString('ko-KR')
      : '',
    refetch: previewQuery.refetch,
    isBlocked: marketSession?.session === 'BLOCKED',
    isHoliday: holidays.includes(todayStr),
    mode,
    setMode,
    placedOrders,
    executeMutation,
    cancelAllMutation,
    cancelOneMutation,
  }
}
