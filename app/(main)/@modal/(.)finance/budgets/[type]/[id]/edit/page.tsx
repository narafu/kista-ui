import { EditBudgetFormBody } from '@app/(main)/finance/budgets/[type]/[id]/edit/EditBudgetFormBody'
import { RouteModal } from '@shared/ui/RouteModal'

interface Props {
  params: Promise<{ type: string; id: string }>
}

export default function EditBudgetModal({ params }: Props) {
  return (
    <RouteModal>
      <EditBudgetFormBody params={params} dismiss="back" />
    </RouteModal>
  )
}
