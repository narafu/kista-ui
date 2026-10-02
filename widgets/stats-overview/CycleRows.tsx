import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@shared/ui/EmptyState'
import { SectionError } from '@shared/ui/SectionError'
import { LoadingRow } from '@shared/ui/LoadingRow'
import { Badge } from '@shared/ui/Badge'
import { TableHeadCell } from '@shared/ui/TableHeadCell'
import { TableDataCell } from '@shared/ui/TableDataCell'
import { cn } from '@shared/lib/utils'
import { fmtDate, fmtSignedUsd, pnlTextClass, fmtSignedPercent } from '@shared/lib/format'
import type { useStatsCyclesQuery } from '@entities/stats'
import type { Account } from '@entities/account'

type CyclePerformance = ReturnType<typeof useStatsCyclesQuery>['cycles'][number]

interface Props {
  cycles: CyclePerformance[]
  accountsById: Map<string, Account>
}

function pnlClass(value: number | null | undefined) {
  return cn('tabular-nums', value != null ? pnlTextClass(value) : 'text-muted-foreground')
}

function pnlText(pnl: CyclePerformance['pnl']) {
  return pnl != null ? fmtSignedUsd(pnl, 2, '$') : '—'
}

function Period({ cycle }: { cycle: CyclePerformance }) {
  return <>{fmtDate(cycle.startDate)} ~ {cycle.endDate ? fmtDate(cycle.endDate) : '진행 중'}</>
}

function CycleTable({ cycles, accountsById }: Props) {
  return (
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
                <Period cycle={cycle} />
              </TableDataCell>
              <TableDataCell className={pnlClass(cycle.pnl)}>
                {pnlText(cycle.pnl)}
              </TableDataCell>
              <TableDataCell className={pnlClass(cycle.returnRate)}>
                {fmtSignedPercent(cycle.returnRate)}
              </TableDataCell>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CycleCardList({ cycles, accountsById }: Props) {
  return (
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
              <Period cycle={cycle} />
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-4 border-t pt-3 text-sm">
            <span className="pl-2 font-semibold tabular-nums">
              {cycle.ticker ?? '—'}
            </span>
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">
                손익{' '}
                <span className={pnlClass(cycle.pnl)}>
                  {pnlText(cycle.pnl)}
                </span>
              </span>
              <span className="text-muted-foreground">
                수익률{' '}
                <span className={pnlClass(cycle.returnRate)}>
                  {fmtSignedPercent(cycle.returnRate)}
                </span>
              </span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

interface FilterSelectProps {
  items: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  triggerClassName: string
}

export function FilterSelect({ items, value, onChange, ariaLabel, triggerClassName }: FilterSelectProps) {
  return (
    <Select items={items} value={value} onValueChange={(next) => { if (next) onChange(next) }}>
      <SelectTrigger aria-label={ariaLabel} className={triggerClassName}><SelectValue /></SelectTrigger>
      <SelectContent>
        {items.map(({ value: itemValue, label }) => <SelectItem key={itemValue} value={itemValue}>{label}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

interface BodyProps extends Props {
  isLoading: boolean
  isError: boolean
  filtered: boolean
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => unknown
}

export function CycleListBody({ isLoading, isError, filtered, hasNextPage, isFetchingNextPage, fetchNextPage, ...listProps }: BodyProps) {
  if (isLoading) return <LoadingRow />
  if (isError) return <SectionError message="사이클 성과를 불러오지 못했습니다" />
  if (listProps.cycles.length === 0) {
    return <EmptyState variant="text" message={filtered ? '조건에 맞는 사이클이 없습니다.' : '사이클 내역이 없습니다.'} />
  }
  return (
    <div>
      <CycleTable {...listProps} />
      <CycleCardList {...listProps} />
      {(hasNextPage || isFetchingNextPage) && (
        <div className="flex justify-center py-4 border-t">
          <button type="button" onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="px-4 py-2 text-sm font-medium text-rose-600 hover:text-rose-700 disabled:opacity-50">
            {isFetchingNextPage ? '불러오는 중…' : '더 보기'}
          </button>
        </div>
      )}
    </div>
  )
}
