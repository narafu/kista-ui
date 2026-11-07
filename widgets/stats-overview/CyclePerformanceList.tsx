'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMeta } from '@entities/meta'
import { useStatsCyclesQuery, type CycleStatusFilter } from '@entities/stats'
import { useAccountsQuery } from '@entities/account'
import { useAllStrategiesWithArchivedQuery } from '@entities/strategy'
import { useMemo, useState } from 'react'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { Badge } from '@shared/ui/Badge'
import { ArchivedStrategies } from './ArchivedStrategies'
import { CycleListBody, FilterSelect } from './CycleRows'

const ALL = 'ALL'

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: '진행 중' },
  { value: 'CLOSED', label: '종료' },
  { value: ALL, label: '전체 상태' },
]

interface Props {
  typeFilter?: string
}

export function CyclePerformanceList({ typeFilter }: Props) {
  const { labelOf } = useMeta()
  const [selectedAccountId, setAccountId] = useState(ALL)
  const [selectedTicker, setTicker] = useState(ALL)
  const [status, setStatus] = useState('ACTIVE')
  const [page, setPage] = useState(1)
  const [size, setSize] = useState('10')
  // 전략 타입 탭(typeFilter)이 바뀌어도 1페이지부터 다시 본다 — 부모 prop이라 렌더 중 이전 값과 비교해 리셋
  const [prevTypeFilter, setPrevTypeFilter] = useState(typeFilter)
  if (prevTypeFilter !== typeFilter) {
    setPrevTypeFilter(typeFilter)
    setPage(1)
  }
  const withPageReset = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    setPage(1)
  }
  const accountsQuery = useAccountsQuery()
  const strategiesQuery = useAllStrategiesWithArchivedQuery()
  const accountsById = useMemo(
    () => new Map(accountsQuery.data?.map((account) => [account.id, account]) ?? []),
    [accountsQuery.data],
  )
  const accountOptions = useMemo(
    () => [{ value: ALL, label: '전체 계좌' }, ...(accountsQuery.data ?? [])
      .map((account) => ({ value: account.id, label: account.nickname }))],
    [accountsQuery.data],
  )
  // 보관 전략의 성과도 통계에 남으므로 보관 포함 목록으로 종목 선택지를 만든다. 삭제된 전략의 사이클은 서버 통계에서 제외된다
  const tickerOptions = useMemo(
    () => [{ value: ALL, label: '전체 종목' }, ...[...new Set(strategiesQuery.data?.map((strategy) => strategy.ticker))].sort().map((value) => ({ value, label: value }))],
    [strategiesQuery.data],
  )
  // 선택했던 계좌·종목이 삭제돼 선택지에서 사라지면 전체로 되돌린다 — 선택지 데이터가 없는(로딩) 동안엔 판단을 보류한다
  const accountId = !accountsQuery.data || accountOptions.some((option) => option.value === selectedAccountId) ? selectedAccountId : ALL
  const ticker = !strategiesQuery.data || tickerOptions.some((option) => option.value === selectedTicker) ? selectedTicker : ALL
  const archivedStrategies = useMemo(
    () => (strategiesQuery.data ?? []).filter((strategy) => strategy.status === 'ARCHIVED' && (!typeFilter || strategy.type === typeFilter) && (accountId === ALL || strategy.accountId === accountId) && (ticker === ALL || strategy.ticker === ticker)),
    [strategiesQuery.data, typeFilter, accountId, ticker],
  )
  const filtered = accountId !== ALL || ticker !== ALL || status !== ALL
  const { data, isLoading, isError } = useStatsCyclesQuery({
    type: typeFilter,
    accountId: accountId === ALL ? undefined : accountId,
    ticker: ticker === ALL ? undefined : ticker,
    status: status === ALL ? undefined : (status as CycleStatusFilter),
    page: page - 1,
    size: Number(size),
  })

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-3">
          <div className="flex items-center gap-2">
            <CardTitle role="heading" aria-level={2} className="text-base lg:text-lg">사이클 성과</CardTitle>
            {/* 전략 타입 필터는 자산 추이 카드 헤더에 있지만 이 목록에도 걸린다 — 적용 중임을 여기서도 보여준다 */}
            {typeFilter && <Badge tone="brand" size="sm">{labelOf('strategyTypes', typeFilter)}</Badge>}
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterSelect items={STATUS_OPTIONS} value={status} onChange={withPageReset(setStatus)} ariaLabel="상태" triggerClassName="w-28" />
            <FilterSelect items={accountOptions} value={accountId} onChange={withPageReset(setAccountId)} ariaLabel="계좌" triggerClassName="w-32" />
            <FilterSelect items={tickerOptions} value={ticker} onChange={withPageReset(setTicker)} ariaLabel="종목" triggerClassName="w-28" />
            <PageSizeSelector value={size} onChange={withPageReset(setSize)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <CycleListBody
            isLoading={isLoading}
            isError={isError && !data}
            cycles={data?.items ?? []}
            accountsById={accountsById}
            filtered={filtered}
          />
          {(data?.totalPages ?? 0) > 1 && (
            <div className="px-4 pb-4">
              <PaginationBar page={page} totalPages={data?.totalPages ?? 0} onPageChange={setPage} />
            </div>
          )}
        </CardContent>
      </Card>
      <ArchivedStrategies strategies={archivedStrategies} accountsById={accountsById} />
    </div>
  )
}
