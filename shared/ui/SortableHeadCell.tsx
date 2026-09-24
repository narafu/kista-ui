import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { TableHeadCell } from './TableHeadCell'
import type { SortDirection } from '@shared/lib/hooks/use-table-sort'

interface Props<K extends string> {
  sortKey: K
  activeKey: K
  direction: SortDirection
  onSort: (key: K) => void
  children: ReactNode
}

/** 정렬 가능한 테이블 헤더 셀 — aria-sort + 방향 아이콘 + 클릭 핸들러를 묶는다. `useTableSort`와 함께 쓴다. */
export function SortableHeadCell<K extends string>({ sortKey, activeKey, direction, onSort, children }: Props<K>) {
  const active = sortKey === activeKey
  return (
    <TableHeadCell aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => onSort(sortKey)}>
        {children}
        {active
          ? (direction === 'asc'
            ? <ArrowUp className="size-3.5 inline ml-1" />
            : <ArrowDown className="size-3.5 inline ml-1" />)
          : <ArrowUpDown className="size-3.5 inline ml-1 text-muted-foreground/50" />}
      </button>
    </TableHeadCell>
  )
}
