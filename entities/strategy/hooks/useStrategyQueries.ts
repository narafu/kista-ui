'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
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
import { strategyKeys } from '../model/queryKeys'
import { strategyListAllQueryOptions, strategyListByAccountQueryOptions } from '../model/queryOptions'

type StrategyListKey = ReturnType<typeof strategyKeys.listAll> | ReturnType<typeof strategyKeys.listByAccount>

function updateKnownStrategyList(
  queryClient: QueryClient,
  queryKey: StrategyListKey,
  update: (strategies: Strategy[]) => Strategy[],
) {
  const strategies = queryClient.getQueryData<Strategy[]>(queryKey)
  if (strategies === undefined) {
    void queryClient.invalidateQueries({ queryKey })
    return
  }

  queryClient.setQueryData<Strategy[]>(queryKey, update(strategies))
}

function upsertStrategy(strategies: Strategy[], saved: Strategy) {
  const exists = strategies.some((strategy) => strategy.id === saved.id)

  if (!exists) return [...strategies, saved]

  return strategies.map((strategy) => strategy.id === saved.id ? saved : strategy)
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

export function useCreateStrategyMutation(accountId: string, onSuccess?: () => void | Promise<void>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: StrategyRequest) => createStrategy(accountId, data),
    onSuccess: (saved) => {
      updateKnownStrategyList(queryClient, strategyKeys.listAll(), (strategies) => upsertStrategy(strategies, saved))
      updateKnownStrategyList(queryClient, strategyKeys.listByAccount(saved.accountId), (strategies) => upsertStrategy(strategies, saved))
      return onSuccess?.()
    },
    onError: (err) => toast.error(apiMsg(err, '저장에 실패했습니다')),
  })
}

export function useUpdateStrategyMutation(strategyId: string, onSuccess?: () => void | Promise<void>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<StrategyRequest>) => updateStrategy(strategyId, data),
    onSuccess: (saved) => {
      updateKnownStrategyList(queryClient, strategyKeys.listAll(), (strategies) => upsertStrategy(strategies, saved))
      updateKnownStrategyList(queryClient, strategyKeys.listByAccount(saved.accountId), (strategies) => upsertStrategy(strategies, saved))
      return onSuccess?.()
    },
    onError: (err) => toast.error(apiMsg(err, '저장에 실패했습니다')),
  })
}

export function usePauseStrategyMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (strategy: Strategy) => pauseStrategy(strategy.id),
    onSuccess: (_result, strategy) => {
      updateKnownStrategyList(queryClient, strategyKeys.listAll(), (strategies) =>
        updateStrategyStatus(strategies, strategy.id, 'PAUSED'))
      updateKnownStrategyList(queryClient, strategyKeys.listByAccount(strategy.accountId), (strategies) =>
        updateStrategyStatus(strategies, strategy.id, 'PAUSED'))
    },
  })
}

export function useResumeStrategyMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (strategy: Strategy) => resumeStrategy(strategy.id),
    onSuccess: (_result, strategy) => {
      updateKnownStrategyList(queryClient, strategyKeys.listAll(), (strategies) =>
        updateStrategyStatus(strategies, strategy.id, 'ACTIVE'))
      updateKnownStrategyList(queryClient, strategyKeys.listByAccount(strategy.accountId), (strategies) =>
        updateStrategyStatus(strategies, strategy.id, 'ACTIVE'))
    },
  })
}

export function useDeleteStrategyMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (strategy: Strategy) => deleteStrategy(strategy.id),
    onSuccess: (_result, strategy) => {
      updateKnownStrategyList(queryClient, strategyKeys.listAll(), (strategies) =>
        strategies.filter((item) => item.id !== strategy.id))
      updateKnownStrategyList(queryClient, strategyKeys.listByAccount(strategy.accountId), (strategies) =>
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
