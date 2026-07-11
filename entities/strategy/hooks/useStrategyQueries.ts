'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { ApiError, apiMsg } from '@shared/lib/api-client'
import {
  listAllStrategies,
  listStrategies,
  createStrategy,
  updateStrategy,
  deleteStrategy,
  pauseStrategy,
  resumeStrategy,
  executeStrategy,
  getStrategySeedPreview,
} from '../api'
import type { Strategy, StrategyRequest, StrategySeedPreview } from '../model/types'

export function useStrategySeedPreviewQuery(
  accountId: string,
  params: { type: string; ticker: string; divisionCount: number },
  options?: { enabled?: boolean },
) {
  return useQuery<StrategySeedPreview>({
    queryKey: ['strategySeedPreview', accountId, params.type, params.ticker, params.divisionCount],
    queryFn: () => getStrategySeedPreview(accountId, params),
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
  })
}

export function useAllStrategiesQuery(initialData?: Strategy[]) {
  return useQuery<Strategy[]>({
    queryKey: ['strategies', 'all'],
    queryFn: () => listAllStrategies(),
    initialData,
    initialDataUpdatedAt: initialData ? 0 : undefined,
    staleTime: 30_000,
  })
}

export function useStrategiesQuery(accountId: string, initialData?: Strategy[]) {
  return useQuery<Strategy[]>({
    queryKey: ['strategies', accountId],
    queryFn: () => listStrategies(accountId),
    initialData,
    initialDataUpdatedAt: initialData ? 0 : undefined,
    staleTime: 30_000,
  })
}

export function useCreateStrategyMutation(accountId: string, onSuccess?: () => void) {
  const router = useRouter()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: StrategyRequest) => createStrategy(accountId, data),
    onSuccess: () => {
      toast.success('전략이 등록되었습니다')
      queryClient.invalidateQueries({ queryKey: ['strategies'] })
      router.refresh()
      onSuccess?.()
    },
    onError: (err) => toast.error(apiMsg(err, '저장에 실패했습니다')),
  })
}

export function useUpdateStrategyMutation(strategyId: string, onSuccess?: () => void) {
  const router = useRouter()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<StrategyRequest>) => updateStrategy(strategyId, data),
    onSuccess: () => {
      toast.success('전략이 수정되었습니다')
      queryClient.invalidateQueries({ queryKey: ['strategies'] })
      // 전략 수정 후 다음 주문/기준가 표시를 최신 상태로 갱신
      queryClient.invalidateQueries({ queryKey: ['order-preview'] })
      router.refresh()
      onSuccess?.()
    },
    onError: (err) => toast.error(apiMsg(err, '저장에 실패했습니다')),
  })
}

export function usePauseStrategyMutation() {
  const router = useRouter()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => pauseStrategy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] })
      router.refresh()
    },
    onError: (err) => toast.error(apiMsg(err, '일시정지에 실패했습니다')),
  })
}

export function useResumeStrategyMutation() {
  const router = useRouter()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => resumeStrategy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] })
      router.refresh()
    },
    onError: (err) => toast.error(apiMsg(err, '재개에 실패했습니다')),
  })
}

export function useDeleteStrategyMutation(onSuccess?: () => void) {
  const router = useRouter()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteStrategy(id),
    onSuccess: () => {
      toast.success('전략이 삭제되었습니다')
      queryClient.invalidateQueries({ queryKey: ['strategies'] })
      router.refresh()
      onSuccess?.()
    },
    onError: (err) => toast.error(apiMsg(err, '삭제에 실패했습니다')),
  })
}

export function useExecuteStrategyMutation(strategyId: string | undefined) {
  return useMutation({ // eslint-disable-line react-doctor/query-mutation-missing-invalidation
    mutationFn: () => executeStrategy(strategyId!),
    onSuccess: () => toast.success('매매 실행이 요청됐습니다. 장 마감 후 체결 결과를 확인하세요.'),
    onError: (e) => {
      if (e instanceof ApiError) {
        if (e.status === 409) toast.error(apiMsg(e, '오늘 이미 실행됐습니다.'))
        else if (e.status === 403) toast.error(apiMsg(e, '권한이 없습니다.'))
        else toast.error(apiMsg(e, '실행 중 오류가 발생했습니다.'))
      } else {
        toast.error('실행 중 오류가 발생했습니다.')
      }
    },
  })
}
