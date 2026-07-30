'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError, apiMsg } from '@shared/lib/api-client'
import { upsertById, synchronizeListQueries } from '@shared/lib/query'
import {
  createStrategy,
  updateStrategy,
  reconfigureVr,
  deleteStrategy,
  pauseStrategy,
  resumeStrategy,
  executeStrategy,
  getStrategySeedPreview,
} from '../api'
import type { ReconfigureVrRequest, Strategy, StrategyRequest, StrategySeedPreview } from '../model/types'
import { strategyKeys } from '../model/queryKeys'
import {
  strategyDetailQueryOptions,
  strategyListAllQueryOptions,
  strategyListByAccountQueryOptions,
} from '../model/queryOptions'

async function synchronizeStrategyLists(
  queryClient: QueryClient,
  accountId: string,
  update: (strategies: Strategy[]) => Strategy[],
) {
  await synchronizeListQueries(
    queryClient,
    [
      {
        queryKey: strategyKeys.listAll(),
        fetchCompleteList: () => queryClient.fetchQuery(strategyListAllQueryOptions()),
      },
      {
        queryKey: strategyKeys.listByAccount(accountId),
        fetchCompleteList: () => queryClient.fetchQuery(strategyListByAccountQueryOptions(accountId)),
      },
    ],
    update,
  )
}

function updateStrategyStatus(strategies: Strategy[], id: string, status: string) {
  return strategies.map((strategy) => strategy.id === id ? { ...strategy, status } : strategy)
}

export function useStrategySeedPreviewQuery(
  accountId: string,
  params: { type: string; ticker: string; divisionCount: number },
  options?: { enabled?: boolean },
) {
  return useQuery<StrategySeedPreview>({
    queryKey: strategyKeys.seedPreview(accountId, params.type, params.ticker, params.divisionCount),
    queryFn: () => getStrategySeedPreview(accountId, params),
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
  })
}

export function useAllStrategiesQuery(options?: { enabled?: boolean }) {
  return useQuery({
    ...strategyListAllQueryOptions(),
    enabled: options?.enabled ?? true,
  })
}

export function useStrategiesQuery(accountId: string) {
  return useQuery(strategyListByAccountQueryOptions(accountId))
}

export function useStrategyDetailQuery(accountId: string, strategyId: string) {
  return useQuery(strategyDetailQueryOptions(accountId, strategyId))
}

export function useCreateStrategyMutation(accountId: string, onSuccess?: () => void | Promise<void>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: StrategyRequest) => createStrategy(accountId, data),
    onSuccess: async (saved) => {
      queryClient.setQueryData(strategyKeys.detail(saved.id), saved)
      await synchronizeStrategyLists(queryClient, saved.accountId, (strategies) => upsertById(strategies, saved))
      return onSuccess?.()
    },
    onError: (err) => toast.error(apiMsg(err, '저장에 실패했습니다')),
  })
}

export function useUpdateStrategyMutation(strategyId: string, onSuccess?: () => void | Promise<void>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<StrategyRequest>) => updateStrategy(strategyId, data),
    onSuccess: async (saved) => {
      queryClient.setQueryData(strategyKeys.detail(saved.id), saved)
      await synchronizeStrategyLists(queryClient, saved.accountId, (strategies) => upsertById(strategies, saved))
      return onSuccess?.()
    },
    onError: (err) => toast.error(apiMsg(err, '저장에 실패했습니다')),
  })
}

export function useReconfigureVrMutation(strategyId: string, onSuccess?: () => void | Promise<void>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ReconfigureVrRequest) => reconfigureVr(strategyId, data),
    onSuccess: async (saved) => {
      toast.success('VR 전략이 재설정되었습니다')
      queryClient.setQueryData(strategyKeys.detail(saved.id), saved)
      await synchronizeStrategyLists(queryClient, saved.accountId, (strategies) => upsertById(strategies, saved))
      return onSuccess?.()
    },
    onError: (err) => toast.error(apiMsg(err, '재설정에 실패했습니다')),
  })
}

export function usePauseStrategyMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (strategy: Strategy) => pauseStrategy(strategy.id),
    onSuccess: async (_result, strategy) => {
      queryClient.setQueryData<Strategy>(strategyKeys.detail(strategy.id), (detail) => ({
        ...(detail ?? strategy),
        status: 'PAUSED',
      }))
      await synchronizeStrategyLists(queryClient, strategy.accountId, (strategies) =>
        updateStrategyStatus(strategies, strategy.id, 'PAUSED'))
    },
  })
}

export function useResumeStrategyMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (strategy: Strategy) => resumeStrategy(strategy.id),
    onSuccess: async (_result, strategy) => {
      queryClient.setQueryData<Strategy>(strategyKeys.detail(strategy.id), (detail) => ({
        ...(detail ?? strategy),
        status: 'ACTIVE',
      }))
      await synchronizeStrategyLists(queryClient, strategy.accountId, (strategies) =>
        updateStrategyStatus(strategies, strategy.id, 'ACTIVE'))
    },
  })
}

export function useDeleteStrategyMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (strategy: Strategy) => deleteStrategy(strategy.id),
    onSuccess: async (_result, strategy) => {
      queryClient.removeQueries({ queryKey: strategyKeys.detail(strategy.id) })
      await synchronizeStrategyLists(queryClient, strategy.accountId, (strategies) =>
        strategies.filter((item) => item.id !== strategy.id))
    },
  })
}

export function useExecuteStrategyMutation(strategyId: string | undefined, onSuccess?: () => void | Promise<void>) {
  return useMutation({
    mutationFn: () => executeStrategy(strategyId!),
    onSuccess: () => {
      toast.success('매매 실행이 요청됐습니다. 장 마감 후 체결 결과를 확인하세요.')
      return onSuccess?.()
    },
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
