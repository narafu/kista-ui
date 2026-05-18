'use client'

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { ProfitDisplay } from './ProfitDisplay'
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
        <CardContent className="px-6">
          {([
            ['계좌번호', <span key="acct" className="font-medium text-sm">{account.accountNoMasked}</span>],
            ['종목',     <span key="ticker" className="font-bold text-sm">{account.ticker}</span>],
            ['보유 수량', <span key="qty" className="font-medium text-sm">{portfolio.qty}주</span>],
            ['평균 단가', <span key="avg" className="font-medium text-sm">${(portfolio.avgPrice ?? 0).toFixed(2)}</span>],
            ['현재가',   <span key="cur" className="font-medium text-sm">${(portfolio.currentPrice ?? 0).toFixed(2)}</span>],
            ['평가금액', <span key="mval" className="font-medium text-sm">${(portfolio.marketValueUsd ?? 0).toFixed(2)}</span>],
            ['평가 손익', <ProfitDisplay key="pl" amount={0} rate={0} />],
          ] as [string, ReactNode][]).map(([label, value], i, arr) => (
            <div
              key={label}
              className={cn(
                'flex justify-between items-center text-sm py-2.5',
                i < arr.length - 1 && 'border-b border-border'
              )}
            >
              <span className="text-muted-foreground">{label}</span>
              {value}
            </div>
          ))}
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
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-muted-foreground hidden lg:block">거래 내역</h3>
      {trades.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">거래 내역이 없습니다.</p>
      ) : (
        <>
          {/* 모바일: 카드 리스트 */}
          <div className="space-y-2 lg:hidden">
            {trades.map((trade) => (
              <Card key={`${trade.kisOrderId ?? ''}-${trade.tradeDate}-${trade.symbol}`} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={trade.direction === 'BUY' ? 'default' : 'secondary'}>
                      {trade.direction === 'BUY' ? '매수' : '매도'}
                    </Badge>
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
          <div className="hidden lg:block rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {['구분', '종목', '수량', '단가', '금액', '체결일'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr key={`${trade.kisOrderId ?? ''}-${trade.tradeDate}-${trade.symbol}`} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Badge variant={trade.direction === 'BUY' ? 'default' : 'secondary'} className="text-xs">
                        {trade.direction === 'BUY' ? '매수' : '매도'}
                      </Badge>
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

