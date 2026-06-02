'use client'

import { useState, useEffect, useReducer } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KpiCard } from './KpiCard'
import { NextOrderPreviewCard } from './NextOrderPreviewCard'
import { StrategyList } from '@/components/strategies/StrategyList'
import { useMeta } from '@/components/providers/MetaProvider'
import { getAccountCycleHistory, getStrategyCycleHistory } from '@/lib/api/trades'
import type { Account } from '@/types/account'
import type { CycleHistoryItem, PortfolioSnapshot } from '@/types/trade'
import type { Strategy } from '@/types/strategy'

type Tab = 'summary' | 'strategy' | 'preview'
type RangeType = 'all' | '7d' | '30d' | 'custom'

interface Props {
  account: Account
  portfolio: PortfolioSnapshot | null
  strategies: Strategy[]
  usdDeposit: number
}

export function AccountDetailTabs({ account, portfolio, strategies, usdDeposit }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('summary')
  const { findStrategyType } = useMeta()
  const activeStrategy = strategies.find((s) => s.status === 'ACTIVE') ?? strategies[0]
  const activeTypeMeta = activeStrategy ? findStrategyType(activeStrategy.type) : null
  const isInfiniteActive =
    activeStrategy?.status === 'ACTIVE' && (activeTypeMeta?.availableTickers?.length ?? 0) > 1
  const executeStrategyId = isInfiniteActive ? activeStrategy!.id : undefined

  return (
    <div className="space-y-4">
      {/* 모바일 탭 헤더 */}
      <div className="flex lg:hidden gap-1 border-b overflow-x-auto">
        {(['summary', 'strategy', 'preview'] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-shrink-0 py-3 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
          >
            {tab === 'summary' ? '계좌' : tab === 'strategy' ? '전략' : '다음 주문'}
          </button>
        ))}
      </div>

      {/* 모바일: 탭 콘텐츠 */}
      <div className="lg:hidden">
        {activeTab === 'summary' && (
          <div className="space-y-4">
            <AccountSummaryCard account={account} portfolio={portfolio} usdDeposit={usdDeposit} hasStrategy={strategies.length > 0} />
            <TradesTab accountId={account.id} />
          </div>
        )}
        {activeTab === 'strategy' && (
          <div className="space-y-4">
            <StrategyList accountId={account.id} strategies={strategies} />
            <StrategyTradesTab strategyId={activeStrategy?.id} />
          </div>
        )}
        {activeTab === 'preview' && <NextOrderPreviewCard accountId={account.id} strategyType={activeStrategy?.type} initialUsdDeposit={activeStrategy?.initialUsdDeposit} strategyId={executeStrategyId} />}
      </div>

      {/* 데스크탑: 전체 레이아웃 */}
      <div className="hidden lg:block space-y-6">
        {/* Row 1: 계좌 요약 | 거래 내역(계좌) */}
        <div className="grid grid-cols-2 gap-6">
          <AccountSummaryCard account={account} portfolio={portfolio} usdDeposit={usdDeposit} hasStrategy={strategies.length > 0} />
          <TradesTab accountId={account.id} />
        </div>
        {/* Row 2: 전략 | 거래 내역(전략) */}
        <div className="grid grid-cols-2 gap-6">
          <StrategyList accountId={account.id} strategies={strategies} />
          <StrategyTradesTab strategyId={activeStrategy?.id} />
        </div>
        {/* Row 3: 미리보기 */}
        <NextOrderPreviewCard accountId={account.id} strategyType={activeStrategy?.type} initialUsdDeposit={activeStrategy?.initialUsdDeposit} strategyId={executeStrategyId} />
      </div>
    </div>
  )
}

