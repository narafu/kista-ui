import { BudgetListBody } from '@app/(main)/finance/budgets/[type]/BudgetListBody'
import { RouteModal } from '@shared/ui/RouteModal'

interface Props {
  params: Promise<{ type: string }>
}

export default function BudgetListModal({ params }: Props) {
  return (
    <RouteModal>
      <BudgetListBody params={params} />
    </RouteModal>
  )
}
