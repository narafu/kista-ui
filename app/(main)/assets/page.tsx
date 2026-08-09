import type { Metadata } from 'next'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { getAuthToken } from '@shared/lib/auth/token'
import { assetListQueryOptions } from '@entities/asset'
import { AssetRecordList } from '@widgets/asset-record-list'
import { NewAssetButton } from '@features/asset/save-asset'
import { PageHeader } from '@widgets/page-header'
import { createQueryClient } from '@shared/lib/query'

export const metadata: Metadata = {
  title: '자산 | KISTA',
  description: '개인 자산·부채 기록을 관리합니다',
}

export default async function AssetsPage() {
  const token = await getAuthToken()
  const queryClient = createQueryClient()
  if (token) {
    await queryClient.prefetchQuery(assetListQueryOptions(token)).catch(() => undefined)
  }
  return (
    <>
      <PageHeader eyebrow="자산 관리" title="내 자산" actions={<NewAssetButton />} />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <AssetRecordList />
      </HydrationBoundary>
    </>
  )
}
