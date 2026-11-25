import { dehydrate } from '@tanstack/react-query'
import { getAuthToken } from '@shared/lib/auth/token'
import { HydrationBoundary, createQueryClient } from '@shared/lib/query'
import { meQueryOptions } from '@entities/user'
import { AssetSettingsPanel } from '@widgets/asset-settings/AssetSettingsPanel'

// StrategySuggestionManager가 useMeQuery()로 분기한다 — 서버에 me가 없으면 로딩 행을 그린다. 레이아웃(FcmBridge)이 같은 쿼리를
// 먼저 만들어도 @shared/lib/query의 HydrationBoundary가 첫 렌더에 채워 서버와 같은 편집기를 그린다(/settings와 같은 처리)
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
