import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@shared/ui/EmptyState'
import { SectionError } from '@shared/ui/SectionError'
import { LoadingRow } from '@shared/ui/LoadingRow'
import { Badge } from '@shared/ui/Badge'
import { TableHeadCell } from '@shared/ui/TableHeadCell'
import { TableDataCell } from '@shared/ui/TableDataCell'
import { cn } from '@shared/lib/utils'
import { fmtDate, fmtSignedMoney, pnlTextClass, fmtSignedPercent } from '@shared/lib/format'
import type { CyclePerformance } from '@entities/stats'
import { brokerCurrency } from '@shared/lib/api-schema'
import { useMeta } from '@entities/meta'
import type { Account } from '@entities/account'

interface Props {
  cycles: CyclePerformance[]
  accountsById: Map<string, Account>
}

function pnlClass(value: number | null | undefined) {
  return cn('tabular-nums', value != null ? pnlTextClass(value) : 'text-muted-foreground')
}

// 행 통화는 계좌 broker로 정한다(업비트 KRW, 바이낸스 USDT, 주식 USD)
function pnlText(pnl: CyclePerformance['pnl'], broker: string | undefined) {
  if (pnl == null) return '—'
  return fmtSignedMoney(pnl, brokerCurrency(broker))
}

// 날짜 안에서는 줄을 바꾸지 않는다 — PC 반쪽 폭에서도 "~" 앞뒤로만 나뉜다
function Period({ cycle }: { cycle: CyclePerformance }) {
  return (
    <>
      <span className="whitespace-nowrap">{fmtDate(cycle.startDate)} ~</span>{' '}
      <span className="whitespace-nowrap">{cycle.endDate ? fmtDate(cycle.endDate) : '진행 중'}</span>
    </>
  )
}

function CycleTable({ cycles, accountsById }: Props) {
  const { labelOf } = useMeta()
  return (
    <div className="hidden overflow-x-auto lg:block" role="region" aria-label="사이클 성과 표" tabIndex={0}>
      <table className="w-full text-sm" aria-label="사이클 성과">
        <thead className="bg-muted/50">
          <tr>
            <TableHeadCell>계좌</TableHeadCell>
            <TableHeadCell>전략</TableHeadCell>
            <TableHeadCell>종목</TableHeadCell>
            <TableHeadCell>기간</TableHeadCell>
            <TableHeadCell numeric>손익</TableHeadCell>
            <TableHeadCell numeric>수익률</TableHeadCell>
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
                  {labelOf('strategyTypes', cycle.strategyType)}
                </Badge>
              </TableDataCell>
              <TableDataCell className="font-medium tabular-nums">{cycle.ticker ?? '—'}</TableDataCell>
              <TableDataCell className="text-muted-foreground">
                <Period cycle={cycle} />
              </TableDataCell>
              <TableDataCell className={cn('text-right tabular-nums whitespace-nowrap', pnlClass(cycle.pnl))}>
                {pnlText(cycle.pnl, accountsById.get(cycle.accountId)?.broker)}
              </TableDataCell>
              <TableDataCell className={cn('text-right tabular-nums whitespace-nowrap', pnlClass(cycle.returnRate))}>
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
  const { labelOf } = useMeta()
  return (
    <ul className="divide-y lg:hidden list-none p-0 m-0" aria-label="사이클 성과">
      {cycles.map((cycle) => (
        <li key={cycle.cycleId} className="px-4 py-4">
          {/* 종목을 제목으로 두고 계좌명은 아래 보조 텍스트로 — 둘 다 굵은 글씨면 어느 쪽이 종목인지 구분되지 않는다 */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold tabular-nums">{cycle.ticker ?? '—'}</span>
                <Badge tone="brand" size="sm">
                  {labelOf('strategyTypes', cycle.strategyType)}
                </Badge>
              </div>
              {accountsById.get(cycle.accountId) && (
                <div className="mt-1 truncate text-xs text-muted-foreground">
                  {accountsById.get(cycle.accountId)?.nickname}
                </div>
              )}
            </div>
            <span className="shrink-0 text-right text-xs text-muted-foreground">
              <Period cycle={cycle} />
            </span>
          </div>
          <div className="mt-3 flex items-center justify-end gap-4 border-t pt-3 text-sm">
            <span className="text-muted-foreground">
              손익{' '}
              <span className={pnlClass(cycle.pnl)}>
                {pnlText(cycle.pnl, accountsById.get(cycle.accountId)?.broker)}
              </span>
            </span>
            <span className="text-muted-foreground">
              수익률{' '}
              <span className={pnlClass(cycle.returnRate)}>
                {fmtSignedPercent(cycle.returnRate)}
              </span>
            </span>
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
}

export function CycleListBody({ isLoading, isError, filtered, ...listProps }: BodyProps) {
  if (isLoading) return <LoadingRow />
  // 카드 본문이 p-0(테이블 풀폭)이라 카드형 에러 폴백은 직접 여백을 준다
  if (isError) return <div className="px-4 pb-4"><SectionError message="사이클 성과를 불러오지 못했습니다." /></div>
  if (listProps.cycles.length === 0) {
    return <EmptyState variant="text" message={filtered ? '조건에 맞는 사이클이 없습니다.' : '사이클 내역이 없습니다.'} />
  }
  return (
    <div>
      <CycleTable {...listProps} />
      <CycleCardList {...listProps} />
    </div>
  )
}
