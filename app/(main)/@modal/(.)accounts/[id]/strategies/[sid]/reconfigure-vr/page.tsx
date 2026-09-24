import { ReconfigureVrFormBody } from '@app/(main)/accounts/[id]/strategies/[sid]/reconfigure-vr/ReconfigureVrFormBody'
import { RouteModal } from '@shared/ui/RouteModal'

interface Props {
  params: Promise<{ id: string; sid: string }>
}

export default function ReconfigureVrModal({ params }: Props) {
  return (
    <RouteModal>
      <ReconfigureVrFormBody params={params} dismiss="back" />
    </RouteModal>
  )
}
