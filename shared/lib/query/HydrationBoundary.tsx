'use client'

import { useMemo } from 'react'
import {
  HydrationBoundary as TanstackHydrationBoundary,
  hydrate,
  useQueryClient,
  type HydrationBoundaryProps,
} from '@tanstack/react-query'

// TanStack HydrationBoundary는 캐시에 이미 있는 쿼리를 useEffect에서야 hydrate한다.
// 레이아웃(FcmBridge의 useMeQuery)이 같은 쿼리를 먼저 만들면, 브라우저 첫 렌더에는 데이터가 없어
// 서버 HTML과 달라진다(hydration 불일치). 이미 있지만 데이터가 없는 쿼리만 렌더 중에 바로 채운다 —
// 기존 데이터가 없으니 이미 그려진 다른 컴포넌트와 값이 어긋날 일도 없다. 나머지는 TanStack 동작 그대로다.
export function HydrationBoundary({ state, options, queryClient, children }: HydrationBoundaryProps) {
  const client = useQueryClient(queryClient)
  useMemo(() => {
    if (!state?.queries) return
    const cache = client.getQueryCache()
    const queries = state.queries.filter((query) => {
      const existing = cache.get(query.queryHash)
      return existing !== undefined && existing.state.data === undefined && query.state.data !== undefined
    })
    if (queries.length > 0) hydrate(client, { queries }, options)
  }, [client, state, options])

  return (
    <TanstackHydrationBoundary state={state} options={options} queryClient={queryClient}>
      {children}
    </TanstackHydrationBoundary>
  )
}
