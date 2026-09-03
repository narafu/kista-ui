import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageHeader } from '@widgets/page-header'
import { StrategyFormPage, loadAccountForNewStrategy } from '@features/strategy/create-strategy'
import { requirePageToken } from '@shared/lib/auth/token'

interface Props {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: '전략 등록 | KISTA',
  description: '이 계좌에 적용할 매매 전략을 등록합니다',
}

export default async function NewStrategyPage({ params }: Props) {
  const { params: { id }, token } = await requirePageToken(params)

  const account = await loadAccountForNewStrategy(id, token)
  if (!account) {
    return notFound()
  }

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader eyebrow={account.nickname} eyebrowHref={`/accounts/${id}`} title="전략 등록" />
      <StrategyFormPage accountId={id} broker={account.broker} />
    </div>
  )
}
