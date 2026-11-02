import { WithdrawCapitalFormBody } from '@app/(main)/accounts/[id]/strategies/[sid]/withdraw-capital/WithdrawCapitalFormBody'
import { RouteModal } from '@shared/ui/RouteModal'

interface Props {
  params: Promise<{ id: string; sid: string }>
}

export default function WithdrawCapitalModal({ params }: Props) {
  return (
    <RouteModal>
      <WithdrawCapitalFormBody params={params} dismiss="back" />
    </RouteModal>
  )
}
