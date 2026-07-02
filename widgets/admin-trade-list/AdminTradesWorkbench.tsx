'use client'

import { useState } from 'react'
import {
  correctAdminOrder,
  listAdminAccounts,
  listAdminStrategies,
  listAdminStrategyOrders,
  listAdminStrategyTradeDates,
  updateAdminStrategyStatus,
} from '@entities/user'
import type {
  AdminAccount,
  AdminOrderCorrectionRequest,
  AdminStrategy,
  AdminStrategyOrder,
  AdminTrade,
} from '@entities/user'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { AdminTradeCorrectionPanel } from './AdminTradeCorrectionPanel'
import { AdminTradesTable } from './AdminTradesTable'

interface Props {
  initialTrades: AdminTrade[]
  initialPage: number
  initialSize: number
  loadAccounts?: (userId: string) => Promise<AdminAccount[]>
  loadStrategies?: (accountId: string) => Promise<AdminStrategy[]>
  loadTradeDates?: (accountId: string, strategyId: string) => Promise<string[]>
  loadOrders?: (accountId: string, strategyId: string, tradeDate: string) => Promise<AdminStrategyOrder[]>
  toggleStrategyStatus?: (accountId: string, strategyId: string, status: AdminStrategy['status']) => Promise<void>
}

interface BatchCorrectionSummary {
  processed: number
  skipped: number
  results: Array<{
    orderId: string
    originalStatus: string
    resultingStatus: string
  }>
}

