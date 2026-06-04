'use client'

import { useQuery } from '@tanstack/react-query'
import { getAccountCycleHistory, getStrategyCycleHistory } from '../api'
import type { CycleHistoryItem } from '../model/types'

type Params = { from?: string; to?: string } | null

export function useAccountCycleHistoryQuery(accountId: string, params: Params) {
  const { data: cycleHistory = [], isLoading } = useQuery<CycleHistoryItem[]>({
    queryKey: ['accountCycleHistory', accountId, params],
    queryFn: () =>
      getAccountCycleHistory(accountId, params!).catch((): CycleHistoryItem[] => []),
    enabled: params !== null,
    placeholderData: (prev) => prev,
  })
  return { cycleHistory, isLoading }
}

export function useStrategyCycleHistoryQuery(strategyId: string | undefined, params: Params) {
  const { data: cycleHistory = [], isLoading } = useQuery<CycleHistoryItem[]>({
    queryKey: ['strategyCycleHistory', strategyId, params],
    queryFn: () =>
      getStrategyCycleHistory(strategyId!, params!).catch((): CycleHistoryItem[] => []),
    enabled: params !== null && !!strategyId,
    placeholderData: (prev) => prev,
  })
  return { cycleHistory, isLoading }
}
