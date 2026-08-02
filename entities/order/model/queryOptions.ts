import { queryOptions } from '@tanstack/react-query'
import { getStrategyOrdersPreview } from '../api'
import { orderKeys } from './queryKeys'
import type { NextOrderPreview } from './types'

export function orderPreviewQueryOptions(strategyId: string, token?: string) {
  return queryOptions<NextOrderPreview>({
    queryKey: orderKeys.preview(strategyId),
    queryFn: () => getStrategyOrdersPreview(strategyId, token),
    retry: false,
    staleTime: 60_000,
  })
}
