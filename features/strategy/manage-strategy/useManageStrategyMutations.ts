'use client'

import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useDeleteStrategyMutation, useExecuteStrategyMutation, usePauseStrategyMutation, useResumeStrategyMutation } from '@entities/strategy'
import { orderKeys } from '@entities/order'
import { statsKeys } from '@entities/stats'
import { tradeKeys } from '@entities/trade'
import { apiMsg } from '@shared/lib/api-client'
import type { Strategy } from '@entities/strategy'

interface Options {
  onDeleted?: () => void
  strategyId?: string
}

export function useManageStrategyMutations({ onDeleted, strategyId }: Options = {}) {
  const queryClient = useQueryClient()
  const pauseMutation = usePauseStrategyMutation()
  const resumeMutation = useResumeStrategyMutation()
  const deleteMutation = useDeleteStrategyMutation()

  async function invalidateDependents() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: orderKeys.all }),
      queryClient.invalidateQueries({ queryKey: statsKeys.all }),
      queryClient.invalidateQueries({ queryKey: tradeKeys.all }),
    ])
  }

  const executeMutation = useExecuteStrategyMutation(strategyId, invalidateDependents)

  function pause(strategy: Strategy) {
    pauseMutation.mutate(strategy, {
      onSuccess: async () => {
        toast.success('전략을 일시정지했습니다')
        await invalidateDependents()
      },
      onError: (error) => toast.error(apiMsg(error, '일시정지에 실패했습니다')),
    })
  }

  function resume(strategy: Strategy) {
    resumeMutation.mutate(strategy, {
      onSuccess: async () => {
        toast.success('전략을 재개했습니다')
        await invalidateDependents()
      },
      onError: (error) => toast.error(apiMsg(error, '재개에 실패했습니다')),
    })
  }

  function remove(strategy: Strategy) {
    deleteMutation.mutate(strategy, {
      onSuccess: async () => {
        toast.success('전략이 삭제되었습니다')
        await invalidateDependents()
        onDeleted?.()
      },
      onError: (error) => toast.error(apiMsg(error, '삭제에 실패했습니다')),
    })
  }

  function execute() {
    executeMutation.mutate()
  }

  return {
    pause,
    resume,
    remove,
    execute,
    isPausing: pauseMutation.isPending,
    isResuming: resumeMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isExecuting: executeMutation.isPending,
  }
}
