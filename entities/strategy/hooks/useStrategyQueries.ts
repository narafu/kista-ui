'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { ApiError } from '@shared/lib/api-client'
import {
  createStrategy,
  updateStrategy,
  pauseStrategy,
  resumeStrategy,
  executeStrategy,
} from '../api'
import type { StrategyRequest } from '../model/types'

export function useCreateStrategyMutation(accountId: string, onSuccess?: () => void) {
  const router = useRouter()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: StrategyRequest) => createStrategy(accountId, data),
    onSuccess: () => {
      toast.success('전략이 등록되었습니다')
      queryClient.invalidateQueries({ queryKey: ['strategies', accountId] })
      router.refresh()
      onSuccess?.()
    },
    onError: (err) => toast.error(err instanceof ApiError ? '저장에 실패했습니다' : '오류가 발생했습니다'),
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
      router.refresh()
      onSuccess?.()
    },
    onError: (err) => toast.error(err instanceof ApiError ? '저장에 실패했습니다' : '오류가 발생했습니다'),
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
    onError: () => toast.error('일시정지에 실패했습니다'),
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
    onError: () => toast.error('재개에 실패했습니다'),
  })
}

export function useExecuteStrategyMutation(strategyId: string | undefined) {
  return useMutation({
    mutationFn: () => executeStrategy(strategyId!),
  })
}
