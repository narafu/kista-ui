import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { notFound } from 'next/navigation'
import { strategyKeys } from '@entities/strategy'
import { createQueryClient } from '@shared/lib/query'
import { PageHeader } from '@widgets/page-header'
import { StrategyFormPage, loadAccountAndStrategyForEdit } from '@features/strategy/create-strategy'
import { requirePageToken } from '@shared/lib/auth/token'
import type { DismissMode } from '@shared/lib/dismiss'

interface Props {
  params: Promise<{ id: string; sid: string }>
  // 'push'(기본): 일반 페이지 라우트. 'back': 인터셉팅 라우트(@modal) — NewAssetFormBody와 동일한 이유로 분리.
  dismiss?: DismissMode
}

export async function EditStrategyFormBody({ params, dismiss }: Props) {
  const { params: { id, sid }, token } = await requirePageToken(params)

  const context = await loadAccountAndStrategyForEdit(id, sid, token)
  if (!context) {
    return notFound()
  }
  const { account, strategy } = context
  // 폼이 체결 민감 필드(currentHoldings·vr.value)를 detail 캐시로 읽으므로 첫 페인트용으로 심어 둔다
  const queryClient = createQueryClient()
  queryClient.setQueryData(strategyKeys.detail(sid), strategy)

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageHeader eyebrow={strategy.ticker} eyebrowHref={`/accounts/${id}/strategies/${sid}`} title="전략 수정" description="전략 매매 조건 변경" />
      <StrategyFormPage accountId={id} initial={strategy} broker={account.broker} dismiss={dismiss} />
    </HydrationBoundary>
  )
}
