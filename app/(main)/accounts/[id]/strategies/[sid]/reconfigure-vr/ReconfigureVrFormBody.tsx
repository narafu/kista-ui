import { notFound } from 'next/navigation'
import { PageHeader } from '@widgets/page-header'
import { ReconfigureVrForm, loadAccountAndStrategyForReconfigure } from '@features/strategy/reconfigure-vr'
import { requirePageToken } from '@shared/lib/auth/token'
import type { DismissMode } from '@shared/lib/dismiss'

interface Props {
  params: Promise<{ id: string; sid: string }>
  // 'push'(기본): 일반 페이지 라우트. 'back': 인터셉팅 라우트(@modal) — NewAssetFormBody와 동일한 이유로 분리.
  dismiss?: DismissMode
}

export async function ReconfigureVrFormBody({ params, dismiss }: Props) {
  const { params: { id, sid }, token } = await requirePageToken(params)

  const context = await loadAccountAndStrategyForReconfigure(id, sid, token)
  if (!context) {
    return notFound()
  }
  const { strategy } = context

  return (
    <>
      <PageHeader eyebrow={strategy.ticker} eyebrowHref={`/accounts/${id}/strategies/${sid}`} title="VR 재설정" />
      <ReconfigureVrForm accountId={id} strategy={strategy} dismiss={dismiss} />
    </>
  )
}
