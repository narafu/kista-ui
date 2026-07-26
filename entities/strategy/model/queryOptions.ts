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
