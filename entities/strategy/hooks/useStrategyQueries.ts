'use client'

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError, apiMsg } from '@shared/lib/api-client'
import { useDebouncedValue } from '@shared/lib/hooks/use-debounced-value'
import { upsertById, synchronizeListQueries } from '@shared/lib/query'
import {
  createStrategy,
  updateStrategy,
  reconfigureVr,
  injectCapital,
  withdrawCapital,
  reconfigureDca,
  listDcaExecutions,
  archiveStrategy,
  deleteStrategy,
  pauseStrategy,
  resumeStrategy,
  validateStrategy,
} from '../api'
import type { CapitalInjectionRequest, CapitalWithdrawalRequest, DcaConfigRequest, DcaExecutionFilters, DcaExecutionPage, ReconfigureVrRequest, Strategy, StrategyRequest, StrategyValidation, StrategyValidationTarget } from '../model/types'
import { strategyKeys } from '../model/queryKeys'
import {
  strategyDetailQueryOptions,
  strategyListAllQueryOptions,
  strategyListAllWithArchivedQueryOptions,
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
  // 통계용 보관 포함 목록은 부분 갱신 대신 무효화 — 보관 행은 새 목록을 받은 뒤에야 바뀐다
  await queryClient.invalidateQueries({ queryKey: strategyKeys.listAllWithArchived() })
}

// 저장 응답(Strategy)으로 상세·목록 캐시를 갱신하는 공통 mutation — 성공 토스트가 없으면 successMessage 생략
function useStrategySaveMutation<TVars>({ mutationFn, successMessage, errorMessage, onSuccess }: {
  mutationFn: (data: TVars) => Promise<Strategy>
  successMessage?: string
  errorMessage: string
  onSuccess?: () => void | Promise<void>
}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: async (saved) => {
      if (successMessage) toast.success(successMessage)
      queryClient.setQueryData(strategyKeys.detail(saved.id), saved)
      await synchronizeStrategyLists(queryClient, saved.accountId, (strategies) => upsertById(strategies, saved))
      return onSuccess?.()
    },
    onError: (err) => toast.error(apiMsg(err, errorMessage)),
  })
}

function updateStrategyStatus(strategies: Strategy[], id: string, status: string) {
  return strategies.map((strategy) => strategy.id === id ? { ...strategy, status } : strategy)
}

export const STRATEGY_VALIDATION_DEBOUNCE_MS = 400

// 등록·수정·VR 재설정 입력을 디바운스해 서버 검증을 부른다. 키가 바디라 늦게 온 이전 입력의 응답은 최신 입력의 결과가 되지 못한다.
// current는 "지금 입력"의 결과만(디바운스 대기·placeholder·실패면 undefined) — 제출 차단은 이것만 본다.
// data는 표시용 — keepWhile(이전 바디, 지금 바디)이 참이면 새 응답 전까지 이전 결과를 유지해 깜빡임을 막는다.
// 벤더 일시 오류(429·503)만 1회 재시도한다. 404(사용자 복제본 없음)·네트워크 오류는 isError로 둔다.
// 같은 바디의 재조회가 실패해도 받아 둔 결과는 그 입력의 결과로 남는다(거절이 입력 변화 없이 풀리지 않게)
export function useStrategyValidationQuery<TBody>(
  target: StrategyValidationTarget,
  body: TBody,
  options: { enabled: boolean; keepWhile?: (prev: TBody, next: TBody) => boolean },
) {
  const json = JSON.stringify(body)
  const debounced = useDebouncedValue(json, STRATEGY_VALIDATION_DEBOUNCE_MS)
  const targetKey = target.kind === 'create' ? `create:${target.accountId}` : `${target.kind}:${target.strategyId}`
  const query = useQuery<StrategyValidation>({
    queryKey: strategyKeys.validation(targetKey, debounced),
    queryFn: () => validateStrategy(target, JSON.parse(debounced)),
    enabled: options.enabled,
    retry: (count, err) => count < 1 && err instanceof ApiError && (err.status === 429 || err.status === 503),
    placeholderData: (prev, prevQuery) => {
      const prevBody = prevQuery?.queryKey[3]
      return options.keepWhile && typeof prevBody === 'string' && options.keepWhile(JSON.parse(prevBody), JSON.parse(debounced))
        ? keepPreviousData(prev)
        : undefined
    },
  })
  const settled = debounced === json
  // 디바운스 대기 중에도 같은 범위(keepWhile)의 결과만 보인다 — 유형을 바꾼 직후 이전 유형의 최소 시드를 쓰지 않게
  const sameScope = settled || (options.keepWhile?.(JSON.parse(debounced), body) ?? false)
  return {
    data: sameScope ? query.data : undefined,
    current: settled && !query.isPlaceholderData ? query.data : undefined,
    isLoading: query.isLoading,
    isError: query.isError && settled,
    refetch: query.refetch,
  }
}

