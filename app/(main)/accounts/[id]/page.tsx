import type { Metadata } from 'next'
import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { notFound } from 'next/navigation'
import { buttonVariants } from '@components/ui/button'
import { AccountDetailTabs } from '@widgets/account-detail'
import { PageHeader } from '@widgets/page-header'
import { cn, toNum } from '@shared/lib/utils'
import { getAuthToken } from '@shared/lib/auth/token'
import { listAccounts } from '@entities/account'
import { getAccountPortfolio, getAccountMargin } from '@entities/trade'
import { listStrategies } from '@entities/strategy'
import type { PortfolioSnapshot, MarginItem } from '@entities/trade'
import type { Account } from '@entities/account'
import type { Strategy } from '@entities/strategy'

interface Props {
  params: Promise<{ id: string }>
}

// kista-api PortfolioSummaryResponse { positions: PositionDto[], summary: SummaryDto } 응답 형식
interface PortfolioPosition {
  ticker: string; holdings: number
  avgPrice: number | string | null; currentPrice: number | string | null
  evalAmountUsd: number | string | null
}
interface PortfolioSummaryRaw {
  positions?: PortfolioPosition[]
  summary?: { totalAssetUsd?: number | string | null }
}

// PortfolioSummaryResponse → PortfolioSnapshot 변환 (StatisticsController 응답 형식 정규화)
// strategyTicker: 전략 종목 코드 — positions에서 해당 종목 포지션을 우선 선택
function normalizePortfolio(raw: PortfolioSnapshot | null, strategyTicker?: string): PortfolioSnapshot | null {
  if (!raw) return null
  const r = raw as unknown as PortfolioSummaryRaw
  if (!Array.isArray(r.positions)) return null
  const top = strategyTicker
    ? r.positions.find(p => String(p.ticker) === strategyTicker)
    : r.positions[0]
  if (!top) return null // 보유 종목 없음
  return {
    id: '',
    ticker: top.ticker, holdings: top.holdings,
    avgPrice: toNum(top.avgPrice), closingPrice: toNum(top.currentPrice),
    marketValueUsd: toNum(top.evalAmountUsd), usdDeposit: 0,
    totalAssetUsd: toNum(r.summary?.totalAssetUsd),
    createdAt: new Date().toISOString(),
  }
}


export const metadata: Metadata = {
  title: '계좌 상세 | KISTA',
  description: '계좌 포트폴리오 및 거래 내역',
}

export default async function AccountDetailPage({ params }: Props) {
  const { id } = await params
  const token = await getAuthToken()

  if (!token) {
    return notFound()
  }

  const [accounts, portfolioRaw, strategies, margins] = await Promise.all([
    listAccounts(token).catch((): Account[] => []),
    getAccountPortfolio(id, token).catch((): PortfolioSnapshot | null => null),
    listStrategies(id, token).catch((e): Strategy[] => {
      console.error('[AccountDetailPage] listStrategies 실패:', e)
      return []
    }),
    getAccountMargin(id, token).catch((): MarginItem[] => []),
  ])
  const primaryStrategy = strategies.find(s => s.status === 'ACTIVE') ?? strategies[0]
  const portfolio = normalizePortfolio(portfolioRaw, primaryStrategy?.ticker)
  const usdDeposit = margins.find(m => m.currency === 'USD')?.purchasableAmount ?? 0

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
        portfolio={portfolio}
        strategies={strategies}
        usdDeposit={usdDeposit}
      />
    </div>
  )
}
