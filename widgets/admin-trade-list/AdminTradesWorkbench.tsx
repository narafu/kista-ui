'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  adminKeys,
  useAdminAccountsByUserQuery,
  useAdminStrategiesByAccountQuery,
  useAdminStrategyOrdersQuery,
  useAdminReorderTimingQuery,
  useUpdateAdminStrategyStatusMutation,
  useReorderAdminOrderMutation,
} from '@entities/admin'
import type { AdminTrade } from '@entities/admin'
import { todayKst } from '@shared/lib/format'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { AdminTradeCorrectionPanel } from './AdminTradeCorrectionPanel'
import { AdminTradesFeedback } from './AdminTradesFeedback'
import { AdminTradesTable } from './AdminTradesTable'
import type { ReorderSummary } from './model/types'
import type { ReorderBatchItem } from './AdminBatchOrderCorrectionForm'

interface Props {
  initialTrades: AdminTrade[]
  initialPage: number
  initialSize: number
}

const DEFAULT_TIMING_AVAILABILITY = { atOpen: false, atClose: true, immediate: false }

function uniqBy<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = getKey(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function AdminTradesWorkbench({ initialTrades, initialPage, initialSize }: Props) {
  const queryClient = useQueryClient()

  const [page, setPage] = useState(initialPage)
  const [size, setSize] = useState(initialSize)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedBroker, setSelectedBroker] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [selectedStrategyId, setSelectedStrategyId] = useState('')
  const [reorderResult, setReorderResult] = useState<ReorderSummary | null>(null)
  const [reorderPending, setReorderPending] = useState(false)
  // 계좌/전략/주문 조회 실패, 재주문 실패는 toast가 아니라 이 인라인 배너(AdminTradesFeedback)로
  // 표시한다 — 운영 개입 화면이라 사라지는 토스트보다 고정 배너가 낫다는 기존 설계를 유지.
  const [manualError, setManualError] = useState<string | null>(null)

  const accountsQuery = useAdminAccountsByUserQuery(selectedUserId)
  const strategiesQuery = useAdminStrategiesByAccountQuery(selectedAccountId)
  const ordersQuery = useAdminStrategyOrdersQuery(selectedAccountId, selectedStrategyId, todayKst())
  const timingQuery = useAdminReorderTimingQuery()
  const statusMutation = useUpdateAdminStrategyStatusMutation()
  const reorderMutation = useReorderAdminOrderMutation()

  const accounts = accountsQuery.data ?? []
  const strategies = strategiesQuery.data ?? []
  const orders = ordersQuery.data ?? []
  const timingAvailability = timingQuery.data ?? DEFAULT_TIMING_AVAILABILITY

  const actionError =
    manualError
    ?? (accountsQuery.isError ? '계좌 목록을 불러오지 못했습니다. 잠시 후 다시 시도하세요.' : null)
    ?? (strategiesQuery.isError ? '전략 목록을 불러오지 못했습니다. 잠시 후 다시 시도하세요.' : null)
    ?? (ordersQuery.isError ? '주문 목록을 불러오지 못했습니다. 잠시 후 다시 시도하세요.' : null)

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
    return true
  })
  const totalPages = Math.max(1, Math.ceil(filteredTrades.length / size))
  const currentPage = Math.min(page, totalPages)
  const pagedTrades = filteredTrades.slice((currentPage - 1) * size, currentPage * size)

  // 선택 단계가 바뀔 때마다 반복되는 피드백 초기화 + 1페이지 복귀 — 예전 reducer의
  // FEEDBACK_CLEAR 상수와 같은 역할, 새 선택 핸들러 추가 시 이 호출을 빠뜨리지 않도록 모은다.
  function clearFeedbackAndResetPage() {
    setManualError(null)
    setReorderResult(null)
    setPage(1)
  }

  function handleUserChange(userId: string) {
    clearFeedbackAndResetPage()
    setSelectedUserId(userId)
    setSelectedBroker('')
    setSelectedAccountId('')
    setSelectedStrategyId('')
    // accountsQuery는 userId 무관 공용 키를 쓰므로(전체 목록 중복조회 방지), 직전 조회가 실패해
    // error 상태로 멈춰 있으면 사용자를 바꿔도 키가 그대로라 자동 재조회되지 않는다 — 매 선택을
    // "새 시도"로 취급하려면 명시적으로 refetch한다.
    if (userId) void accountsQuery.refetch()
  }

  function handleBrokerChange(broker: string) {
    clearFeedbackAndResetPage()
    setSelectedBroker(broker)
    setSelectedAccountId('')
    setSelectedStrategyId('')
  }

  function handleAccountChange(accountId: string) {
    clearFeedbackAndResetPage()
    setSelectedAccountId(accountId)
    setSelectedStrategyId('')
  }

  function handleStrategyChange(strategyId: string) {
    clearFeedbackAndResetPage()
    setSelectedStrategyId(strategyId)
  }

  async function handleStrategyStatusToggle() {
    if (!selectedAccountId || !selectedStrategy) return
    const nextStatus = selectedStrategy.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    setManualError(null)
    try {
      await statusMutation.mutateAsync({ accountId: selectedAccountId, strategyId: selectedStrategy.id, status: nextStatus })
    } catch {
      setManualError('전략 상태 변경에 실패했습니다. 잠시 후 다시 시도하세요.')
    }
  }

  async function handleReorderSubmit(items: ReorderBatchItem[]) {
    if (!selectedUserId || !selectedAccountId || !selectedStrategyId || items.length === 0) return

    // skipped 계산은 리로드 前 클로저 orders.length 기준
    const ordersCountBeforeReload = orders.length

    setManualError(null)
    setReorderResult(null)
    setReorderPending(true)

    // 재주문 시점 가용성 재조회 (제출 시점에 시장 단계가 바뀔 수 있음) — 실패 시 기존 값 유지
    await queryClient.invalidateQueries({ queryKey: adminKeys.reorderTiming() }).catch(() => {})

    try {
      const results: Array<{ sourceOrderId: string; originalStatus: string; resultingStatus: string }> = []
      let failedCount = 0

      for (const item of items) {
        try {
          // eslint-disable-next-line react-doctor/async-await-in-loop
          const result = await reorderMutation.mutateAsync({
            userId: selectedUserId,
            accountId: selectedAccountId,
            strategyId: selectedStrategyId,
            tradeDate: todayKst(),
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
        await queryClient.invalidateQueries({
          queryKey: adminKeys.strategyOrders(selectedAccountId, selectedStrategyId, todayKst()),
        }).catch(() => {}) // 재주문은 적용됐으므로 목록 갱신 실패는 무시
        setReorderResult({
          processed: results.length,
          skipped: Math.max(0, ordersCountBeforeReload - items.length),
          results,
        })
      }

      if (failedCount > 0) {
        setManualError(
          results.length > 0
            ? `${results.length}건 재주문 완료, ${failedCount}건 실패. 실패한 주문을 다시 확인하세요.`
            : '재주문에 실패했습니다. 입력값과 주문 상태를 다시 확인하세요.',
        )
      }
    } finally {
      setReorderPending(false)
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[var(--r-lg)] border border-border bg-muted/20 p-4" aria-label="거래일 재주문 대상">
        <div>
          <h2 className="text-base font-semibold">거래일 재주문 대상</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            전략을 고르면 오늘 주문 전체를 한 번에 재주문합니다.
          </p>
        </div>
      </section>

      <AdminTradeCorrectionPanel
        users={userOptions}
        brokers={brokerOptions}
        accounts={filteredAccounts}
        strategies={strategies}
        orders={orders}
        selectedStrategy={selectedStrategy}
        selectedUserId={selectedUserId}
        selectedBroker={selectedBroker}
        selectedAccountId={selectedAccountId}
        selectedStrategyId={selectedStrategyId}
        strategyStatusPending={statusMutation.isPending}
        reorderPending={reorderPending}
        timingAvailability={timingAvailability}
        onUserChange={handleUserChange}
        onBrokerChange={handleBrokerChange}
        onAccountChange={handleAccountChange}
        onStrategyChange={handleStrategyChange}
        onStrategyStatusToggle={handleStrategyStatusToggle}
        onReorderSubmit={handleReorderSubmit}
      />

      <AdminTradesFeedback actionError={actionError} reorderResult={reorderResult} />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-base font-semibold">거래 내역</h2>
        <PageSizeSelector value={String(size)} onChange={(nextSize) => { setSize(Number(nextSize)); setPage(1) }} />
      </div>

      <AdminTradesTable trades={pagedTrades} />

      <PaginationBar page={currentPage} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}
