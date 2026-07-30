import { QueryClient } from '@tanstack/react-query'

export const QUERY_DEFAULT_STALE_TIME = 30_000
export const QUERY_DEFAULT_GC_TIME = 10 * 60_000

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: QUERY_DEFAULT_STALE_TIME,
        gcTime: QUERY_DEFAULT_GC_TIME,
        retry: 0,
        refetchOnWindowFocus: false,
      },
    },
  })
}
