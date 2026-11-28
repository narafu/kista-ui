import { dehydrate } from '@tanstack/react-query'
import { getAuthToken } from '@shared/lib/auth/token'
import { assetSnapshotListQueryOptions, assetSummaryQueryOptions } from '@entities/finance'
import { todayKst } from '@shared/lib/format'
import { HydrationBoundary, createQueryClient } from '@shared/lib/query'
import { AssetTabView } from './AssetTabView'

// 자산 탭 기본 월(최근 기록 월) 요약과 그 달 자산 기록 목록을 프리페치한다 — 없으면 첫 렌더가 이번 달로 조회했다가
// 최근 기록 월로 다시 조회한다. 목록은 월 필수라 요약 응답의 month를 받은 뒤 이어서 받는다(AssetTabView의 기본 월과 같은 값).
// 수입/소비/저축 탭엔 필요 없어 layout이 아니라 여기서 한다.
export default async function FinanceAssetPage() {
  const token = await getAuthToken()
  const queryClient = createQueryClient()
  if (token) {
    const summary = await queryClient.fetchQuery(assetSummaryQueryOptions(undefined, token)).catch(() => undefined)
    await queryClient
      .prefetchQuery(assetSnapshotListQueryOptions(summary?.month ?? todayKst().slice(0, 7), token))
      .catch(() => undefined)
  }
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AssetTabView />
    </HydrationBoundary>
  )
}