function uniqBy<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>()

  return items.filter((item) => {
    const key = getKey(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function AdminTradesWorkbench({
  initialTrades,
  initialPage,
  initialSize,
  loadAccounts = async (userId) => {
    const accounts = await listAdminAccounts('')
    return accounts.filter((account) => account.userId === userId)
  },
  loadStrategies = async (accountId) => listAdminStrategies(accountId),
  loadTradeDates = async (accountId, strategyId) => listAdminStrategyTradeDates(accountId, strategyId),
  loadOrders = async (accountId, strategyId, tradeDate) => listAdminStrategyOrders(accountId, strategyId, tradeDate),
  toggleStrategyStatus = async (accountId, strategyId, status) => updateAdminStrategyStatus(accountId, strategyId, status),
}: Props) {
  const [page, setPage] = useState(initialPage)
  const [size, setSize] = useState(initialSize)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedBroker, setSelectedBroker] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [selectedStrategyId, setSelectedStrategyId] = useState('')
  const [selectedTradeDate, setSelectedTradeDate] = useState('')
  const [accounts, setAccounts] = useState<AdminAccount[]>([])
  const [strategies, setStrategies] = useState<AdminStrategy[]>([])
  const [tradeDates, setTradeDates] = useState<string[]>([])
  const [orders, setOrders] = useState<AdminStrategyOrder[]>([])
  const [strategyStatusPending, setStrategyStatusPending] = useState(false)
  const [correctionPending, setCorrectionPending] = useState(false)
  const [correctionResult, setCorrectionResult] = useState<BatchCorrectionSummary | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const userOptions = uniqBy(initialTrades, (trade) => trade.userId).map((trade) => ({
    id: trade.userId,
    label: trade.ownerNickname,
  }))
  const brokerOptions = uniqBy(
    accounts.map((account) => account.broker),
    (broker) => broker,
  )
  const filteredAccounts = selectedBroker
    ? accounts.filter((account) => account.broker === selectedBroker)
    : []
  const selectedAccount = filteredAccounts.find((account) => account.id === selectedAccountId) ?? null
  const selectedStrategy = strategies.find((strategy) => strategy.id === selectedStrategyId) ?? null
  const filteredTrades = initialTrades.filter((trade) => {
    if (selectedUserId && trade.userId !== selectedUserId) return false
    if (selectedAccount && trade.accountId !== selectedAccount.id) return false
    if (selectedStrategy && trade.strategyId !== selectedStrategy.id) return false
    if (selectedTradeDate && trade.tradeDate !== selectedTradeDate) return false
    return true
  })
  const totalPages = Math.max(1, Math.ceil(filteredTrades.length / size))
  const currentPage = Math.min(page, totalPages)
  const pagedTrades = filteredTrades.slice((currentPage - 1) * size, currentPage * size)

  const deriveTradeDates = (strategy: AdminStrategy | null) =>
    uniqBy(
      initialTrades.filter((trade) => {
        if (selectedUserId && trade.userId !== selectedUserId) return false
        if (selectedAccount && trade.accountId !== selectedAccount.id) return false
        if (strategy && trade.strategyId !== strategy.id) return false
        return true
      }),
      (trade) => trade.tradeDate,
    ).map((trade) => trade.tradeDate)

  const handleSizeChange = (nextSize: string) => {
    setSize(Number(nextSize))
    setPage(1)
  }

  const resetFeedback = () => {
    setCorrectionResult(null)
    setActionError(null)
  }

  const handleUserChange = async (userId: string) => {
    resetFeedback()
    setSelectedUserId(userId)
    setSelectedBroker('')
    setSelectedAccountId('')
    setSelectedStrategyId('')
    setSelectedTradeDate('')
    setStrategies([])
    setTradeDates([])
    setOrders([])
    setPage(1)

    if (!userId) {
      setAccounts([])
      return
    }

    setAccounts([])

    try {
      setAccounts(await loadAccounts(userId))
    } catch {
      setActionError('계좌 목록을 불러오지 못했습니다. 잠시 후 다시 시도하세요.')
    }
  }

  const handleBrokerChange = (broker: string) => {
    resetFeedback()
    setSelectedBroker(broker)
    setSelectedAccountId('')
    setSelectedStrategyId('')
    setSelectedTradeDate('')
    setStrategies([])
    setTradeDates([])
    setOrders([])
    setPage(1)
  }

  const handleAccountChange = async (accountId: string) => {
    resetFeedback()
    setSelectedAccountId(accountId)
    setSelectedStrategyId('')
    setSelectedTradeDate('')
    setTradeDates([])
    setOrders([])
    setPage(1)

    if (!accountId) {
      setStrategies([])
      return
    }

    try {
      setStrategies(await loadStrategies(accountId))
    } catch {
      setStrategies([])
      setActionError('전략 목록을 불러오지 못했습니다. 잠시 후 다시 시도하세요.')
    }
  }

  const handleStrategyChange = async (strategyId: string) => {
    resetFeedback()
    setSelectedStrategyId(strategyId)
    setSelectedTradeDate('')
    setTradeDates([])
    setOrders([])
    setPage(1)

    if (!selectedAccountId || !strategyId) return

    try {
      const nextTradeDates = await loadTradeDates(selectedAccountId, strategyId)
      setTradeDates(nextTradeDates)
    } catch {
      const fallbackStrategy = strategies.find((strategy) => strategy.id === strategyId) ?? null
      const fallbackTradeDates = deriveTradeDates(fallbackStrategy)
      setTradeDates(fallbackTradeDates)
      if (fallbackTradeDates.length === 0) {
        setActionError('거래일 목록을 불러오지 못했습니다. 잠시 후 다시 시도하세요.')
      }
    }
  }

  const handleTradeDateChange = async (tradeDate: string) => {
    resetFeedback()
    setSelectedTradeDate(tradeDate)
    setPage(1)

    if (!selectedAccountId || !selectedStrategyId || !tradeDate) {
      setOrders([])
      return
    }

    try {
      setOrders(await loadOrders(selectedAccountId, selectedStrategyId, tradeDate))
    } catch {
      setOrders([])
      setActionError('주문 목록을 불러오지 못했습니다. 잠시 후 다시 시도하세요.')
    }
  }

  const handleStrategyStatusToggle = async () => {
    if (!selectedAccountId || !selectedStrategy) return

    const nextStatus = selectedStrategy.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'

    setStrategyStatusPending(true)
    setActionError(null)

    try {
      await toggleStrategyStatus(selectedAccountId, selectedStrategy.id, nextStatus)
      setStrategies(await loadStrategies(selectedAccountId))
    } catch {
      setActionError('전략 상태 변경에 실패했습니다. 잠시 후 다시 시도하세요.')
    } finally {
      setStrategyStatusPending(false)
    }
  }

  const handleOrderCorrectionSubmit = async (
    requests: Array<Pick<AdminOrderCorrectionRequest, 'orderId' | 'mode' | 'direction' | 'quantity' | 'price' | 'memo'>>,
  ) => {
    if (!selectedUserId || !selectedAccountId || !selectedStrategyId || !selectedTradeDate || requests.length === 0) return

    setCorrectionPending(true)
    resetFeedback()

    try {
      const results: BatchCorrectionSummary['results'] = []
      let failedCount = 0

      for (const request of requests) {
        try {
          const result = await correctAdminOrder({
            userId: selectedUserId,
            accountId: selectedAccountId,
            strategyId: selectedStrategyId,
            tradeDateKst: selectedTradeDate,
            ...request,
          })
          results.push({
            orderId: result.orderId,
            originalStatus: result.originalStatus,
            resultingStatus: result.resultingStatus,
          })
        } catch {
          failedCount++
        }
      }

      if (results.length > 0) {
        try {
          setOrders(await loadOrders(selectedAccountId, selectedStrategyId, selectedTradeDate))
        } catch {
          // 보정은 적용됐으므로 목록 갱신 실패는 무시
        }
        setCorrectionResult({
          processed: results.length,
          skipped: Math.max(0, orders.length - requests.length),
          results,
        })
      }

      if (failedCount > 0) {
        setActionError(
          results.length > 0
            ? `${results.length}건 보정 완료, ${failedCount}건 실패. 실패한 주문을 다시 확인하세요.`
            : '주문 보정에 실패했습니다. 입력값과 주문 상태를 다시 확인하세요.',
        )
      }
    } finally {
      setCorrectionPending(false)
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-muted/20 p-4" aria-label="거래일 보정 대상">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-base font-semibold">거래일 보정 대상</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              전략과 거래일을 고르면 해당 날짜 주문 전체를 한 번에 보정합니다.
            </p>
          </div>
          <PageSizeSelector value={String(size)} onChange={handleSizeChange} />
        </div>
      </section>

      <AdminTradeCorrectionPanel
        users={userOptions}
        brokers={brokerOptions}
        accounts={filteredAccounts}
        strategies={strategies}
        tradeDates={tradeDates}
        orders={orders}
        selectedStrategy={selectedStrategy}
        selectedUserId={selectedUserId}
        selectedBroker={selectedBroker}
        selectedAccountId={selectedAccountId}
        selectedStrategyId={selectedStrategyId}
        selectedTradeDate={selectedTradeDate}
        strategyStatusPending={strategyStatusPending}
        correctionPending={correctionPending}
        onUserChange={handleUserChange}
        onBrokerChange={handleBrokerChange}
        onAccountChange={handleAccountChange}
        onStrategyChange={handleStrategyChange}
        onTradeDateChange={handleTradeDateChange}
        onStrategyStatusToggle={handleStrategyStatusToggle}
        onOrderCorrectionSubmit={handleOrderCorrectionSubmit}
      />

      {actionError ? (
        <section
          className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-rose-950 dark:border-rose-800/80 dark:bg-rose-900/40 dark:text-rose-100"
          aria-label="주문 보정 오류"
        >
          <p className="text-sm font-medium">{actionError}</p>
        </section>
      ) : null}

      {correctionResult ? (
        <section
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 dark:border-emerald-950/70 dark:bg-emerald-950/20 dark:text-emerald-200"
          aria-label="주문 보정 결과"
        >
          <h2 className="text-base font-semibold">거래일 주문 보정이 완료되었습니다</h2>
          <p className="mt-1 text-sm">처리 {correctionResult.processed}건 · 제외 {correctionResult.skipped}건</p>
          <p className="mt-2 text-sm">
            {correctionResult.results.map((result) => `${result.orderId}: ${result.originalStatus} -> ${result.resultingStatus}`).join(' / ')}
          </p>
        </section>
      ) : null}

      <AdminTradesTable trades={pagedTrades} />

      <PaginationBar page={currentPage} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}
