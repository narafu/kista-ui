import { notFound } from 'next/navigation'
import { PageHeader } from '@widgets/page-header'
import { StrategyFormPage, loadAccountForNewStrategy } from '@features/strategy/create-strategy'
import { requirePageToken } from '@shared/lib/auth/token'
import type { DismissMode } from '@shared/lib/dismiss'

interface Props {
  params: Promise<{ id: string }>
  // 'push'(기본): 일반 페이지 라우트. 'back': 인터셉팅 라우트(@modal) — NewAssetFormBody와 동일한 이유로 분리.
  dismiss?: DismissMode
}

export async function NewStrategyFormBody({ params, dismiss }: Props) {
  const { params: { id }, token } = await requirePageToken(params)

  const account = await loadAccountForNewStrategy(id, token)
  if (!account) {
    return notFound()
  }

  return (
    <>
      <PageHeader eyebrow={account.nickname} eyebrowHref={`/accounts/${id}`} title="전략 등록" />
      <StrategyFormPage accountId={id} broker={account.broker} dismiss={dismiss} />
    </>
  )
}
