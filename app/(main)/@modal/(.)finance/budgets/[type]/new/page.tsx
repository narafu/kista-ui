import { NewBudgetFormBody } from '@app/(main)/finance/budgets/[type]/new/NewBudgetFormBody'
import { RouteModal } from '@shared/ui/RouteModal'

interface Props {
  params: Promise<{ type: string }>
  searchParams: Promise<{ duplicateFrom?: string; categoryId?: string }>
}

export default function NewBudgetModal({ params, searchParams }: Props) {
  return (
    <RouteModal>
      <NewBudgetFormBody params={params} searchParams={searchParams} dismiss="back" />
    </RouteModal>
  )
}
