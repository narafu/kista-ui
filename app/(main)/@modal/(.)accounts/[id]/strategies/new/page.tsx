import { notFound } from 'next/navigation'
import { PageHeader } from '@widgets/page-header'
import { StrategyFormPage, loadAccountForNewStrategy } from '@features/strategy/create-strategy'
import { RouteModal } from '@shared/ui/RouteModal'
import { requirePageToken } from '@shared/lib/auth/token'

interface Props {
  params: Promise<{ id: string }>
}

export default async function NewStrategyModal({ params }: Props) {
  const { params: { id }, token } = await requirePageToken(params)

  const account = await loadAccountForNewStrategy(id, token)
  if (!account) {
    return notFound()
  }

  return (
    <RouteModal>
      <PageHeader eyebrow={account.nickname} eyebrowHref={`/accounts/${id}`} title="전략 등록" />
      <StrategyFormPage accountId={id} broker={account.broker} dismiss="back" />
    </RouteModal>
  )
}
