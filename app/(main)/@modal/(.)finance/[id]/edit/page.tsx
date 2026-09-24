import { EditAssetFormBody } from '@app/(main)/finance/[id]/edit/EditAssetFormBody'
import { RouteModal } from '@shared/ui/RouteModal'

interface Props {
  params: Promise<{ id: string }>
}

export default function EditAssetModal({ params }: Props) {
  return (
    <RouteModal>
      <EditAssetFormBody params={params} dismiss="back" />
    </RouteModal>
  )
}
