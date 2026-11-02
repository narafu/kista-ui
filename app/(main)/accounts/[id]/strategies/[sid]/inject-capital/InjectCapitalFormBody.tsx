import { notFound } from 'next/navigation'
import { PageHeader } from '@widgets/page-header'
import { InjectCapitalForm, loadStrategyForInjectCapital } from '@features/strategy/inject-capital'
import { requirePageToken } from '@shared/lib/auth/token'
import type { DismissMode } from '@shared/lib/dismiss'

interface Props {
  params: Promise<{ id: string; sid: string }>
  // 'push'(기본): 일반 페이지 라우트. 'back': 인터셉팅 라우트(@modal)
  dismiss?: DismissMode
}

export async function InjectCapitalFormBody({ params, dismiss }: Props) {
  const { params: { id, sid }, token } = await requirePageToken(params)

  const strategy = await loadStrategyForInjectCapital(id, sid, token)
  if (!strategy) {
    return notFound()
  }

  return (
    <>
      <PageHeader eyebrow={strategy.ticker} eyebrowHref={`/accounts/${id}/strategies/${sid}`} title="자금 추가" description="예수금이나 보유 주식을 진행 중인 사이클에 추가" />
      <InjectCapitalForm accountId={id} strategy={strategy} dismiss={dismiss} />
    </>
  )
}
