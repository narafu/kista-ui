import type { Metadata } from 'next'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { getAuthToken } from '@shared/lib/auth/token'
import { adminTradesQueryOptions } from '@entities/admin'
import type { AdminTrade } from '@entities/admin'
import { UrlRangeFilterBar } from '@shared/ui/UrlRangeFilterBar'
import { PageHeader } from '@widgets/page-header'
import { AdminTradesWorkbench } from '@widgets/admin-trade-list'
import { parsePage, parseRangePreset, parseSize, resolveRange } from '@shared/lib/date-range'
import { createQueryClient } from '@shared/lib/query'

export const metadata: Metadata = {
  title: '주문 관리 | KISTA',
}

export default async function AdminTradesPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; size?: string; page?: string; from?: string; to?: string }>
}) {
  const { range: rawRange, size: rawSize, page: rawPage, from, to } = await searchParams
  const range = parseRangePreset(rawRange, '7d')
  const size = parseSize(rawSize)
  const { from: resolvedFrom, to: resolvedTo } = resolveRange(range, from, to)

  // 조회 실패는 캐시에 남지 않는다 — 위젯이 같은 쿼리를 클라이언트에서 다시 조회해 오류를 보여주고 재시도한다
  const params = { from: resolvedFrom, to: resolvedTo }
  const token = await getAuthToken()
  const queryClient = createQueryClient()
  if (token) await queryClient.prefetchQuery(adminTradesQueryOptions(params, token))
  const loaded = queryClient.getQueryData<AdminTrade[]>(adminTradesQueryOptions(params).queryKey)

  return (
    <div className="reveal-stagger">
      <PageHeader title="주문 관리" description={loaded ? `조회 기간 총 ${loaded.length}건` : undefined} />

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <UrlRangeFilterBar current={range} from={from} to={to} />
      </div>

      <HydrationBoundary state={dehydrate(queryClient)}>
        <AdminTradesWorkbench
          from={resolvedFrom}
          to={resolvedTo}
          initialPage={parsePage(rawPage)}
          initialSize={size}
        />
      </HydrationBoundary>
    </div>
  )
}
