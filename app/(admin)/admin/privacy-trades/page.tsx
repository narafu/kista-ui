import type { Metadata } from 'next'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { getAuthToken } from '@shared/lib/auth/token'
import { getMetaBundle } from '@entities/meta'
import { adminPrivacyBasesQueryOptions } from '@entities/privacy'
import { AdminPrivacyBaseTable, PrivacyBaseChart } from '@widgets/admin-privacy-trade-list'
import { PageHeader } from '@widgets/page-header'
import { UrlRangeFilterBar } from '@shared/ui/UrlRangeFilterBar'
import { parsePage, parseRangePreset, parseSize, resolveRange } from '@shared/lib/date-range'
import type { RangePreset } from '@shared/lib/date-range'
import { createQueryClient } from '@shared/lib/query'

// 매매표는 장기 추이를 보는 화면이라 7·30일 대신 올해·90·180일 프리셋을 노출한다
const PRESETS: RangePreset[] = ['ytd', '90d', '180d', 'all', 'custom']

export const metadata: Metadata = {
  title: 'P 매매표',
}

export default async function AdminPrivacyTradesPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; size?: string; page?: string; from?: string; to?: string }>
}) {
  const { range: rawRange, size: rawSize, page: rawPage, from, to } = await searchParams
  // 이 화면에 없는 프리셋(예: 예전 링크의 ?range=7d)은 기본값으로 돌린다
  const range = parseRangePreset(rawRange, 'ytd', PRESETS)
  const size = parseSize(rawSize)
  const page = parsePage(rawPage)

  const token = await getAuthToken()
  const privacyType = (await getMetaBundle()).strategyTypes.find((type) => type.code === 'PRIVACY')
  const privacyLabel = privacyType?.label ?? privacyType?.description ?? 'PRIVACY'
  const queryClient = createQueryClient()
  if (token) await queryClient.prefetchQuery(adminPrivacyBasesQueryOptions(token))

  // '올해'는 1월 1일이 아니라 종목별 마지막 연초 재설정일(사이클 시작금액 1만 달러 초기화)부터라
  // 매매표 데이터로 위젯이 직접 정한다
  const sinceYearlyReset = range === 'ytd'
  const { from: windowFrom, to: windowTo } = sinceYearlyReset ? {} : resolveRange(range, from, to)

  return (
    <div>
      <PageHeader title="P 매매표" description={`${privacyLabel} 매매표 및 주문 명세`} />

      <div className="mb-4">
        <UrlRangeFilterBar current={range} from={from} to={to} presets={PRESETS} />
      </div>

      <HydrationBoundary state={dehydrate(queryClient)}>
        {/* totalPages/PaginationBar는 위젯이 canonical 쿼리 캐시에서 직접 계산해 렌더한다 —
            SSR 스냅샷으로 한 번만 계산하면 뮤테이션으로 캐시가 갱신돼도 totalPages가
            갱신되지 않아, 방금 등록한 항목이 도달 불가능한 뒷 페이지에 남는 문제가 있었다
            (리뷰에서 발견). page는 원본(clamp 전) 값을 그대로 넘기고 위젯이 클램프한다. */}
        <PrivacyBaseChart windowFrom={windowFrom} windowTo={windowTo} sinceYearlyReset={sinceYearlyReset} />
        <AdminPrivacyBaseTable windowFrom={windowFrom} windowTo={windowTo} sinceYearlyReset={sinceYearlyReset} pageSize={size} page={page} />
      </HydrationBoundary>
    </div>
  )
}
