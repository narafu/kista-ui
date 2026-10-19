import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { getAuthToken } from '@shared/lib/auth/token'
import { createQueryClient } from '@shared/lib/query'
import { meQueryOptions } from '@entities/user'
import { AssetSettingsPanel } from '@widgets/asset-settings/AssetSettingsPanel'

// StrategySuggestionManager가 useMeQuery()로 분기한다 — 서버에 me가 없으면 로딩 행을 그리는데, 레이아웃(FcmBridge)의
// 같은 쿼리가 이 세그먼트 hydration 전에 끝나면 클라이언트는 편집기를 그려 hydration 불일치가 난다(/settings와 같은 처리)
export default async function FinanceSettingsPage() {
  const token = await getAuthToken()
  const queryClient = createQueryClient()
  if (token) await queryClient.prefetchQuery(meQueryOptions(token))

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AssetSettingsPanel />
    </HydrationBoundary>
  )
}
