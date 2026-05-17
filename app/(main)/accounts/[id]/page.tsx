import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { notFound } from 'next/navigation'
import { buttonVariants } from '@/components/ui/button'
import { AccountDetailTabs } from '@/components/common/AccountDetailTabs'
import { PageHeader } from '@/components/common/PageHeader'
import { cn } from '@/lib/utils'
import { getAuthToken } from '@/lib/auth/token'
import { listAccounts } from '@/lib/api/accounts'
import { getAccountTrades, getAccountPortfolio } from '@/lib/api/trades'
import type { TradeHistory, PortfolioSnapshot } from '@/types/trade'
import type { Account } from '@/types/account'

interface Props {
  params: Promise<{ id: string }>
}

// KIS CTRP6504R 응답(PresentBalanceResult)의 items 구조
interface PresentBalanceItem {
  symbol: string; qty: number; avgPrice: number
  currentPrice: number; evalAmountUsd: number
}

// PresentBalanceResult → PortfolioSnapshot 변환 (StatisticsController 응답 형식 정규화)
function normalizePortfolio(raw: PortfolioSnapshot | null): PortfolioSnapshot | null {
  if (!raw) return null
  const r = raw as unknown as Record<string, unknown>
  if (!Array.isArray(r.items)) return raw
  const items = r.items as PresentBalanceItem[]
  const item = items[0]
  if (!item) return null // 보유 종목 없음
  return {
    id: '', snapshotDate: new Date().toISOString().split('T')[0],
    symbol: item.symbol, qty: item.qty,
    avgPrice: item.avgPrice, currentPrice: item.currentPrice,
    marketValueUsd: item.evalAmountUsd, usdDeposit: 0,
    totalAssetUsd: (r.totalAssetUsd as number) ?? 0,
    createdAt: new Date().toISOString(),
  }
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

  const [accounts, trades, portfolioRaw] = await Promise.all([
    listAccounts(token).catch((): Account[] => []),
    getAccountTrades(id, dateRange, token).catch((): TradeHistory[] => []),
    getAccountPortfolio(id, token).catch((): PortfolioSnapshot | null => null),
  ])
  const portfolio = normalizePortfolio(portfolioRaw)

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
            <Pencil className="h-4 w-4" />
          </Link>
        }
      />

      <AccountDetailTabs
        account={account}
        trades={trades}
        portfolio={portfolio ?? EMPTY_PORTFOLIO}
      />
    </div>
  )
}
