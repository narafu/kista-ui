import Link from 'next/link'
import { ArrowLeft, Pencil } from 'lucide-react'
import { notFound } from 'next/navigation'
import { buttonVariants } from '@/components/ui/button'
import { AccountDetailTabs } from '@/components/common/AccountDetailTabs'
import { cn } from '@/lib/utils'
import { getAuthToken } from '@/lib/auth/token'
import { listAccounts } from '@/lib/api/accounts'
import { getAccountTrades, getAccountPortfolio } from '@/lib/api/trades'
import type { TradeHistory, PortfolioSnapshot } from '@/types/trade'
import type { Account } from '@/types/account'

interface Props {
  params: Promise<{ id: string }>
}

const EMPTY_PORTFOLIO: PortfolioSnapshot = {
  id: '',
  snapshotDate: '',
  symbol: 'SOXL',
  qty: 0,
  avgPrice: 0,
  currentPrice: 0,
  marketValueUsd: 0,
  usdDeposit: 0,
  totalAssetUsd: 0,
  createdAt: '',
}

export default async function AccountDetailPage({ params }: Props) {
  const { id } = await params
  const token = await getAuthToken()

  if (!token) {
    return notFound()
  }

  const today = new Date()
  const from30d = new Date(today)
  from30d.setDate(today.getDate() - 30)
  const dateRange = {
    from: from30d.toISOString().split('T')[0],
    to: today.toISOString().split('T')[0],
  }

  const [accounts, trades, portfolio] = await Promise.all([
    listAccounts(token).catch((): Account[] => []),
    getAccountTrades(id, dateRange, token).catch((): TradeHistory[] => []),
    getAccountPortfolio(id, token).catch((): PortfolioSnapshot | null => null),
  ])

  const account = accounts.find((a) => a.id === id)
  if (!account) {
    return notFound()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold">{account.nickname}</h1>
        </div>
        <Link href={`/accounts/${id}/edit`} className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}>
          <Pencil className="h-4 w-4" />
        </Link>
      </div>

      <AccountDetailTabs
        account={account}
        trades={trades}
        portfolio={portfolio ?? EMPTY_PORTFOLIO}
      />
    </div>
  )
}
