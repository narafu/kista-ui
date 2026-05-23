'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KpiCard } from './KpiCard'
import { RevealableValue } from './RevealableValue'
import { cn } from '@/lib/utils'
import { ProfitStatsCard } from './ProfitStatsCard'
import { MarginCard } from './MarginCard'
import { ReservationOrdersCard } from './ReservationOrdersCard'
import { StrategyList } from '@/components/strategies/StrategyList'
import { useMeta } from '@/components/providers/MetaProvider'
import type { Account } from '@/types/account'
import type { Execution, PortfolioSnapshot } from '@/types/trade'
import type { Strategy } from '@/types/strategy'

type Tab = 'summary' | 'trades' | 'statistics' | 'reservation' | 'margin'

interface Props {
  account: Account
  trades: Execution[]
  portfolio: PortfolioSnapshot
  strategies: Strategy[]
}

export function AccountDetailTabs({ account, trades, portfolio, strategies }: Props) {
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
          <SummaryTab account={account} portfolio={portfolio} strategies={strategies} />
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
          <SummaryTab account={account} portfolio={portfolio} strategies={strategies} />
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

function SummaryTab({
  account,
  portfolio,
  strategies,
}: {
  account: Account
  portfolio: PortfolioSnapshot
  strategies: Strategy[]
}) {
  const { findStrategyType } = useMeta()

  // 운영상 계좌당 1개의 ACTIVE 전략을 우선 — 없으면 첫 번째
  const primary = strategies.find((s) => s.status === 'ACTIVE') ?? strategies[0]
  const typeLabel = primary ? findStrategyType(primary.type)?.label ?? primary.type : null

  // Hoist calculation variables
  const cost = (portfolio.avgPrice ?? 0) * (portfolio.holdings ?? 0)
  const unrealized = (portfolio.marketValueUsd ?? 0) - cost
  const rate = cost > 0 ? (unrealized / cost) * 100 : 0

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">계좌 요약</CardTitle>
            {primary && (
              <span className="inline-flex items-center px-2.5 h-[22px] rounded-full text-[11px] font-semibold whitespace-nowrap bg-rose-50 text-rose-600">
                {typeLabel}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          {primary ? (
            <div className="grid grid-cols-2 gap-3">
              <KpiCard label="계좌번호" value={<RevealableValue value={account.accountNoMasked} />} />
              <KpiCard label="종목" value={primary.ticker} />
              <KpiCard label="보유 수량" value={`${portfolio.holdings}주`} />
              <KpiCard label="평균 단가" value={`$${(portfolio.avgPrice ?? 0).toFixed(2)}`} />
              <KpiCard label="현재가" value={`$${(portfolio.currentPrice ?? 0).toFixed(2)}`} />
              <KpiCard label="평가금액" value={`$${(portfolio.marketValueUsd ?? 0).toFixed(2)}`} />
              <KpiCard
                label="평가 손익"
                className="col-span-2"
                variant="default"
                value={
                  <span style={{ color: unrealized >= 0 ? 'var(--pos)' : 'var(--neg)' }}>
                    {unrealized >= 0 ? '+' : ''}${unrealized.toFixed(2)} ({rate >= 0 ? '+' : ''}{rate.toFixed(2)}%)
                  </span>
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              <KpiCard label="계좌번호" value={<RevealableValue value={account.accountNoMasked} />} />
              <p className="text-sm text-muted-foreground text-center py-3">
                전략을 먼저 등록해주세요.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 전략 섹션 */}
      <StrategyList accountId={account.id} strategies={strategies} />
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
                  ? 'border-transparent'
                  : 'text-muted-foreground border-transparent hover:border-border'
              )}
              style={filter === f ? { background: 'var(--rose-50)', color: 'var(--rose-600)' } : undefined}
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
              <Card key={`${trade.kisOrderId ?? ''}-${trade.tradeDate}-${trade.ticker}`} className="p-3">
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
                    <span className="font-medium text-sm">{trade.ticker}</span>
                  </div>
                  <span className="text-sm font-semibold">${(trade.amountUsd ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>{trade.quantity}주 × ${(trade.price ?? 0).toFixed(2)}</span>
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
                  <tr key={`${trade.kisOrderId ?? ''}-${trade.tradeDate}-${trade.ticker}`} className="border-t hover:bg-muted/30 transition-colors">
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
                    <td className="px-4 py-3 font-medium">{trade.ticker}</td>
                    <td className="px-4 py-3">{trade.quantity}주</td>
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
