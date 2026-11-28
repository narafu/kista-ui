'use client'

import type { ReactNode } from 'react'
import { useTableSort, type SortDirection } from '@shared/lib/hooks/use-table-sort'
import { cn, groupConsecutiveBy } from '@shared/lib/utils'
import { Badge } from '@shared/ui/Badge'
import { DATE_GROUP_LABEL_CLASS } from '@shared/ui/dateGroup'
import { asyncFallback } from '@shared/ui/AsyncSection'
import { SortableHeadCell } from '@shared/ui/SortableHeadCell'
import { LoadMoreButton, type LoadMore } from './LoadMoreButton'
import { TableDataCell } from '@shared/ui/TableDataCell'
import { evenColumnsClass, TableHeadCell } from '@shared/ui/TableHeadCell'

export interface DataListColumn<T> {
  key: string
  /** PC 열 머리글이자 모바일 라벨·정렬 옵션 이름 */
  header: string
  cell: (row: T) => ReactNode
  /** 숫자 열: `tabular-nums`, PC에서는 줄바꿈 없음 */
  numeric?: boolean
  /** PC 셀과 모바일 값에 함께 붙는 클래스 */
  className?: string | ((row: T) => string | false | undefined)
  /** 모바일 카드 안 위치. `titleBadge`는 제목 자리에 브랜드 배지로 그린다. 생략하면 라벨-값 항목 */
  mobile?: 'title' | 'titleBadge' | 'badge' | 'hidden'
  /** 전량형 목록의 정렬 값. null·undefined 행은 방향과 무관하게 맨 아래 */
  sortBy?: (row: T) => string | number | null | undefined
}

export interface DataListSort {
  activeKey: string
  direction: SortDirection
  onSort: (key: string) => void
}

interface Props<T> {
  /** 표 region과 모바일 목록의 접근성 이름 */
  label: string
  rows: T[]
  columns: DataListColumn<T>[]
  rowKey: (row: T, indexInGroup: number) => string
  isLoading?: boolean
  /** 데이터가 없는 실패만 넘긴다(`isError && !data`는 호출부나 훅이 계산) */
  isError?: boolean
  /** 이 목록의 조회 오류. 502·503이면 서버 재시작 안내(엔진 재시작이면 서버 detail)를 보인다 */
  error?: unknown
  /** 생략하면 `SectionError` 기본 문구 */
  errorMessage?: string
  empty: string
  /** `useDataListSort().control`. 날짜 그룹 목록에는 쓰지 않는다 */
  sort?: DataListSort
  /** 연속된 같은 key를 묶는다. PC는 rowSpan 행 헤더, 모바일은 그룹 라벨 */
  groupBy?: { header: string; key: (row: T) => string }
  loadMore?: LoadMore
  tableClassName?: string
}

const UNSORTED = ''

/** 정렬 상태를 DataList 밖으로 꺼낸다 — `control`을 `DataList`의 `sort`와 `MobileSortControl`에 함께 넘긴다. */
export function useDataListSort<T>(rows: T[], columns: DataListColumn<T>[]) {
  const { sortKey, sortDirection, handleSort } = useTableSort<string>(UNSORTED)
  const sortBy = columns.find((c) => c.key === sortKey)?.sortBy
  const sign = sortDirection === 'asc' ? 1 : -1
  const sorted = !sortBy ? rows : [...rows].sort((a, b) => {
    const av = sortBy(a), bv = sortBy(b)
    if (av == null) return bv == null ? 0 : 1
    if (bv == null) return -1
    return sign * (typeof av === 'string' || typeof bv === 'string'
      ? String(av).localeCompare(String(bv), 'ko')
      : av - bv)
  })
  return {
    rows: sorted,
    control: {
      activeKey: sortKey,
      direction: sortDirection,
      onSort: handleSort,
      options: columns.filter((c) => c.sortBy).map((c) => ({ key: c.key, label: c.header })),
    },
  }
}

function columnClass<T>(column: DataListColumn<T>, row: T) {
  return typeof column.className === 'function' ? column.className(row) : column.className
}

