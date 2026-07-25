import { notFound } from 'next/navigation'
import { PageHeader } from '@widgets/page-header'
import { StrategyFormPage, loadAccountAndStrategyForEdit } from '@features/strategy/create-strategy'
import { RouteModal } from '@shared/ui/RouteModal'
import { getAuthToken } from '@shared/lib/auth/token'

interface Props {
  params: Promise<{ id: string; sid: string }>
}

export default async function EditStrategyModal({ params }: Props) {
  const [{ id, sid }, token] = await Promise.all([params, getAuthToken()])

  if (!token) {
    return notFound()
  }

  const context = await loadAccountAndStrategyForEdit(id, sid, token)
  if (!context) {
    return notFound()
  }
  const { account, strategy } = context

  return (
    <RouteModal>
      <PageHeader eyebrow={strategy.ticker} eyebrowHref={`/accounts/${id}/strategies/${sid}`} title="전략 수정" />
      <StrategyFormPage accountId={id} initial={strategy} broker={account.broker} dismiss="back" />
    </RouteModal>
  )
}
