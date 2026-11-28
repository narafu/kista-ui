import { dehydrate } from '@tanstack/react-query'
import { getAuthToken } from '@shared/lib/auth/token'
import { assetSummaryQueryOptions } from '@entities/finance'
import { HydrationBoundary, createQueryClient } from '@shared/lib/query'
import { AssetTabView } from './AssetTabView'

// 자산 탭 기본 월(최근 기록 월) 요약을 프리페치한다 — 없으면 첫 렌더가 이번 달로 조회했다가 최근 기록 월로
// 다시 조회한다. 수입/소비/저축 탭엔 필요 없어 layout이 아니라 여기서 한다.
export default async function FinanceAssetPage() {
  const token = await getAuthToken()
  const queryClient = createQueryClient()
  if (token) {
    await queryClient.prefetchQuery(assetSummaryQueryOptions(undefined, token)).catch(() => undefined)
  }
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AssetTabView />
    </HydrationBoundary>
  )
}
