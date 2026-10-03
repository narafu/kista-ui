'use client'

import type { RefObject } from 'react'
import { Badge } from '@shared/ui/Badge'
import { ShareableRowActions } from '@shared/ui/ShareableRowActions'
import { TableHeadCell } from '@shared/ui/TableHeadCell'
import { TableDataCell } from '@shared/ui/TableDataCell'
import { SortableHeadCell } from '@shared/ui/SortableHeadCell'
import { cn } from '@shared/lib/utils'
import { fmtDate, fmtKrw } from '@shared/lib/format'
import { useMeta } from '@entities/meta'
import {
  SYSTEM_INVESTMENT_CATEGORY_ID,
  SYSTEM_LOAN_CATEGORY_ID,
  SYSTEM_REAL_ESTATE_CATEGORY_ID,
  SYSTEM_SAVINGS_CATEGORY_ID,
  isLiability,
} from '@entities/finance'
import type { AssetSnapshot } from '@entities/finance'

export type SortKey = 'entryDate' | 'category' | 'amount'

const CATEGORY_TONE: Record<string, 'brand' | 'error' | 'neutral'> = {
  [SYSTEM_INVESTMENT_CATEGORY_ID]: 'brand',
  [SYSTEM_SAVINGS_CATEGORY_ID]: 'neutral',
  [SYSTEM_LOAN_CATEGORY_ID]: 'error',
  [SYSTEM_REAL_ESTATE_CATEGORY_ID]: 'neutral',
}

// 체크박스 aria-label 전용 — 컬럼 분리 이후 화면에는 이 조합 문자열이 그대로 보이지 않지만,
// 카테고리명을 먼저 말해 화면(왼쪽 카테고리·오른쪽 계좌 등) 순서와 맞춘다.
function accountLabel(snapshot: AssetSnapshot): string {
  return snapshot.accountName ? `${snapshot.categoryName} · ${snapshot.accountName}` : snapshot.categoryName
}

/** 행 단위 렌더에 필요한 공통 상태·핸들러. */
export interface AssetRowContext {
  selectedIds: Set<string>
  monthClosed: boolean
  closedMonthTitle: string
  canShare: boolean
  sharePending: boolean
  unsharePending: boolean
  labelOf: ReturnType<typeof useMeta>['labelOf']
  onToggleRow: (id: string) => void
  onShare: (id: string) => void
  onUnshare: (id: string) => void
  onDelete: (id: string) => void
}

function RowActions({ snapshot, row }: { snapshot: AssetSnapshot; row: AssetRowContext }) {
  return (
    <ShareableRowActions
      duplicateHref={`/finance/new?duplicateFrom=${snapshot.id}`}
      editHref={`/finance/${snapshot.id}/edit`}
      onShare={() => row.onShare(snapshot.id)}
      onUnshare={() => row.onUnshare(snapshot.id)}
      onDelete={() => row.onDelete(snapshot.id)}
      canShare={row.canShare}
      hasGroupId={!!snapshot.groupId}
      sharePending={row.sharePending}
      unsharePending={row.unsharePending}
      locked={row.monthClosed}
      lockShare={row.monthClosed}
      lockTitle={row.closedMonthTitle}
    />
  )
}

function RowCheckbox({ snapshot, row, className }: { snapshot: AssetSnapshot; row: AssetRowContext; className?: string }) {
  return (
    <label className="-m-1 inline-flex shrink-0 p-1">
      <input
        type="checkbox"
        aria-label={`${fmtDate(snapshot.entryDate)} ${accountLabel(snapshot)} 선택`}
        checked={row.selectedIds.has(snapshot.id)}
        onChange={() => row.onToggleRow(snapshot.id)}
        disabled={row.monthClosed}
        title={row.monthClosed ? row.closedMonthTitle : undefined}
        className={cn('size-4', className, row.monthClosed && 'opacity-40')}
      />
    </label>
  )
}

function DesktopRow({ snapshot, row }: { snapshot: AssetSnapshot; row: AssetRowContext }) {
  const { labelOf } = row
  return (
    <tr className="border-t hover:bg-muted/30 transition-colors">
      <TableDataCell>
        <RowCheckbox snapshot={snapshot} row={row} />
      </TableDataCell>
      <TableDataCell className="text-muted-foreground whitespace-nowrap">{fmtDate(snapshot.entryDate)}</TableDataCell>
      <TableDataCell>
        <Badge tone={CATEGORY_TONE[snapshot.rootCategoryId] ?? 'neutral'} size="sm">{snapshot.categoryName}</Badge>
      </TableDataCell>
      <TableDataCell>{labelOf('markets', snapshot.market)}</TableDataCell>
      <TableDataCell>{labelOf('assetClasses', snapshot.assetClass)}</TableDataCell>
      <TableDataCell className={cn(!snapshot.strategy && 'text-muted-foreground')}>{snapshot.strategy ?? '—'}</TableDataCell>
      <TableDataCell className={cn(!snapshot.accountName && 'text-muted-foreground')}>{snapshot.accountName ?? '—'}</TableDataCell>
      <TableDataCell className={cn(!snapshot.accountInstitution && 'text-muted-foreground')}>{snapshot.accountInstitution ?? '—'}</TableDataCell>
      <TableDataCell className={cn('text-right tabular-nums whitespace-nowrap', isLiability(snapshot) && 'text-destructive')}>
        {fmtKrw(snapshot.amount)}
      </TableDataCell>
      <TableDataCell title={snapshot.memo} className={cn('max-w-48 truncate', !snapshot.memo && 'text-muted-foreground')}>{snapshot.memo ?? '—'}</TableDataCell>
      <TableDataCell>
        <div className="flex items-center justify-center">
          <RowActions snapshot={snapshot} row={row} />
        </div>
      </TableDataCell>
    </tr>
  )
}

