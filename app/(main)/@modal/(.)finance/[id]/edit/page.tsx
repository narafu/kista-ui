import { notFound } from 'next/navigation'
import { PageHeader } from '@widgets/page-header'
import { AssetFormPage, loadAssetSnapshotById } from '@features/asset/save-asset'
import { RouteModal } from '@shared/ui/RouteModal'
import { getAuthToken } from '@shared/lib/auth/token'
import { getActiveGroupId } from '@shared/lib/auth/activeGroup'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditAssetModal({ params }: Props) {
  const [{ id }, token, groupId] = await Promise.all([params, getAuthToken(), getActiveGroupId()])

  if (!token) {
    return notFound()
  }

  const asset = await loadAssetSnapshotById(id, groupId, token)
  if (!asset) {
    return notFound()
  }

  return (
    <RouteModal>
      <PageHeader eyebrow="자산 관리" eyebrowHref="/finance" title="자산 수정" />
      <AssetFormPage mode="edit" initial={asset} dismiss="back" />
    </RouteModal>
  )
}