export function useAllStrategiesQuery(options?: { enabled?: boolean }) {
  return useQuery({
    ...strategyListAllQueryOptions(),
    enabled: options?.enabled ?? true,
  })
}

export function useAllStrategiesWithArchivedQuery() {
  return useQuery(strategyListAllWithArchivedQueryOptions())
}

export function useStrategiesQuery(accountId: string) {
  return useQuery(strategyListByAccountQueryOptions(accountId))
}

export function useStrategyDetailQuery(accountId: string, strategyId: string) {
  return useQuery(strategyDetailQueryOptions(accountId, strategyId))
}

export function useCreateStrategyMutation(accountId: string, onSuccess?: (saved: Strategy) => void | Promise<void>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: StrategyRequest) => createStrategy(accountId, data),
    onSuccess: async (saved) => {
      queryClient.setQueryData(strategyKeys.detail(saved.id), saved)
      await synchronizeStrategyLists(queryClient, saved.accountId, (strategies) => upsertById(strategies, saved))
      return onSuccess?.(saved) // 등록 응답 전용 필드(todayOpenBatchMissed) 안내용
    },
    onError: (err) => toast.error(apiMsg(err, '저장에 실패했습니다.')),
  })
}

export function useUpdateStrategyMutation(strategyId: string, onSuccess?: () => void | Promise<void>) {
  return useStrategySaveMutation({
    mutationFn: (data: Partial<StrategyRequest>) => updateStrategy(strategyId, data),
    errorMessage: '저장에 실패했습니다.',
    onSuccess,
  })
}

export function useReconfigureVrMutation(strategyId: string, onSuccess?: () => void | Promise<void>) {
  return useStrategySaveMutation({
    mutationFn: (data: ReconfigureVrRequest) => reconfigureVr(strategyId, data),
    successMessage: 'VR 전략을 재설정했습니다',
    errorMessage: '재설정에 실패했습니다.',
    onSuccess,
  })
}

export function useInjectCapitalMutation(strategyId: string, onSuccess?: () => void | Promise<void>) {
  return useStrategySaveMutation({
    mutationFn: (data: CapitalInjectionRequest) => injectCapital(strategyId, data),
    successMessage: '투자금을 추가했습니다',
    errorMessage: '투자금 추가에 실패했습니다.',
    onSuccess,
  })
}

export function useWithdrawCapitalMutation(strategyId: string, onSuccess?: () => void | Promise<void>) {
  return useStrategySaveMutation({
    mutationFn: (data: CapitalWithdrawalRequest) => withdrawCapital(strategyId, data),
    successMessage: '투자금을 인출했습니다',
    errorMessage: '투자금 인출에 실패했습니다.',
    onSuccess,
  })
}

export function useReconfigureDcaMutation(strategyId: string, onSuccess?: () => void | Promise<void>) {
  return useStrategySaveMutation({
    mutationFn: (data: DcaConfigRequest) => reconfigureDca(strategyId, data),
    errorMessage: '저장에 실패했습니다.',
    onSuccess,
  })
}

export function useDcaExecutionsQuery(strategyId: string, page: number, size: number, filters?: DcaExecutionFilters, options?: { enabled?: boolean }) {
  return useQuery<DcaExecutionPage>({
    queryKey: strategyKeys.dcaExecutions(strategyId, page, size, filters),
    queryFn: () => listDcaExecutions(strategyId, page, size, filters),
    enabled: options?.enabled !== false,
    placeholderData: (prev) => prev, // 페이지 전환 중 이전 페이지 유지 — 표·페이지네이션 깜빡임 방지
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

// 삭제·보관 공통 — 상세 캐시를 지우고 일반 목록에서 뺀다. 보관 포함 목록(통계용)은 synchronizeStrategyLists가 무효화한다
function useRemoveFromListsMutation(mutationFn: (id: string) => Promise<void>, { dropFromArchivedList = false } = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (strategy: Strategy) => mutationFn(strategy.id),
    onSuccess: async (_result, strategy) => {
      queryClient.removeQueries({ queryKey: strategyKeys.detail(strategy.id) })
      // 삭제는 통계에서도 사라지므로 즉시 뺀다. 보관은 행이 새 목록 로드 전까지 남도록 건드리지 않는다
      if (dropFromArchivedList) {
        queryClient.setQueryData<Strategy[]>(strategyKeys.listAllWithArchived(), (list) => list?.filter((item) => item.id !== strategy.id))
      }
      await synchronizeStrategyLists(queryClient, strategy.accountId, (strategies) =>
        strategies.filter((item) => item.id !== strategy.id))
    },
  })
}

export function useDeleteStrategyMutation() {
  return useRemoveFromListsMutation((id) => deleteStrategy(id), { dropFromArchivedList: true })
}

export function useArchiveStrategyMutation() {
  return useRemoveFromListsMutation((id) => archiveStrategy(id))
}
