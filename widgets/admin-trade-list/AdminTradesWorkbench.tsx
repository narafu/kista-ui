'use client'

import { useState } from 'react'
import {
  correctAdminOrder,
  listAdminAccounts,
  listAdminStrategies,
  listAdminStrategyOrders,
  updateAdminStrategyStatus,
} from '@entities/user'
import type {
  AdminAccount,
  AdminOrderCorrectionRequest,
  AdminOrderCorrectionResponse,
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
  loadOrders?: (accountId: string, strategyId: string, tradeDate: string) => Promise<AdminStrategyOrder[]>
  toggleStrategyStatus?: (accountId: string, strategyId: string, status: AdminStrategy['status']) => Promise<void>
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
  loadOrders = async (accountId, strategyId, tradeDate) => listAdminStrategyOrders(accountId, strategyId, tradeDate),
  toggleStrategyStatus = async (accountId, strategyId, status) => updateAdminStrategyStatus(accountId, strategyId, status),
}: Props) {
  const [page, setPage] = useState(initialPage)
  const [size, setSize] = useState(initialSize)
  const [selectedTradeIds, setSelectedTradeIds] = useState<string[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedBroker, setSelectedBroker] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [selectedStrategyId, setSelectedStrategyId] = useState('')
  const [selectedTradeDate, setSelectedTradeDate] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [accounts, setAccounts] = useState<AdminAccount[]>([])
  const [strategies, setStrategies] = useState<AdminStrategy[]>([])
  const [orders, setOrders] = useState<AdminStrategyOrder[]>([])
  const [strategyStatusPending, setStrategyStatusPending] = useState(false)
  const [correctionPending, setCorrectionPending] = useState(false)
  const [correctionResult, setCorrectionResult] = useState<AdminOrderCorrectionResponse | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const totalPages = Math.max(1, Math.ceil(initialTrades.length / size))
  const currentPage = Math.min(page, totalPages)
  const pagedTrades = initialTrades.slice((currentPage - 1) * size, currentPage * size)
  const selectedTrades = initialTrades.filter((trade) => selectedTradeIds.includes(trade.id))
  const userOptions = uniqBy(initialTrades, (trade) => trade.userId).map((trade) => ({
    id: trade.userId,
    label: trade.ownerNickname,
  }))
  const brokerOptions = uniqBy(
    accounts
      .map((account) => account.broker)
      .filter((broker): broker is string => Boolean(broker)),
    (broker) => broker,
  )
  const filteredAccounts = selectedBroker
    ? accounts.filter((account) => account.broker === selectedBroker)
    : []
  const tradeDates = uniqBy(
    initialTrades.filter((trade) => trade.userId === selectedUserId),
    (trade) => trade.tradeDate,
  ).map((trade) => trade.tradeDate)
  const selectedStrategy = strategies.find((strategy) => strategy.id === selectedStrategyId) ?? null
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null

  const handleSizeChange = (nextSize: string) => {
    setSize(Number(nextSize))
    setPage(1)
  }

  const handleToggleTrade = (tradeId: string) => {
    setSelectedTradeIds((current) =>
      current.includes(tradeId)
        ? current.filter((id) => id !== tradeId)
        : [...current, tradeId],
    )
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
    setSelectedOrderId('')
    setStrategies([])
    setOrders([])

    if (!userId) {
      setAccounts([])
      return
    }

    try {
      setAccounts(await loadAccounts(userId))
    } catch {
      setAccounts([])
      setActionError('계좌 목록을 불러오지 못했습니다. 잠시 후 다시 시도하세요.')
    }
  }

  const handleBrokerChange = (broker: string) => {
    resetFeedback()
    setSelectedBroker(broker)
    setSelectedAccountId('')
    setSelectedStrategyId('')
    setSelectedTradeDate('')
    setSelectedOrderId('')
    setStrategies([])
    setOrders([])
  }

  const handleAccountChange = async (accountId: string) => {
    resetFeedback()
    setSelectedAccountId(accountId)
    setSelectedStrategyId('')
    setSelectedTradeDate('')
    setSelectedOrderId('')
    setOrders([])

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

  const handleStrategyChange = (strategyId: string) => {
    resetFeedback()
    setSelectedStrategyId(strategyId)
    setSelectedTradeDate('')
    setSelectedOrderId('')
    setOrders([])
  }

  const handleTradeDateChange = async (tradeDate: string) => {
    resetFeedback()
    setSelectedTradeDate(tradeDate)
    setSelectedOrderId('')

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

  const handleOrderChange = (orderId: string) => {
    resetFeedback()
    setSelectedOrderId(orderId)
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
    request: Pick<AdminOrderCorrectionRequest, 'mode' | 'direction' | 'quantity' | 'price' | 'memo'>,
  ) => {
    if (!selectedOrder || !selectedUserId || !selectedAccountId || !selectedStrategyId || !selectedTradeDate) return

    setCorrectionPending(true)
    resetFeedback()

    try {
      const result = await correctAdminOrder({
        userId: selectedUserId,
        accountId: selectedAccountId,
        strategyId: selectedStrategyId,
        orderId: selectedOrder.id,
        tradeDateKst: selectedTradeDate,
        ...request,
      })
      setOrders(await loadOrders(selectedAccountId, selectedStrategyId, selectedTradeDate))
      setCorrectionResult(result)
    } catch {
      setActionError('주문 보정에 실패했습니다. 입력값과 주문 상태를 다시 확인하세요.')
    } finally {
      setCorrectionPending(false)
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-muted/20 p-4" aria-label="선택된 보정 대상">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-base font-semibold">선택된 보정 대상</h2>
            <p className="mt-1 text-sm text-muted-foreground">{selectedTrades.length}건 선택됨</p>
          </div>
          <PageSizeSelector value={String(size)} onChange={handleSizeChange} />
        </div>

        {selectedTrades.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">선택한 거래가 없습니다</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {selectedTrades.map((trade) => (
              <li
                key={trade.id}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <span className="font-medium">{trade.ownerNickname}</span>
                <span className="mx-2 text-muted-foreground">·</span>
                <span>{trade.ticker}</span>
                <span className="mx-2 text-muted-foreground">·</span>
                <span className="text-muted-foreground">{trade.tradeDate}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AdminTradeCorrectionPanel
        users={userOptions}
        brokers={brokerOptions}
        accounts={filteredAccounts}
        strategies={strategies}
        tradeDates={tradeDates}
        orders={orders}
        selectedStrategy={selectedStrategy}
        selectedOrder={selectedOrder}
        selectedUserId={selectedUserId}
        selectedBroker={selectedBroker}
        selectedAccountId={selectedAccountId}
        selectedStrategyId={selectedStrategyId}
        selectedTradeDate={selectedTradeDate}
        selectedOrderId={selectedOrderId}
        strategyStatusPending={strategyStatusPending}
        correctionPending={correctionPending}
        onUserChange={handleUserChange}
        onBrokerChange={handleBrokerChange}
        onAccountChange={handleAccountChange}
        onStrategyChange={handleStrategyChange}
        onTradeDateChange={handleTradeDateChange}
        onOrderChange={handleOrderChange}
        onStrategyStatusToggle={handleStrategyStatusToggle}
        onOrderCorrectionSubmit={handleOrderCorrectionSubmit}
      />

      {actionError ? (
        <section
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-950 dark:border-rose-950/70 dark:bg-rose-950/20 dark:text-rose-200"
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
          <h2 className="text-base font-semibold">주문 보정이 완료되었습니다</h2>
          <p className="mt-1 text-sm">
            상태: {correctionResult.originalStatus} -&gt; {correctionResult.resultingStatus}
          </p>
          <p className="mt-2 text-sm">
            최종 보유 수량 {correctionResult.finalHoldings}주 · 평균가 {correctionResult.finalAvgPrice ?? '-'} · 예수금 {correctionResult.finalUsdDeposit}
          </p>
        </section>
      ) : null}

      <AdminTradesTable
        trades={pagedTrades}
        selectedTradeIds={selectedTradeIds}
        onToggleTrade={handleToggleTrade}
      />

      <PaginationBar page={currentPage} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}
