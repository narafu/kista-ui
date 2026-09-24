import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { getAuthToken } from '@shared/lib/auth/token'
import { adminPrivacyBasesQueryOptions } from '@entities/privacy'
import { AdminPrivacyBaseTable } from '@widgets/admin-privacy-trade-list/AdminPrivacyBaseTable'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { UrlRangeFilterBar } from '@shared/ui/UrlRangeFilterBar'
import { parsePage, parseRangePreset, parseSize, resolveRange } from '@shared/lib/date-range'
import { createQueryClient } from '@shared/lib/query'

export default async function AdminPrivacyTradesPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; size?: string; page?: string; from?: string; to?: string }>
}) {
  const { range: rawRange, size: rawSize, page: rawPage, from, to } = await searchParams
  const range = parseRangePreset(rawRange, '7d')
  const size = parseSize(rawSize)
  const page = parsePage(rawPage)
  const sizeStr = String(size)

  const token = await getAuthToken()
  const queryClient = createQueryClient()
  if (token) await queryClient.prefetchQuery(adminPrivacyBasesQueryOptions(token))

  const { from: windowFrom, to: windowTo } = resolveRange(range, from, to)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold">P 매매표</h1>
        <p className="text-sm text-muted-foreground mt-1">PRIVACY 전략 P 매매표 및 주문 명세</p>
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <UrlRangeFilterBar current={range} from={from} to={to} />
        <PageSizeSelector value={sizeStr} />
      </div>

      <HydrationBoundary state={dehydrate(queryClient)}>
        {/* totalPages/PaginationBar는 위젯이 canonical 쿼리 캐시에서 직접 계산해 렌더한다 —
            SSR 스냅샷으로 한 번만 계산하면 뮤테이션으로 캐시가 갱신돼도 totalPages가
            갱신되지 않아, 방금 등록한 항목이 도달 불가능한 뒷 페이지에 남는 문제가 있었다
            (리뷰에서 발견). page는 원본(clamp 전) 값을 그대로 넘기고 위젯이 클램프한다. */}
        <AdminPrivacyBaseTable windowFrom={windowFrom} windowTo={windowTo} pageSize={size} page={page} />
      </HydrationBoundary>
    </div>
  )
}