function MobileCard<T>({ row, columns, grouped }: { row: T; columns: DataListColumn<T>[]; grouped: boolean }) {
  const visible = columns.filter((c) => c.mobile !== 'hidden')
  const titles = visible.filter((c) => c.mobile === 'title' || c.mobile === 'titleBadge')
  const badges = visible.filter((c) => c.mobile === 'badge')
  const fields = visible.filter((c) => !c.mobile)
  return (
    <li className={grouped ? 'space-y-1.5 rounded-lg border border-border bg-card px-3 py-2.5' : 'space-y-3 p-4'}>
      {titles.length + badges.length > 0 && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {titles.map((c) => c.mobile === 'titleBadge'
              ? <Badge key={c.key} tone="brand" size="sm" className="px-2.5 font-bold">{c.cell(row)}</Badge>
              : <div key={c.key} className={cn(columnClass(c, row), 'text-sm font-semibold')}>{c.cell(row)}</div>)}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {badges.map((c) => <div key={c.key} className={cn(columnClass(c, row), 'text-sm font-semibold')}>{c.cell(row)}</div>)}
          </div>
        </div>
      )}
      {fields.length > 0 && (
        // 날짜 그룹 카드는 건수가 많아 라벨과 값을 한 줄에 둔다
        <dl className={grouped ? 'flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm' : 'grid grid-cols-2 gap-x-4 gap-y-3 text-sm'}>
          {fields.map((c) => (
            <div key={c.key} className={grouped ? 'flex min-w-0 items-baseline gap-1' : 'min-w-0'}>
              {/* 공백: 라벨과 값의 텍스트가 붙지 않게 한다(스크린리더·textContent) */}
              <dt className={grouped ? 'text-muted-foreground' : 'text-xs text-muted-foreground'}>{c.header}</dt>{' '}
              <dd className={cn(grouped ? 'text-foreground' : 'mt-0.5', c.numeric && 'tabular-nums', columnClass(c, row), grouped && 'font-semibold')}>{c.cell(row)}</dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  )
}

/** 컬럼 정의 하나로 lg 이상 표와 lg 미만 카드, 로딩·실패·빈 상태, 더 보기를 그린다. */
export function DataList<T>({ label, rows, columns, rowKey, isLoading, isError, error, errorMessage, empty, sort, groupBy, loadMore, tableClassName }: Props<T>) {
  const fallback = asyncFallback({ isLoading, isError, error, errorMessage, isEmpty: rows.length === 0, empty })
  if (fallback) return fallback

  const groups = groupBy ? groupConsecutiveBy(rows, groupBy.key) : [{ key: '', items: rows }]
  const grouped = !!groupBy
  const columnCount = columns.length + (grouped ? 1 : 0)

  return (
    <>
      {grouped ? (
        <div className="space-y-2 p-4 lg:hidden">
          {groups.map((g, i) => (
            <div key={`${g.key}-${i}`} className="space-y-1.5">
              <div className={DATE_GROUP_LABEL_CLASS}>{g.key}</div>
              <ul aria-label={g.key} className="m-0 list-none space-y-1.5 p-0">
                {g.items.map((row, j) => <MobileCard key={rowKey(row, j)} row={row} columns={columns} grouped />)}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <ul aria-label={label} className="m-0 list-none divide-y p-0 lg:hidden">
          {rows.map((row, j) => <MobileCard key={rowKey(row, j)} row={row} columns={columns} grouped={false} />)}
        </ul>
      )}
      <div className="hidden overflow-x-auto lg:block" role="region" aria-label={`${label} 표`} tabIndex={0}>
        <table className={cn('w-full text-sm', tableClassName, evenColumnsClass(columnCount))}>
          <thead className="bg-muted/50">
            <tr>
              {groupBy && <TableHeadCell>{groupBy.header}</TableHeadCell>}
              {columns.map((c) => sort && c.sortBy ? (
                <SortableHeadCell key={c.key} sortKey={c.key} numeric={c.numeric} activeKey={sort.activeKey} direction={sort.direction} onSort={sort.onSort}>
                  {c.header}
                </SortableHeadCell>
              ) : (
                <TableHeadCell key={c.key} numeric={c.numeric}>{c.header}</TableHeadCell>
              ))}
            </tr>
          </thead>
          {groups.map((g, i) => (
            <tbody key={`${g.key}-${i}`}>
              {g.items.map((row, j) => (
                <tr key={rowKey(row, j)} className="border-t transition-colors hover:bg-muted/30">
                  {grouped && j === 0 && (
                    <th scope="rowgroup" rowSpan={g.items.length} className="px-4 py-3 text-center align-middle font-normal whitespace-nowrap tabular-nums text-muted-foreground">{g.key}</th>
                  )}
                  {columns.map((c) => (
                    <TableDataCell key={c.key} className={cn(c.numeric && 'tabular-nums whitespace-nowrap', columnClass(c, row))}>{c.cell(row)}</TableDataCell>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
      {loadMore && <LoadMoreButton {...loadMore} />}
    </>
  )
}