function AccountSummaryCard({ account, portfolio, usdDeposit, hasStrategy }: { account: Account; portfolio: PortfolioSnapshot | null; usdDeposit: number; hasStrategy: boolean }) {
  const cost = portfolio ? (portfolio.avgPrice ?? 0) * (portfolio.holdings ?? 0) : 0
  const unrealized = portfolio ? (portfolio.marketValueUsd ?? 0) - cost : 0
  const rate = cost > 0 ? (unrealized / cost) * 100 : 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">계좌 요약</CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="grid grid-cols-2 gap-3">
          <KpiCard label="계좌번호" value={<span className="font-mono tracking-wider">{account.accountNoMasked}</span>} />
          <KpiCard label="증권사" value={account.broker} />
          <KpiCard label="예수금" value={`$${(usdDeposit ?? 0).toFixed(2)}`} />
          {hasStrategy && portfolio && (
            <>
              <KpiCard label="종목" value={portfolio.ticker} />
              <KpiCard label="현재가" value={`$${(portfolio.currentPrice ?? 0).toFixed(2)}`} />
              <KpiCard label="보유 수량" value={`${portfolio.holdings}주`} />
              <KpiCard label="평단가" value={`$${(portfolio.avgPrice ?? 0).toFixed(2)}`} />
              <KpiCard label="평가 금액" value={`$${(portfolio.marketValueUsd ?? 0).toFixed(2)}`} />
              <KpiCard
                label="평가 손익"
                variant="default"
                value={
                  <span
                    style={{
                      color: unrealized >= 0 ? 'var(--pos)' : 'var(--neg)',
                    }}
                  >
                    {unrealized >= 0 ? '+' : ''}${unrealized.toFixed(2)} ({rate >= 0 ? '+' : ''}
                    {rate.toFixed(2)}%)
                  </span>
                }
              />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

const RANGE_LABELS: Record<RangeType, string> = {
  all: '전체',
  '7d': '7일',
  '30d': '30일',
  custom: '직접입력',
}

function buildParams(rangeType: RangeType, customFrom: string, customTo: string): { from?: string; to?: string } | null {
  const today = new Date().toISOString().split('T')[0]
  if (rangeType === 'all') return {}
  if (rangeType === '30d') {
    const from = new Date()
    from.setDate(from.getDate() - 30)
    return { from: from.toISOString().split('T')[0], to: today }
  }
  if (rangeType === '7d') {
    const from = new Date()
    from.setDate(from.getDate() - 7)
    return { from: from.toISOString().split('T')[0], to: today }
  }
  if (!customFrom || !customTo) return null
  return { from: customFrom, to: customTo }
}

function CycleHistoryTable({ title, cycleHistory, isLoading, rangeType, setRangeType, customFrom, setCustomFrom, customTo, setCustomTo }: {
  title: string
  cycleHistory: CycleHistoryItem[]
  isLoading: boolean
  rangeType: RangeType
  setRangeType: (r: RangeType) => void
  customFrom: string
  setCustomFrom: (v: string) => void
  customTo: string
  setCustomTo: (v: string) => void
}) {
  const rangeLabel =
    rangeType === 'all'
      ? '전체'
      : rangeType === '7d'
        ? '최근 7일'
        : rangeType === '30d'
          ? '최근 30일'
          : customFrom && customTo
            ? `${customFrom} ~ ${customTo}`
            : '기간 선택 중'

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {rangeLabel} · 총 {isLoading ? '…' : cycleHistory.length}건
              </p>
            </div>
            <div className="flex gap-0.5 rounded-lg bg-muted p-1 shrink-0">
              {(['all', '7d', '30d', 'custom'] as RangeType[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRangeType(r)}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                    rangeType === r ? 'bg-background text-rose-600 shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {RANGE_LABELS[r]}
                </button>
              ))}
            </div>
          </div>
          {rangeType === 'custom' && (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                aria-label="시작 날짜"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="text-xs text-muted-foreground">~</span>
              <input
                type="date"
                aria-label="종료 날짜"
                value={customTo}
                min={customFrom || undefined}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">로딩 중...</div>
        ) : cycleHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 px-6">거래 내역이 없습니다.</p>
        ) : (
          <>
            {/* 모바일: 카드 리스트 */}
            <div className="space-y-2 p-4 lg:hidden overflow-y-auto max-h-[440px]">
              {cycleHistory.map((entry) => (
                <Card key={entry.createdAt} className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{entry.ticker ?? '-'}</span>
                    <span className="text-sm font-semibold">${(entry.usdDeposit ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>
                      {entry.holdings}주{entry.avgPrice != null ? ` · 평균 $${entry.avgPrice.toFixed(2)}` : ''}
                    </span>
                    <span>{new Date(entry.createdAt).toLocaleDateString('ko-KR')}</span>
                  </div>
                </Card>
              ))}
            </div>
            {/* 데스크탑: 테이블 */}
            <div className="hidden lg:block overflow-y-auto max-h-[440px]">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0 z-10">
                  <tr>
                    {['일시', '종목', '보유수량', '평균단가', '예수금'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] uppercase tracking-widest text-rose-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cycleHistory.map((entry) => (
                    <tr key={entry.createdAt} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">{new Date(entry.createdAt).toLocaleDateString('ko-KR')}</td>
                      <td className="px-4 py-3 font-medium">{entry.ticker ?? '-'}</td>
                      <td className="px-4 py-3">{entry.holdings}주</td>
                      <td className="px-4 py-3">{entry.avgPrice != null ? `$${entry.avgPrice.toFixed(2)}` : '-'}</td>
                      <td className="px-4 py-3 font-medium">${(entry.usdDeposit ?? 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

type TradeTabState = {
  rangeType: RangeType
  customFrom: string
  customTo: string
  cycleHistory: CycleHistoryItem[]
  isLoading: boolean
}

type TradeTabAction =
  | { type: 'SET_RANGE'; rangeType: RangeType }
  | { type: 'SET_CUSTOM_FROM'; value: string }
  | { type: 'SET_CUSTOM_TO'; value: string }
  | { type: 'FETCH_START' }
  | { type: 'FETCH_DONE'; data: CycleHistoryItem[] }

function tradeTabReducer(state: TradeTabState, action: TradeTabAction): TradeTabState {
  switch (action.type) {
    case 'SET_RANGE': return { ...state, rangeType: action.rangeType }
    case 'SET_CUSTOM_FROM': return { ...state, customFrom: action.value }
    case 'SET_CUSTOM_TO': return { ...state, customTo: action.value }
    case 'FETCH_START': return { ...state, isLoading: true }
    case 'FETCH_DONE': return { ...state, isLoading: false, cycleHistory: action.data }
  }
}

const INITIAL_TAB_STATE: TradeTabState = { rangeType: '30d', customFrom: '', customTo: '', cycleHistory: [], isLoading: true }

function TradesTab({ accountId }: { accountId: string }) {
  const [state, dispatch] = useReducer(tradeTabReducer, INITIAL_TAB_STATE)
  const { rangeType, customFrom, customTo, cycleHistory, isLoading } = state

  useEffect(() => {
    const params = buildParams(rangeType, customFrom, customTo)
    if (params === null) return

    let cancelled = false
    dispatch({ type: 'FETCH_START' })
    getAccountCycleHistory(accountId, params)
      .then((data) => { if (!cancelled) dispatch({ type: 'FETCH_DONE', data }) })
      .catch(() => { if (!cancelled) dispatch({ type: 'FETCH_DONE', data: [] }) })
    return () => { cancelled = true }
  }, [accountId, rangeType, customFrom, customTo])

  return (
    <CycleHistoryTable
      title="거래 내역 (계좌)"
      cycleHistory={cycleHistory}
      isLoading={isLoading}
      rangeType={rangeType}
      setRangeType={(r) => dispatch({ type: 'SET_RANGE', rangeType: r })}
      customFrom={customFrom}
      setCustomFrom={(v) => dispatch({ type: 'SET_CUSTOM_FROM', value: v })}
      customTo={customTo}
      setCustomTo={(v) => dispatch({ type: 'SET_CUSTOM_TO', value: v })}
    />
  )
}

function StrategyTradesTab({ strategyId }: { strategyId: string | undefined }) {
  const [state, dispatch] = useReducer(tradeTabReducer, INITIAL_TAB_STATE)
  const { rangeType, customFrom, customTo, cycleHistory, isLoading } = state

  useEffect(() => {
    if (!strategyId) {
      dispatch({ type: 'FETCH_DONE', data: [] })
      return
    }
    const params = buildParams(rangeType, customFrom, customTo)
    if (params === null) return

    let cancelled = false
    dispatch({ type: 'FETCH_START' })
    getStrategyCycleHistory(strategyId, params)
      .then((data) => { if (!cancelled) dispatch({ type: 'FETCH_DONE', data }) })
      .catch(() => { if (!cancelled) dispatch({ type: 'FETCH_DONE', data: [] }) })
    return () => { cancelled = true }
  }, [strategyId, rangeType, customFrom, customTo])

  if (!strategyId) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">거래 내역 (전략)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">전략이 없습니다.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <CycleHistoryTable
      title="거래 내역 (전략)"
      cycleHistory={cycleHistory}
      isLoading={isLoading}
      rangeType={rangeType}
      setRangeType={(r) => dispatch({ type: 'SET_RANGE', rangeType: r })}
      customFrom={customFrom}
      setCustomFrom={(v) => dispatch({ type: 'SET_CUSTOM_FROM', value: v })}
      customTo={customTo}
      setCustomTo={(v) => dispatch({ type: 'SET_CUSTOM_TO', value: v })}
    />
  )
}
