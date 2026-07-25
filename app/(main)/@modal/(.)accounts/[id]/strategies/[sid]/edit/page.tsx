import { notFound } from 'next/navigation'
import { PageHeader } from '@widgets/page-header'
import { StrategyFormPage } from '@features/strategy/create-strategy'
import { RouteModal } from '@shared/ui/RouteModal'
import { getAuthToken } from '@shared/lib/auth/token'
import { listAccounts } from '@entities/account'
import { listStrategies } from '@entities/strategy'
import type { Account } from '@entities/account'
import type { Strategy } from '@entities/strategy'

interface Props {
  params: Promise<{ id: string; sid: string }>
}

export default async function EditStrategyModal({ params }: Props) {
  const [{ id, sid }, token] = await Promise.all([params, getAuthToken()])

  if (!token) {
    return notFound()
  }

  const [accounts, strategies] = await Promise.all([
    listAccounts(token).catch((): Account[] => []),
    listStrategies(id, token).catch((): Strategy[] => []),
  ])

  const account = accounts.find((a) => a.id === id)
  const strategy = strategies.find((s) => s.id === sid)
  if (!account || !strategy) {
    return notFound()
  }

  return (
    <RouteModal>
      <PageHeader eyebrow={strategy.ticker} eyebrowHref={`/accounts/${id}/strategies/${sid}`} title="전략 수정" />
      <StrategyFormPage accountId={id} initial={strategy} dismiss="back" />
    </RouteModal>
  )
}
