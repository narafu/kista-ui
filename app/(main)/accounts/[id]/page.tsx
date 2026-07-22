import type { Metadata } from 'next'
import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { notFound } from 'next/navigation'
import { AccountDetailTabs } from '@widgets/account-detail'
import { PageHeader } from '@widgets/page-header'
import { getAuthToken } from '@shared/lib/auth/token'
import { listAccounts } from '@entities/account'
import { getAccountPortfolio } from '@entities/trade'
import { listStrategies } from '@entities/strategy'
import { getStrategyOrderPreviewsById } from '@entities/order'
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

  const usdDeposit = portfolioRaw?.summary?.usdDeposit ?? 0
  const posEvalUsd = portfolioRaw?.summary?.posEvalUsd ?? 0

  const account = accounts.find((a) => a.id === id)
  if (!account) {
    return notFound()
  }

  // 전략별 다음 주문 미리보기 — 서버에서 미리 채워 카드 목록의 배지·배너가 첫 페인트부터 보이게 함
  const previewsByStrategyId = await getStrategyOrderPreviewsById(strategies.map((s) => s.id), token)

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="계좌 관리"
        title={account.nickname}
        actions={
          <Link
            href={`/accounts/${id}/edit`}
            aria-label="계좌 수정"
            className="relative inline-flex items-center justify-center size-11 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Pencil className="size-4" />
          </Link>
        }
      />

      <AccountDetailTabs
        account={account}
        strategies={strategies}
        usdDeposit={usdDeposit}
        posEvalUsd={posEvalUsd}
        previewsByStrategyId={previewsByStrategyId}
      />
    </div>
  )
}
