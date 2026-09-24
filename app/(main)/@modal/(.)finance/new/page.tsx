import { NewAssetFormBody } from '@app/(main)/finance/new/NewAssetFormBody'
import { RouteModal } from '@shared/ui/RouteModal'

interface Props {
  searchParams: Promise<{ duplicateFrom?: string }>
}

export default function NewAssetModal({ searchParams }: Props) {
  return (
    <RouteModal>
      <NewAssetFormBody searchParams={searchParams} dismiss="back" />
    </RouteModal>
  )
}
