import type { Metadata } from 'next'
import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { notFound } from 'next/navigation'
import { buttonVariants } from '@/components/ui/button-variants'
import { AccountDetailTabs } from '@widgets/account-detail'
import { PageHeader } from '@widgets/page-header'
import { cn, toNum } from '@shared/lib/utils'
import { getAuthToken } from '@shared/lib/auth/token'
import { listAccounts } from '@entities/account'
import { getAccountPortfolio } from '@entities/trade'
import { listStrategies } from '@entities/strategy'
import type { PortfolioSummary } from '@entities/trade'
import type { Account } from '@entities/account'
import type { Strategy } from '@entities/strategy'

interface Props {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: '계좌 상세 | KISTA',
  description: '계좌 포트폴리오 및 거래 내역',
}

export default async function AccountDetailPage({ params }: Props) {
  const [{ id }, token] = await Promise.all([params, getAuthToken()])

  if (!token) {
    return notFound()
  }

  const [accounts, portfolioRaw, strategies] = await Promise.all([
    listAccounts(token).catch((): Account[] => []),
    getAccountPortfolio(id, token).catch((): PortfolioSummary | null => null),
    listStrategies(id, token).catch((e): Strategy[] => {
      console.error('[AccountDetailPage] listStrategies 실패:', e)
      return []
    }),
  ])

  const usdDeposit = toNum(portfolioRaw?.summary?.usdDeposit)
  const posEvalUsd = toNum(portfolioRaw?.summary?.posEvalUsd)

  const account = accounts.find((a) => a.id === id)
  if (!account) {
    return notFound()
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="계좌 관리"
        title={account.nickname}
        actions={
          <Link href={`/accounts/${id}/edit`} className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}>
            <Pencil className="size-4" />
          </Link>
        }
      />

      <AccountDetailTabs
        account={account}
        strategies={strategies}
        usdDeposit={usdDeposit}
        posEvalUsd={posEvalUsd}
      />
    </div>
  )
}