interface TableProps {
  paged: AssetSnapshot[]
  row: AssetRowContext
  sortKey: SortKey
  sortDirection: 'asc' | 'desc'
  onSort: (key: SortKey) => void
  headerCheckboxRef: RefObject<HTMLInputElement | null>
  allPagedSelected: boolean
  onToggleAll: () => void
}

export function AssetRecordTable({ paged, row, sortKey, sortDirection, onSort, headerCheckboxRef, allPagedSelected, onToggleAll }: TableProps) {
  return (
    <div className="hidden overflow-x-auto lg:block rounded-[var(--r-lg)] border border-border">
      <table className="w-full min-w-[1200px] text-sm" aria-label="자산 기록">
        <thead className="bg-muted/50">
          <tr>
            <TableHeadCell className="w-10">
              <label className="-m-1 inline-flex shrink-0 p-1">
                <input
                  ref={headerCheckboxRef}
                  type="checkbox"
                  aria-label="현재 페이지 전체 선택"
                  checked={allPagedSelected}
                  onChange={onToggleAll}
                  disabled={row.monthClosed}
                  title={row.monthClosed ? row.closedMonthTitle : undefined}
                  className={cn('size-4', row.monthClosed && 'opacity-40')}
                />
              </label>
            </TableHeadCell>
            <SortableHeadCell sortKey="entryDate" activeKey={sortKey} direction={sortDirection} onSort={onSort}>기준일</SortableHeadCell>
            <SortableHeadCell sortKey="category" activeKey={sortKey} direction={sortDirection} onSort={onSort}>카테고리</SortableHeadCell>
            <TableHeadCell>시장</TableHeadCell>
            <TableHeadCell>자산군</TableHeadCell>
            <TableHeadCell>운용전략</TableHeadCell>
            <TableHeadCell>계좌명</TableHeadCell>
            <TableHeadCell>기관</TableHeadCell>
            <SortableHeadCell sortKey="amount" activeKey={sortKey} direction={sortDirection} onSort={onSort} className="text-right">금액</SortableHeadCell>
            <TableHeadCell>메모</TableHeadCell>
            <TableHeadCell className="whitespace-nowrap">작업</TableHeadCell>
          </tr>
        </thead>
        <tbody>
          {paged.map((snapshot) => (
            <DesktopRow key={snapshot.id} snapshot={snapshot} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MobileItem({ snapshot, row }: { snapshot: AssetSnapshot; row: AssetRowContext }) {
  const { labelOf } = row
  return (
    <li className="px-4 py-4">
      <div className="flex items-start gap-3">
        <RowCheckbox snapshot={snapshot} row={row} className="mt-1" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <Badge tone={CATEGORY_TONE[snapshot.rootCategoryId] ?? 'neutral'} size="sm">{snapshot.categoryName}</Badge>
            <span className="text-xs text-muted-foreground">{fmtDate(snapshot.entryDate)}</span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <p className="min-w-0 truncate text-sm font-medium">
              {labelOf('assetClasses', snapshot.assetClass)}
              {snapshot.memo && <span className="ml-1.5 font-normal text-muted-foreground">{snapshot.memo}</span>}
            </p>
            <span className={cn('shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums', isLiability(snapshot) && 'text-destructive')}>
              {fmtKrw(snapshot.amount)}
            </span>
          </div>
          {/* 계좌명·기관은 길어 작업 버튼과 같은 줄에 두면 거의 항상 잘린다 — 버튼 없는 별도 줄로 분리한다. */}
          {(snapshot.accountName || snapshot.accountInstitution) && (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {[snapshot.accountName, snapshot.accountInstitution].filter(Boolean).join(' · ')}
            </p>
          )}
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {[labelOf('markets', snapshot.market), snapshot.strategy].filter(Boolean).join(' · ')}
            </p>
            <RowActions snapshot={snapshot} row={row} />
          </div>
        </div>
      </div>
    </li>
  )
}

export function AssetRecordMobileList({ paged, row }: { paged: AssetSnapshot[]; row: AssetRowContext }) {
  return (
    <ul className="m-0 list-none divide-y rounded-[var(--r-lg)] border border-border p-0 lg:hidden" aria-label="자산 기록 모바일">
      {paged.map((snapshot) => (
        <MobileItem key={snapshot.id} snapshot={snapshot} row={row} />
      ))}
    </ul>
  )
}
