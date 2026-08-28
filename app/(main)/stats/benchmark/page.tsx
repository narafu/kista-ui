import type { Metadata } from 'next'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { HousingBenchmarkComparison } from '@widgets/benchmark-comparison'
import { getAuthToken } from '@shared/lib/auth/token'
import { accountListQueryOptions } from '@entities/account'
import { strategyListAllQueryOptions } from '@entities/strategy'
import { createQueryClient } from '@shared/lib/query'
import { todayKst } from '@shared/lib/format'

export const metadata: Metadata = {
  title: '벤치마크 | KISTA',
}

export default async function BenchmarkPage() {
  const token = await getAuthToken()

  const queryClient = createQueryClient()
  if (token) {
    await Promise.all([
      queryClient.prefetchQuery(accountListQueryOptions(token)).catch(() => undefined),
      queryClient.prefetchQuery(strategyListAllQueryOptions(token)).catch(() => undefined),
    ])
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HousingBenchmarkComparison enabled defaultTo={todayKst()} />
    </HydrationBoundary>
  )
}
