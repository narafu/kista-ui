'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KpiCard } from './KpiCard'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { StrategyBadge } from './StrategyBadge'
import { StatusDot } from './StatusDot'
import { pauseStrategy, resumeStrategy, deleteAccount } from '@/lib/api/accounts'
import { ApiError } from '@/lib/api/client'
import { ProfitStatsCard } from './ProfitStatsCard'
import { MarginCard } from './MarginCard'
import { ReservationOrdersCard } from './ReservationOrdersCard'
import type { Account } from '@/types/account'
import type { Execution, PortfolioSnapshot } from '@/types/trade'

type Tab = 'summary' | 'trades' | 'statistics' | 'reservation' | 'margin'

interface Props {
  account: Account
  trades: Execution[]
  portfolio: PortfolioSnapshot
}

export function AccountDetailTabs({ account, trades, portfolio }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('summary')

  return (
    <div className="space-y-4">
      {/* 모바일 탭 헤더 */}
      <div className="flex lg:hidden gap-1 border-b overflow-x-auto">
        {(['summary', 'trades', 'statistics', 'reservation', 'margin'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-shrink-0 py-3 px-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground'
            }`}
          >
            {tab === 'summary' ? '요약' : tab === 'trades' ? '거래내역' : tab === 'statistics' ? '통계' : tab === 'reservation' ? '예약주문' : '증거금'}
          </button>
        ))}
      </div>

      {/* 모바일: 탭 콘텐츠 */}
      <div className="lg:hidden">
        {activeTab === 'summary' && (
          <SummaryTab account={account} portfolio={portfolio} />
        )}
        {activeTab === 'trades' && <TradesTab trades={trades} />}
        {activeTab === 'statistics' && <ProfitStatsCard accountId={account.id} />}
        {activeTab === 'reservation' && <ReservationOrdersCard accountId={account.id} />}
        {activeTab === 'margin' && <MarginCard accountId={account.id} />}
      </div>

      {/* 데스크탑: 전체 레이아웃 */}
      <div className="hidden lg:block space-y-6">
        <div className="account-detail-row1 mb-6">
          <ProfitStatsCard accountId={account.id} />
          <SummaryTab account={account} portfolio={portfolio} />
        </div>
        <TradesTab trades={trades} />
        <div className="grid grid-cols-2 gap-6">
          <ReservationOrdersCard accountId={account.id} />
          <MarginCard accountId={account.id} />
        </div>
      </div>
    </div>
  )
}

function SummaryTab({ account, portfolio }: { account: Account; portfolio: PortfolioSnapshot }) {
  const router = useRouter()
  const [isStrategyLoading, setIsStrategyLoading] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleteLoading, setIsDeleteLoading] = useState(false)

  async function handleStrategyToggle() {
    setIsStrategyLoading(true)
    try {
      if (account.strategyStatus === 'ACTIVE') {
        await pauseStrategy(account.id)
        toast.success('전략이 중지되었습니다')
      } else {
        await resumeStrategy(account.id)
        toast.success('전략이 재개되었습니다')
      }
      router.refresh()
    } catch (err) {
      toast.error(err instanceof ApiError ? '처리에 실패했습니다' : '오류가 발생했습니다')
    } finally {
      setIsStrategyLoading(false)
    }
  }

  async function handleDelete() {
    setIsDeleteLoading(true)
    try {
      await deleteAccount(account.id)
      toast.success('계좌가 삭제되었습니다')
      router.push('/dashboard')
    } catch (err) {
      toast.error(err instanceof ApiError ? '삭제에 실패했습니다' : '오류가 발생했습니다')
      setIsDeleteOpen(false)
    } finally {
      setIsDeleteLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">계좌 요약</CardTitle>
            <div className="flex items-center gap-2">
              <StatusDot status={account.strategyStatus} />
              <StrategyBadge strategy={account.strategyType} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          {(() => {
            const cost = (portfolio.avgPrice ?? 0) * (portfolio.qty ?? 0)
            const unrealized = (portfolio.marketValueUsd ?? 0) - cost
            const rate = cost > 0 ? (unrealized / cost) * 100 : 0
            return (
              <div className="grid grid-cols-2 gap-3">
                <KpiCard label="계좌번호" value={account.accountNoMasked} />
                <KpiCard label="종목" value={account.ticker} />
                <KpiCard label="보유 수량" value={`${portfolio.qty}주`} />
                <KpiCard label="평균 단가" value={`$${(portfolio.avgPrice ?? 0).toFixed(2)}`} />
                <KpiCard label="현재가" value={`$${(portfolio.currentPrice ?? 0).toFixed(2)}`} />
                <KpiCard label="평가금액" value={`$${(portfolio.marketValueUsd ?? 0).toFixed(2)}`} />
                <KpiCard
                  label="평가 손익"
                  className="col-span-2"
                  variant="accent"
                  value={
                    <span style={{ color: unrealized >= 0 ? 'var(--pos)' : 'var(--neg)' }}>
                      {unrealized >= 0 ? '+' : ''}${unrealized.toFixed(2)} ({rate >= 0 ? '+' : ''}{rate.toFixed(2)}%)
                    </span>
                  }
                />
              </div>
            )
          })()}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-10"
          onClick={handleStrategyToggle}
          disabled={isStrategyLoading}
        >
          {isStrategyLoading
            ? '처리 중...'
            : account.strategyStatus === 'ACTIVE' ? '전략 중지' : '전략 재개'}
        </Button>

        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogTrigger className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-10 px-4 text-destructive hover:text-destructive')}>
            계좌 삭제
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>계좌 삭제</DialogTitle>
              <DialogDescription>
                {account.nickname} 계좌를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeleteLoading}>
                취소
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isDeleteLoading}>
                {isDeleteLoading ? '삭제 중...' : '삭제'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

function TradesTab({ trades }: { trades: Execution[] }) {
  const [filter, setFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL')
  const filtered = filter === 'ALL' ? trades : trades.filter(t => t.direction === filter)

  return (
    <div className="rounded-xl border overflow-hidden">
      {/* 헤더 */}
      <div className="px-5 py-4 flex items-start justify-between border-b bg-background">
        <div>
          <p className="text-[13.5px] font-semibold">거래 내역</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            최근 30일 · {filter === 'ALL' ? `총 ${trades.length}건` : `${filtered.length}/${trades.length}건`}
          </p>
        </div>
        <div className="flex gap-1.5">
          {(['ALL', 'BUY', 'SELL'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors',
                filter === f
                  ? 'bg-rose-50 text-rose-600 border-rose-100'
                  : 'text-muted-foreground border-transparent hover:border-border'
              )}
            >
              {f === 'ALL' ? '전체' : f === 'BUY' ? '매수' : '매도'}
            </button>
          ))}
        </div>
      </div>

      {/* 콘텐츠 */}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">거래 내역이 없습니다.</p>
      ) : (
        <>
          {/* 모바일: 카드 리스트 */}
          <div className="space-y-2 p-4 lg:hidden">
            {filtered.map((trade) => (
              <Card key={`${trade.kisOrderId ?? ''}-${trade.tradeDate}-${trade.symbol}`} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {trade.direction === 'BUY' ? (
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                        style={{ background: 'var(--pos-bg)', color: 'var(--pos)' }}
                      >매수</span>
                    ) : (
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                        style={{ background: 'var(--neg-bg)', color: 'var(--neg)' }}
                      >매도</span>
                    )}
                    <span className="font-medium text-sm">{trade.symbol}</span>
                  </div>
                  <span className="text-sm font-semibold">${(trade.amountUsd ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>{trade.qty}주 × ${(trade.price ?? 0).toFixed(2)}</span>
                  <span>{new Date(trade.tradeDate).toLocaleDateString('ko-KR')}</span>
                </div>
              </Card>
            ))}
          </div>
          {/* 데스크탑: 테이블 */}
          <div className="hidden lg:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {['구분', '종목', '수량', '단가', '금액', '체결일'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] uppercase tracking-widest text-rose-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((trade) => (
                  <tr key={`${trade.kisOrderId ?? ''}-${trade.tradeDate}-${trade.symbol}`} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      {trade.direction === 'BUY' ? (
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                          style={{ background: 'var(--pos-bg)', color: 'var(--pos)' }}
                        >매수</span>
                      ) : (
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                          style={{ background: 'var(--neg-bg)', color: 'var(--neg)' }}
                        >매도</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">{trade.symbol}</td>
                    <td className="px-4 py-3">{trade.qty}주</td>
                    <td className="px-4 py-3">${(trade.price ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-3 font-medium">${(trade.amountUsd ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(trade.tradeDate).toLocaleDateString('ko-KR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

