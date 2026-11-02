import { InjectCapitalFormBody } from '@app/(main)/accounts/[id]/strategies/[sid]/inject-capital/InjectCapitalFormBody'
import { RouteModal } from '@shared/ui/RouteModal'

interface Props {
  params: Promise<{ id: string; sid: string }>
}

export default function InjectCapitalModal({ params }: Props) {
  return (
    <RouteModal>
      <InjectCapitalFormBody params={params} dismiss="back" />
    </RouteModal>
  )
}
