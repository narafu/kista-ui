'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@shared/ui/Badge'
import { EmptyState } from '@shared/ui/EmptyState'
import { TableHeadCell } from '@shared/ui/TableHeadCell'
import { TableDataCell } from '@shared/ui/TableDataCell'
import { cn } from '@shared/lib/utils'
import { fmtDate, fmtSignedUsd, pnlTextClass, fmtSignedPercent } from '@shared/lib/format'
import { useStatsCyclesQuery } from '@entities/stats'
import { useAccountsQuery } from '@entities/account'
import { useAllStrategiesQuery } from '@entities/strategy'
import { SectionError } from '@shared/ui/SectionError'
import { LoadingRow } from '@shared/ui/LoadingRow'
import { useMemo, useState } from 'react'

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
          <Select items={accountOptions} value={accountId} onValueChange={(value) => { if (value) setAccountId(value) }}>
            <SelectTrigger aria-label="계좌" className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {accountOptions.map(({ value, label }) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select items={tickerOptions} value={ticker} onValueChange={(value) => { if (value) setTicker(value) }}>
            <SelectTrigger aria-label="종목" className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {tickerOptions.map(({ value, label }) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <LoadingRow />
        ) : isError ? (
          <SectionError message="사이클 성과를 불러오지 못했습니다" />
        ) : cycles.length === 0 ? (
          <EmptyState variant="text" message={filtered ? '조건에 맞는 사이클이 없습니다.' : '사이클 내역이 없습니다.'} />
        ) : (
          <div>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[800px] text-sm" aria-label="사이클 성과">
                <thead className="bg-muted/50">
                  <tr>
                    <TableHeadCell>계좌</TableHeadCell>
                    <TableHeadCell>전략</TableHeadCell>
                    <TableHeadCell>종목</TableHeadCell>
                    <TableHeadCell>기간</TableHeadCell>
                    <TableHeadCell>손익</TableHeadCell>
                    <TableHeadCell>수익률</TableHeadCell>
                  </tr>
                </thead>
                <tbody>
                  {cycles.map((cycle) => (
                    <tr key={cycle.cycleId} className="border-t transition-colors hover:bg-muted/30">
                      <TableDataCell>
                        {accountsById.get(cycle.accountId) ? (
                          <Badge tone="neutral" size="sm">
                            {accountsById.get(cycle.accountId)?.nickname}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableDataCell>
                      <TableDataCell>
                        <Badge tone="brand" size="sm">
                          {cycle.strategyType}
                        </Badge>
                      </TableDataCell>
                      <TableDataCell className="font-medium tabular-nums">{cycle.ticker ?? '—'}</TableDataCell>
                      <TableDataCell className="text-muted-foreground">
                        {fmtDate(cycle.startDate)} ~ {cycle.endDate ? fmtDate(cycle.endDate) : '진행 중'}
                      </TableDataCell>
                      <TableDataCell className={cn('tabular-nums', cycle.pnl != null ? pnlTextClass(cycle.pnl) : 'text-muted-foreground')}>
                        {cycle.pnl != null ? fmtSignedUsd(cycle.pnl, 2, '$') : '—'}
                      </TableDataCell>
                      <TableDataCell className={cn('tabular-nums', cycle.returnRate != null ? pnlTextClass(cycle.returnRate) : 'text-muted-foreground')}>
                        {fmtSignedPercent(cycle.returnRate)}
                      </TableDataCell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y sm:hidden list-none p-0 m-0" aria-label="사이클 성과 모바일">
              {cycles.map((cycle) => (
                <li key={cycle.cycleId} className="px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {accountsById.get(cycle.accountId) && (
                        <Badge tone="neutral" size="sm">
                          {accountsById.get(cycle.accountId)?.nickname}
                        </Badge>
                      )}
                      <Badge tone="brand" size="sm">
                        {cycle.strategyType}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {fmtDate(cycle.startDate)} ~ {cycle.endDate ? fmtDate(cycle.endDate) : '진행 중'}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-4 border-t pt-3 text-sm">
                    <span className="pl-2 font-semibold tabular-nums">
                      {cycle.ticker ?? '—'}
                    </span>
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">
                        손익{' '}
                        <span className={cn('tabular-nums', cycle.pnl != null ? pnlTextClass(cycle.pnl) : 'text-muted-foreground')}>
                          {cycle.pnl != null ? fmtSignedUsd(cycle.pnl, 2, '$') : '—'}
                        </span>
                      </span>
                      <span className="text-muted-foreground">
                        수익률{' '}
                        <span className={cn('tabular-nums', cycle.returnRate != null ? pnlTextClass(cycle.returnRate) : 'text-muted-foreground')}>
                          {fmtSignedPercent(cycle.returnRate)}
                        </span>
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {(hasNextPage || isFetchingNextPage) && (
              <div className="flex justify-center py-4 border-t">
                <button type="button" onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="px-4 py-2 text-sm font-medium text-rose-600 hover:text-rose-700 disabled:opacity-50">
                  {isFetchingNextPage ? '불러오는 중…' : '더 보기'}
                </button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
