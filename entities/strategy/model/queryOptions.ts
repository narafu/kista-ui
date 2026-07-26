import { queryOptions } from '@tanstack/react-query'

import { listAllStrategies, listStrategies } from '../api'
import { strategyKeys } from './queryKeys'
import type { Strategy } from './types'

export function strategyListAllQueryOptions(token?: string) {
  return queryOptions<Strategy[]>({
    queryKey: strategyKeys.listAll(),
    queryFn: () => listAllStrategies(token),
  })
}

export function strategyListByAccountQueryOptions(accountId: string, token?: string) {
  return queryOptions<Strategy[]>({
    queryKey: strategyKeys.listByAccount(accountId),
    queryFn: () => listStrategies(accountId, token),
  })
}

export function strategyDetailQueryOptions(accountId: string, strategyId: string, token?: string) {
  return queryOptions<Strategy | null>({
    queryKey: strategyKeys.detail(strategyId),
    queryFn: async () => {
      const strategies = await listStrategies(accountId, token)
      return strategies.find((strategy) => strategy.id === strategyId) ?? null
    },
  })
}
