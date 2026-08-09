import { notFound } from 'next/navigation'
import { PageHeader } from '@widgets/page-header'
import { AssetFormPage, loadAssetById } from '@features/asset/save-asset'
import { RouteModal } from '@shared/ui/RouteModal'
import { getAuthToken } from '@shared/lib/auth/token'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditAssetModal({ params }: Props) {
  const [{ id }, token] = await Promise.all([params, getAuthToken()])

  if (!token) {
    return notFound()
  }

  const asset = await loadAssetById(id, token)
  if (!asset) {
    return notFound()
  }

  return (
    <RouteModal>
      <PageHeader eyebrow="자산 관리" eyebrowHref="/assets" title="자산 수정" />
      <AssetFormPage mode="edit" initial={asset} dismiss="back" />
    </RouteModal>
  )
}
