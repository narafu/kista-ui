import { NewStrategyFormBody } from '@app/(main)/accounts/[id]/strategies/new/NewStrategyFormBody'
import { RouteModal } from '@shared/ui/RouteModal'

interface Props {
  params: Promise<{ id: string }>
}

export default function NewStrategyModal({ params }: Props) {
  return (
    <RouteModal>
      <NewStrategyFormBody params={params} dismiss="back" />
    </RouteModal>
  )
}
