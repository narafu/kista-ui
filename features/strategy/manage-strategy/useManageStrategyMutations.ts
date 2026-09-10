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
      queryClient.invalidateQueries({ queryKey: orderKeys.all }).catch(() => null),
      queryClient.invalidateQueries({ queryKey: statsKeys.all }).catch(() => null),
      queryClient.invalidateQueries({ queryKey: tradeKeys.all }).catch(() => null),
    ])
  }

  function withActionFeedback<TVariables>(
    mutation: { mutate: (variables: TVariables, opts: { onSuccess: () => void; onError: (error: unknown) => void }) => void },
    variables: TVariables,
    successMessage: string,
    errorFallback: string,
    after?: () => void,
  ) {
    mutation.mutate(variables, {
      onSuccess: async () => {
        toast.success(successMessage)
        await invalidateDependents()
        after?.()
      },
      onError: (error) => toast.error(apiMsg(error, errorFallback)),
    })
  }

  const executeMutation = useExecuteStrategyMutation(strategyId, invalidateDependents)

  function pause(strategy: Strategy) {
    withActionFeedback(pauseMutation, strategy, '전략을 일시정지했습니다', '일시정지에 실패했습니다')
  }

  function resume(strategy: Strategy) {
    withActionFeedback(resumeMutation, strategy, '전략을 재개했습니다', '재개에 실패했습니다')
  }

  function remove(strategy: Strategy) {
    withActionFeedback(deleteMutation, strategy, '전략이 삭제되었습니다', '삭제에 실패했습니다', onDeleted)
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
