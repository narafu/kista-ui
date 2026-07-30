import { notFound } from 'next/navigation'
import { PageHeader } from '@widgets/page-header'
import { ReconfigureVrForm, loadAccountAndStrategyForReconfigure } from '@features/strategy/reconfigure-vr'
import { RouteModal } from '@shared/ui/RouteModal'
import { getAuthToken } from '@shared/lib/auth/token'

interface Props {
  params: Promise<{ id: string; sid: string }>
}

export default async function ReconfigureVrModal({ params }: Props) {
  const [{ id, sid }, token] = await Promise.all([params, getAuthToken()])

  if (!token) {
    return notFound()
  }

  const context = await loadAccountAndStrategyForReconfigure(id, sid, token)
  if (!context) {
    return notFound()
  }
  const { strategy } = context

  return (
    <RouteModal>
      <PageHeader eyebrow={strategy.ticker} eyebrowHref={`/accounts/${id}/strategies/${sid}`} title="VR 재설정" />
      <ReconfigureVrForm accountId={id} strategy={strategy} dismiss="back" />
    </RouteModal>
  )
}
