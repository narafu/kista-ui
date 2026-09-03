import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageHeader } from '@widgets/page-header'
import { ReconfigureVrForm, loadAccountAndStrategyForReconfigure } from '@features/strategy/reconfigure-vr'
import { requirePageToken } from '@shared/lib/auth/token'

interface Props {
  params: Promise<{ id: string; sid: string }>
}

export const metadata: Metadata = {
  title: 'VR 재설정 | KISTA',
  description: 'VR 전략의 밴드폭·주기·램프 파라미터를 재설정하고 자본을 주입합니다',
}

export default async function ReconfigureVrPage({ params }: Props) {
  const { params: { id, sid }, token } = await requirePageToken(params)

  const context = await loadAccountAndStrategyForReconfigure(id, sid, token)
  if (!context) {
    return notFound()
  }
  const { strategy } = context

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader eyebrow={strategy.ticker} eyebrowHref={`/accounts/${id}/strategies/${sid}`} title="VR 재설정" />
      <ReconfigureVrForm accountId={id} strategy={strategy} />
    </div>
  )
}
