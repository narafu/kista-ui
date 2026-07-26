import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PageHeader } from '@widgets/page-header'
import { StrategyDetail } from '@widgets/strategy-detail'
import { cn } from '@shared/lib/utils'
import { buttonVariants } from '@/components/ui/button-variants'
import { getAuthToken } from '@shared/lib/auth/token'
import { listAccounts } from '@entities/account'
import { listStrategies } from '@entities/strategy'
import { getStrategyOrdersPreview } from '@entities/order'
import type { Account } from '@entities/account'
import type { Strategy } from '@entities/strategy'
import type { NextOrderPreview } from '@entities/order'

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

  // "다음 주문" 배너·데이터가 하이드레이션 이후 재요청 없이 첫 페인트부터 보이도록 서버에서 미리 조회
  const initialPreview: NextOrderPreview | undefined = await getStrategyOrdersPreview(strategy.id, token).catch(() => undefined)

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={account.nickname}
        eyebrowHref={`/accounts/${id}`}
        title={strategy.ticker}
        actions={
          <>
            {strategy.vr && (
              <Link href={`/accounts/${id}/strategies/${sid}/reconfigure-vr`} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
                VR 재설정
              </Link>
            )}
            <Link href={`/accounts/${id}/strategies/${sid}/edit`} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
              수정
            </Link>
          </>
        }
      />

      <StrategyDetail accountId={id} strategy={strategy} initialPreview={initialPreview} />
    </div>
  )
}
