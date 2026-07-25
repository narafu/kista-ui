import { notFound } from 'next/navigation'
import { PageHeader } from '@widgets/page-header'
import { StrategyFormPage } from '@features/strategy/create-strategy'
import { RouteModal } from '@shared/ui/RouteModal'
import { getAuthToken } from '@shared/lib/auth/token'
import { listAccounts } from '@entities/account'
import type { Account } from '@entities/account'

interface Props {
  params: Promise<{ id: string }>
}

export default async function NewStrategyModal({ params }: Props) {
  const [{ id }, token] = await Promise.all([params, getAuthToken()])

  if (!token) {
    return notFound()
  }

  const accounts = await listAccounts(token).catch((): Account[] => [])
  const account = accounts.find((a) => a.id === id)
  if (!account) {
    return notFound()
  }

  return (
    <RouteModal>
      <PageHeader eyebrow={account.nickname} eyebrowHref={`/accounts/${id}`} title="전략 등록" />
      <StrategyFormPage accountId={id} dismiss="back" />
    </RouteModal>
  )
}
