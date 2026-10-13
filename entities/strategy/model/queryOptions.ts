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

// 상세 전용 API가 없어 계좌별 목록에서 찾는다. 목록을 직접 호출하지 않고 목록 캐시(fetchQuery)를 거쳐
// 체결 무효화처럼 list·detail이 함께 재조회될 때 진행 중인 목록 요청을 공유한다(중복 호출 방지)
export function strategyDetailQueryOptions(accountId: string, strategyId: string, token?: string) {
  return queryOptions<Strategy | null>({
    queryKey: strategyKeys.detail(strategyId),
    queryFn: async ({ client }) => {
      const strategies = await client.fetchQuery(strategyListByAccountQueryOptions(accountId, token))
      return strategies.find((strategy) => strategy.id === strategyId) ?? null
    },
  })
}
