'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useStatsCyclesQuery } from '@entities/stats'
import { useAccountsQuery } from '@entities/account'
import { useAllStrategiesQuery } from '@entities/strategy'
import { useMemo, useState } from 'react'
import { CycleListBody, FilterSelect } from './CycleRows'

const ALL = 'ALL'

interface Props {
  typeFilter?: string
}

export function CyclePerformanceList({ typeFilter }: Props) {
  const [selectedAccountId, setAccountId] = useState(ALL)
  const [selectedTicker, setTicker] = useState(ALL)
  const accountsQuery = useAccountsQuery()
  const strategiesQuery = useAllStrategiesQuery()
  const accountsById = useMemo(
    () => new Map(accountsQuery.data?.map((account) => [account.id, account]) ?? []),
    [accountsQuery.data],
  )
  const accountOptions = useMemo(
    () => [{ value: ALL, label: '전체 계좌' }, ...(accountsQuery.data ?? []).map((account) => ({ value: account.id, label: account.nickname }))],
    [accountsQuery.data],
  )
  // 삭제된 전략의 사이클은 서버 목록에서 제외되므로 현재 전략들의 티커만으로 선택지가 충분하다
  const tickerOptions = useMemo(
    () => [{ value: ALL, label: '전체 종목' }, ...[...new Set(strategiesQuery.data?.map((strategy) => strategy.ticker))].sort().map((value) => ({ value, label: value }))],
    [strategiesQuery.data],
  )
  // 선택했던 계좌·종목이 삭제돼 선택지에서 사라지면 전체로 되돌린다 — 선택지 데이터가 없는(로딩) 동안엔 판단을 보류한다
  const accountId = !accountsQuery.data || accountOptions.some((option) => option.value === selectedAccountId) ? selectedAccountId : ALL
  const ticker = !strategiesQuery.data || tickerOptions.some((option) => option.value === selectedTicker) ? selectedTicker : ALL
  const filtered = accountId !== ALL || ticker !== ALL
  const { cycles, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useStatsCyclesQuery({
    type: typeFilter,
    accountId: accountId === ALL ? undefined : accountId,
    ticker: ticker === ALL ? undefined : ticker,
  })

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-3">
        <CardTitle className="text-base lg:text-lg">사이클 성과</CardTitle>
        <div className="flex gap-2">
          <FilterSelect items={accountOptions} value={accountId} onChange={setAccountId} ariaLabel="계좌" triggerClassName="w-32" />
          <FilterSelect items={tickerOptions} value={ticker} onChange={setTicker} ariaLabel="종목" triggerClassName="w-28" />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <CycleListBody
          isLoading={isLoading}
          isError={isError}
          cycles={cycles}
          accountsById={accountsById}
          filtered={filtered}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
        />
      </CardContent>
    </Card>
  )
}
