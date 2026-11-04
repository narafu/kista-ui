'use client'

import { useState } from 'react'
import { useClientPagination } from '@shared/lib/hooks/use-client-pagination'
import {
  useAdminAccountsByUserQuery,
  useAdminAllAccountsQuery,
  useAdminTradesQuery,
  useAdminStrategiesByAccountQuery,
  useUpdateAdminStrategyStatusMutation,
} from '@entities/admin'
import type { AdminTrade } from '@entities/admin'
import { SectionError } from '@shared/ui/SectionError'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { LoadingRow } from '@shared/ui/LoadingRow'
import { AdminTradeFilterPanel } from './AdminTradeFilterPanel'
import { AdminTradesFeedback } from './AdminTradesFeedback'
import { AdminTradesTable } from './AdminTradesTable'

interface Props {
  from?: string
  to?: string
  initialPage: number
  initialSize: number
}

const EMPTY_TRADES: AdminTrade[] = []

function uniqBy<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = getKey(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function AdminTradesWorkbench({ from, to, initialPage, initialSize }: Props) {
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedBroker, setSelectedBroker] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [selectedStrategyId, setSelectedStrategyId] = useState('')

  const tradesQuery = useAdminTradesQuery({ from, to })
  const allAccountsQuery = useAdminAllAccountsQuery()
  const accountsQuery = useAdminAccountsByUserQuery(selectedUserId)
  const strategiesQuery = useAdminStrategiesByAccountQuery(selectedAccountId)
  const statusMutation = useUpdateAdminStrategyStatusMutation()

  const trades = tradesQuery.data ?? EMPTY_TRADES
  const accounts = accountsQuery.data ?? []
  const strategies = strategiesQuery.data ?? []

  // 계좌/전략 조회 실패는 toast가 아니라 이 인라인 배너(AdminTradesFeedback)로 표시한다 — 운영 개입 화면이라 고정 배너가 낫다
  const actionError =
    (selectedUserId && accountsQuery.isError ? '계좌 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.' : null)
    ?? (strategiesQuery.isError ? '전략 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.' : null)

  // 기간 필터에 걸린 거래만으로 후보를 만들면 그 기간에 거래가 없는 사용자는 선택지에서 고를 수 없다 — 전체 계좌 소유자와 합친다
  const userOptions = uniqBy(
    [
      // 계좌를 찾지 못한 거래(userId null)는 고를 계좌가 없어 후보에서 뺀다
      ...trades.flatMap((trade) => (trade.userId ? [{ id: trade.userId, label: trade.ownerNickname }] : [])),
      ...(allAccountsQuery.data ?? []).map((account) => ({ id: account.userId, label: account.ownerNickname })),
    ],
    (user) => user.id,
  )
  const brokerOptions = uniqBy(
    accounts.map((account) => account.broker),
    (broker) => broker,
  )
  const filteredAccounts = selectedBroker
    ? accounts.filter((account) => account.broker === selectedBroker)
    : []
  const selectedAccount = filteredAccounts.find((account) => account.id === selectedAccountId) ?? null
  const selectedStrategy = strategies.find((strategy) => strategy.id === selectedStrategyId) ?? null
  const filteredTrades = trades.filter((trade) => {
    if (selectedUserId && trade.userId !== selectedUserId) return false
    if (selectedAccount && trade.accountId !== selectedAccount.id) return false
    if (selectedStrategy && trade.strategyId !== selectedStrategy.id) return false
    return true
  })
  // 페이지네이션은 클라이언트 상태(URL에 반영하지 않음) — 선택한 사용자·전략 필터가 클라이언트 상태라 필터 후 목록을 자르기 때문이다
  const { page: currentPage, setPage, size, totalPages, paged: pagedTrades, handlePageSizeChange } = useClientPagination(filteredTrades, { initialPage, initialSize })

  function handleUserChange(userId: string) {
    setPage(1)
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
    setPage(1)
    setSelectedBroker(broker)
    setSelectedAccountId('')
    setSelectedStrategyId('')
  }

  function handleAccountChange(accountId: string) {
    setPage(1)
    setSelectedAccountId(accountId)
    setSelectedStrategyId('')
  }

  function handleStrategyChange(strategyId: string) {
    setPage(1)
    setSelectedStrategyId(strategyId)
  }

  function handleStrategyStatusToggle() {
    if (!selectedAccountId || !selectedStrategy) return
    const nextStatus = selectedStrategy.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    // 실패 토스트는 mutation 훅의 onError가 띄운다 — 여기서 배너를 또 띄우면 중복이다
    statusMutation.mutate({ accountId: selectedAccountId, strategyId: selectedStrategy.id, status: nextStatus })
  }

  return (
    <div className="space-y-4">
      <AdminTradeFilterPanel
        users={userOptions}
        brokers={brokerOptions}
        accounts={filteredAccounts}
        strategies={strategies}
        selectedStrategy={selectedStrategy}
        selectedUserId={selectedUserId}
        selectedBroker={selectedBroker}
        selectedAccountId={selectedAccountId}
        selectedStrategyId={selectedStrategyId}
        strategyStatusPending={statusMutation.isPending}
        onUserChange={handleUserChange}
        onBrokerChange={handleBrokerChange}
        onAccountChange={handleAccountChange}
        onStrategyChange={handleStrategyChange}
        onStrategyStatusToggle={handleStrategyStatusToggle}
      />

      <AdminTradesFeedback actionError={actionError} />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-base font-semibold">
          거래 내역
          <span className="ml-2 text-sm font-normal text-muted-foreground">{filteredTrades.length}건</span>
        </h2>
        <PageSizeSelector value={String(size)} onChange={handlePageSizeChange} />
      </div>

      {tradesQuery.isError && !tradesQuery.data ? (
        <SectionError message="거래 내역을 불러오지 못했습니다." />
      ) : tradesQuery.isPending ? (
        <LoadingRow />
      ) : (
        <AdminTradesTable trades={pagedTrades} />
      )}

      <PaginationBar page={currentPage} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}
