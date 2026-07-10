import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PageHeader } from '@widgets/page-header'
import { StrategyDetail } from '@widgets/strategy-detail'
import { StrategyFormDialog } from '@features/strategy/create-strategy'
import { getAuthToken } from '@shared/lib/auth/token'
import { listAccounts } from '@entities/account'
import { listStrategies } from '@entities/strategy'
import type { Account } from '@entities/account'
import type { Strategy } from '@entities/strategy'

interface Props {
  params: Promise<{ id: string; sid: string }>
}

export const metadata: Metadata = {
  title: '전략 상세 | KISTA',
  description: '전략 상세 정보 및 다음 주문 미리보기',
}

export default async function StrategyDetailPage({ params }: Props) {
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
    <div className="space-y-4">
      <PageHeader
        title={strategy.ticker}
        // eslint-disable-next-line react-doctor/jsx-no-jsx-as-prop
        titleSuffix={
          <Link
            href={`/accounts/${id}`}
            className="text-sm font-semibold tracking-[0.12em] uppercase text-[var(--brand-fg-soft)] hover:text-foreground transition-colors"
          >
            ← {account.nickname}
          </Link>
        }
        actions={
          <StrategyFormDialog accountId={id} initial={strategy} triggerLabel="수정" triggerVariant="ghost" />
        }
      />

      <StrategyDetail accountId={id} strategy={strategy} />
    </div>
  )
}
