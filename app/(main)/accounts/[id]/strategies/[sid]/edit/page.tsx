import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageHeader } from '@widgets/page-header'
import { StrategyFormPage, loadAccountAndStrategyForEdit } from '@features/strategy/create-strategy'
import { getAuthToken } from '@shared/lib/auth/token'

interface Props {
  params: Promise<{ id: string; sid: string }>
}

export const metadata: Metadata = {
  title: '전략 수정 | KISTA',
  description: '전략 설정을 변경합니다',
}

export default async function EditStrategyPage({ params }: Props) {
  const [{ id, sid }, token] = await Promise.all([params, getAuthToken()])

  if (!token) {
    return notFound()
  }

  const context = await loadAccountAndStrategyForEdit(id, sid, token)
  if (!context) {
    return notFound()
  }
  const { strategy } = context

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader eyebrow={strategy.ticker} eyebrowHref={`/accounts/${id}/strategies/${sid}`} title="전략 수정" />
      <StrategyFormPage accountId={id} initial={strategy} />
    </div>
  )
}
