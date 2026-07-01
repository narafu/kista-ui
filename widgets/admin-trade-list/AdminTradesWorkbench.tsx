'use client'

import { useState } from 'react'
import {
  correctAdminOrder,
  listAdminAccounts,
  listAdminStrategies,
  listAdminStrategyOrders,
  updateAdminStrategyStatus,
} from '@entities/user'
import type { AdminAccount, AdminOrderCorrectionRequest, AdminStrategy, AdminStrategyOrder, AdminTrade } from '@entities/user'
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
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [selectedStrategyId, setSelectedStrategyId] = useState('')
  const [selectedTradeDate, setSelectedTradeDate] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [accounts, setAccounts] = useState<AdminAccount[]>([])
  const [strategies, setStrategies] = useState<AdminStrategy[]>([])
  const [orders, setOrders] = useState<AdminStrategyOrder[]>([])
  const [strategyStatusPending, setStrategyStatusPending] = useState(false)
  const [correctionPending, setCorrectionPending] = useState(false)

  const totalPages = Math.max(1, Math.ceil(initialTrades.length / size))
  const currentPage = Math.min(page, totalPages)
  const pagedTrades = initialTrades.slice((currentPage - 1) * size, currentPage * size)
  const selectedTrades = initialTrades.filter((trade) => selectedTradeIds.includes(trade.id))
  const userOptions = uniqBy(initialTrades, (trade) => trade.userId).map((trade) => ({
    id: trade.userId,
    label: trade.ownerNickname,
  }))
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

  const handleUserChange = async (userId: string) => {
    setSelectedUserId(userId)
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

    setAccounts(await loadAccounts(userId))
  }

  const handleAccountChange = async (accountId: string) => {
    setSelectedAccountId(accountId)
    setSelectedStrategyId('')
    setSelectedTradeDate('')
    setSelectedOrderId('')
    setOrders([])

    if (!accountId) {
      setStrategies([])
      return
    }

    setStrategies(await loadStrategies(accountId))
  }

  const handleStrategyChange = (strategyId: string) => {
    setSelectedStrategyId(strategyId)
    setSelectedTradeDate('')
    setSelectedOrderId('')
    setOrders([])
  }

  const handleTradeDateChange = async (tradeDate: string) => {
    setSelectedTradeDate(tradeDate)
    setSelectedOrderId('')

    if (!selectedAccountId || !selectedStrategyId || !tradeDate) {
      setOrders([])
      return
    }

    setOrders(await loadOrders(selectedAccountId, selectedStrategyId, tradeDate))
  }

  const handleStrategyStatusToggle = async () => {
    if (!selectedAccountId || !selectedStrategy) return

    const nextStatus = selectedStrategy.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'

    setStrategyStatusPending(true)

    try {
      await toggleStrategyStatus(selectedAccountId, selectedStrategy.id, nextStatus)
      setStrategies(await loadStrategies(selectedAccountId))
    } finally {
      setStrategyStatusPending(false)
    }
  }

  const handleOrderCorrectionSubmit = async (
    request: Pick<AdminOrderCorrectionRequest, 'mode' | 'direction' | 'quantity' | 'price' | 'memo'>,
  ) => {
    if (!selectedOrder || !selectedUserId || !selectedAccountId || !selectedStrategyId || !selectedTradeDate) return

    setCorrectionPending(true)

    try {
      await correctAdminOrder({
        userId: selectedUserId,
        accountId: selectedAccountId,
        strategyId: selectedStrategyId,
        orderId: selectedOrder.id,
        tradeDateKst: selectedTradeDate,
        ...request,
      })
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
        accounts={accounts}
        strategies={strategies}
        tradeDates={tradeDates}
        orders={orders}
        selectedStrategy={selectedStrategy}
        selectedOrder={selectedOrder}
        selectedUserId={selectedUserId}
        selectedAccountId={selectedAccountId}
        selectedStrategyId={selectedStrategyId}
        selectedTradeDate={selectedTradeDate}
        selectedOrderId={selectedOrderId}
        strategyStatusPending={strategyStatusPending}
        correctionPending={correctionPending}
        onUserChange={handleUserChange}
        onAccountChange={handleAccountChange}
        onStrategyChange={handleStrategyChange}
        onTradeDateChange={handleTradeDateChange}
        onOrderChange={setSelectedOrderId}
        onStrategyStatusToggle={handleStrategyStatusToggle}
        onOrderCorrectionSubmit={handleOrderCorrectionSubmit}
      />

      <AdminTradesTable
        trades={pagedTrades}
        selectedTradeIds={selectedTradeIds}
        onToggleTrade={handleToggleTrade}
      />

      <PaginationBar page={currentPage} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}
