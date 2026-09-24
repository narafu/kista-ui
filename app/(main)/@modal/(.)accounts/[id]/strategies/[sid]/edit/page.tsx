import { EditStrategyFormBody } from '@app/(main)/accounts/[id]/strategies/[sid]/edit/EditStrategyFormBody'
import { RouteModal } from '@shared/ui/RouteModal'

interface Props {
  params: Promise<{ id: string; sid: string }>
}

export default function EditStrategyModal({ params }: Props) {
  return (
    <RouteModal>
      <EditStrategyFormBody params={params} dismiss="back" />
    </RouteModal>
  )
}
