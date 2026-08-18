import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageHeader } from '@widgets/page-header'
import { AssetFormPage, loadAssetSnapshotById } from '@features/asset/save-asset'
import { getAuthToken } from '@shared/lib/auth/token'

interface Props {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: '자산 수정 | KISTA',
  description: '자산·부채 기록을 수정합니다',
}

export default async function EditAssetPage({ params }: Props) {
  const [{ id }, token] = await Promise.all([params, getAuthToken()])

  if (!token) {
    return notFound()
  }

  const asset = await loadAssetSnapshotById(id, token)
  if (!asset) {
    return notFound()
  }

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader eyebrow="자산 관리" eyebrowHref="/assets" title="자산 수정" />
      <AssetFormPage mode="edit" initial={asset} />
    </div>
  )
}
