import { queryOptions } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
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

// 계좌 단위 배치 조회 결과를 전략별 preview 캐시에 심는다 — initialData prop과 달리 dehydrate/hydrate를 타므로
// router.refresh()(체결 SSE·당겨서 새로고침)로 다시 받은 서버 값이 이미 채워진 클라이언트 캐시를 덮어쓴다
export function seedOrderPreviews(queryClient: QueryClient, previews: Record<string, NextOrderPreview>) {
  for (const [strategyId, preview] of Object.entries(previews)) {
    queryClient.setQueryData(orderKeys.preview(strategyId), preview)
  }
}
