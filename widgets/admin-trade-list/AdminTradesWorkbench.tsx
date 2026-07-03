'use client'

import { useEffect, useReducer } from 'react'
import {
  reorderAdminOrder,
  getReorderTimingAvailability,
  listAdminAccounts,
  listAdminStrategies,
  listAdminStrategyOrders,
  listAdminStrategyTradeDates,
  updateAdminStrategyStatus,
} from '@entities/user'
import type {
  AdminAccount,
  AdminStrategy,
  AdminStrategyOrder,
  AdminTrade,
} from '@entities/user'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { AdminTradeCorrectionPanel } from './AdminTradeCorrectionPanel'
import { AdminTradesFeedback } from './AdminTradesFeedback'
import { AdminTradesTable } from './AdminTradesTable'
import { adminTradesReducer, createInitialState } from './adminTradesReducer'
import type { ReorderBatchItem } from './AdminBatchOrderCorrectionForm'

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
  const [state, dispatch] = useReducer(adminTradesReducer, { initialPage, initialSize }, createInitialState)
  const {
    page, size,
    selectedUserId, selectedBroker, selectedAccountId, selectedStrategyId, selectedTradeDate,
    accounts, strategies, tradeDates, orders,
    strategyStatusPending, reorderPending, reorderResult, actionError, timingAvailability,
  } = state

  // 마운트 시 재주문 시점 가용성 조회
  useEffect(() => {
    getReorderTimingAvailability()
      .then((t) => dispatch({ type: 'SET_TIMING_AVAILABILITY', timingAvailability: t }))
      .catch(() => {}) // 실패 시 기본값 유지
  }, [])

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

  const handleUserChange = async (userId: string) => {
    dispatch({ type: 'SELECT_USER', userId })
    if (!userId) return
    try {
      dispatch({ type: 'LOADED_ACCOUNTS', accounts: await loadAccounts(userId) })
    } catch {
      dispatch({ type: 'SET_ERROR', message: '계좌 목록을 불러오지 못했습니다. 잠시 후 다시 시도하세요.' })
    }
  }

  const handleBrokerChange = (broker: string) => {
    dispatch({ type: 'SELECT_BROKER', broker })
  }

  const handleAccountChange = async (accountId: string) => {
    dispatch({ type: 'SELECT_ACCOUNT', accountId })
    if (!accountId) {
      dispatch({ type: 'LOADED_STRATEGIES', strategies: [] })
      return
    }
    try {
      dispatch({ type: 'LOADED_STRATEGIES', strategies: await loadStrategies(accountId) })
    } catch {
      dispatch({ type: 'STRATEGIES_FAILED', message: '전략 목록을 불러오지 못했습니다. 잠시 후 다시 시도하세요.' })
    }
  }

  const handleStrategyChange = async (strategyId: string) => {
    dispatch({ type: 'SELECT_STRATEGY', strategyId })
    if (!selectedAccountId || !strategyId) return
    try {
      dispatch({ type: 'LOADED_TRADE_DATES', tradeDates: await loadTradeDates(selectedAccountId, strategyId) })
    } catch {
      const fallbackStrategy = strategies.find((strategy) => strategy.id === strategyId) ?? null
      const fallbackTradeDates = deriveTradeDates(fallbackStrategy)
      dispatch({ type: 'LOADED_TRADE_DATES', tradeDates: fallbackTradeDates })
      if (fallbackTradeDates.length === 0) {
        dispatch({ type: 'SET_ERROR', message: '거래일 목록을 불러오지 못했습니다. 잠시 후 다시 시도하세요.' })
      }
    }
  }

  const handleTradeDateChange = async (tradeDate: string) => {
    dispatch({ type: 'SELECT_TRADE_DATE', tradeDate })
    if (!selectedAccountId || !selectedStrategyId || !tradeDate) {
      dispatch({ type: 'LOADED_ORDERS', orders: [] })
      return
    }
    try {
      dispatch({ type: 'LOADED_ORDERS', orders: await loadOrders(selectedAccountId, selectedStrategyId, tradeDate) })
    } catch {
      dispatch({ type: 'ORDERS_FAILED', message: '주문 목록을 불러오지 못했습니다. 잠시 후 다시 시도하세요.' })
    }
  }

  const handleStrategyStatusToggle = async () => {
    if (!selectedAccountId || !selectedStrategy) return
    const nextStatus = selectedStrategy.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    dispatch({ type: 'STRATEGY_STATUS_START' })
    try {
      await toggleStrategyStatus(selectedAccountId, selectedStrategy.id, nextStatus)
      dispatch({ type: 'LOADED_STRATEGIES', strategies: await loadStrategies(selectedAccountId) })
    } catch {
      dispatch({ type: 'SET_ERROR', message: '전략 상태 변경에 실패했습니다. 잠시 후 다시 시도하세요.' })
    } finally {
      dispatch({ type: 'STRATEGY_STATUS_END' })
    }
  }

  const handleReorderSubmit = async (items: ReorderBatchItem[]) => {
    if (!selectedUserId || !selectedAccountId || !selectedStrategyId || !selectedTradeDate || items.length === 0) return

    // skipped 계산은 리로드 前 클로저 orders.length 기준 — dispatch 후 state가 바뀌기 전 값 캡처
    const ordersCountBeforeReload = orders.length

    dispatch({ type: 'REORDER_START' })

    // 재주문 시점 가용성 재조회 (제출 시점에 시장 단계가 바뀔 수 있음)
    try {
      dispatch({ type: 'SET_TIMING_AVAILABILITY', timingAvailability: await getReorderTimingAvailability() })
    } catch {
      // 실패 시 기존 값 유지
    }

    try {
      const results: Array<{ sourceOrderId: string; originalStatus: string; resultingStatus: string }> = []
      let failedCount = 0

      for (const item of items) {
        try {
          const result = await reorderAdminOrder({
            userId: selectedUserId,
            accountId: selectedAccountId,
            strategyId: selectedStrategyId,
            tradeDateKst: selectedTradeDate,
            orderId: item.orderId,
            timing: item.timing,
            direction: item.direction,
            quantity: item.quantity,
            price: item.price,
            memo: item.memo,
          })
          results.push({
            sourceOrderId: result.sourceOrderId,
            originalStatus: result.originalStatus,
            resultingStatus: result.resultingStatus,
          })
        } catch {
          failedCount++
        }
      }

      if (results.length > 0) {
        try {
          dispatch({ type: 'LOADED_ORDERS', orders: await loadOrders(selectedAccountId, selectedStrategyId, selectedTradeDate) })
        } catch {
          // 재주문은 적용됐으므로 목록 갱신 실패는 무시
        }
        dispatch({
          type: 'REORDER_SUCCESS',
          summary: {
            processed: results.length,
            skipped: Math.max(0, ordersCountBeforeReload - items.length),
            results,
          },
        })
      }

      if (failedCount > 0) {
        dispatch({
          type: 'SET_ERROR',
          message: results.length > 0
            ? `${results.length}건 재주문 완료, ${failedCount}건 실패. 실패한 주문을 다시 확인하세요.`
            : '재주문에 실패했습니다. 입력값과 주문 상태를 다시 확인하세요.',
        })
      }
    } finally {
      dispatch({ type: 'REORDER_END' })
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-muted/20 p-4" aria-label="거래일 재주문 대상">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-base font-semibold">거래일 재주문 대상</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              전략과 거래일을 고르면 해당 날짜 주문 전체를 한 번에 재주문합니다.
            </p>
          </div>
          <PageSizeSelector value={String(size)} onChange={(nextSize) => dispatch({ type: 'SET_SIZE', size: Number(nextSize) })} />
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
        reorderPending={reorderPending}
        timingAvailability={timingAvailability}
        onUserChange={handleUserChange}
        onBrokerChange={handleBrokerChange}
        onAccountChange={handleAccountChange}
        onStrategyChange={handleStrategyChange}
        onTradeDateChange={handleTradeDateChange}
        onStrategyStatusToggle={handleStrategyStatusToggle}
        onReorderSubmit={handleReorderSubmit}
      />

      <AdminTradesFeedback actionError={actionError} reorderResult={reorderResult} />

      <AdminTradesTable trades={pagedTrades} />

      <PaginationBar page={currentPage} totalPages={totalPages} onPageChange={(p) => dispatch({ type: 'SET_PAGE', page: p })} />
    </div>
  )
}
