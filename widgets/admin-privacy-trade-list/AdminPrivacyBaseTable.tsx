'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ChevronRight, ChevronDown, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fmtUsd, fmtSignedUsd, pnlTextClass } from '@shared/lib/format'
import { apiMsg } from '@shared/lib/api-client'
import { cn } from '@shared/lib/utils'
import { DIRECTION_LABEL, directionTextClass } from '@entities/trade'
import { EmptyState } from '@shared/ui/EmptyState'
import { TableHeadCell } from '@shared/ui/TableHeadCell'
import { TableDataCell } from '@shared/ui/TableDataCell'
import { ConfirmDeleteDialog } from '@shared/ui/ConfirmDeleteDialog'
import { BRAND_TINT_BUTTON_CLASS } from '@shared/ui/brand-button-class'
import { deleteAdminPrivacyOrder } from '@entities/privacy'
import type { AdminPrivacyBase, AdminPrivacyOrder } from '@entities/privacy'
import { CreatePrivacyBaseDialog } from './CreatePrivacyBaseDialog'
import { EditPrivacyBaseDialog } from './EditPrivacyBaseDialog'
import { EditPrivacyOrderDialog } from './EditPrivacyOrderDialog'
import { AddPrivacyOrderDialog } from './AddPrivacyOrderDialog'

// kista-api PrivacyTradeBaseJpaRepository.findBasesFromReleaseDate가 releaseDate DESC로 정렬해 내려준다
// (trading-core 쪽 @Query "ORDER BY b.releaseDate DESC") — 이 순서를 그대로 가정해 삽입 위치를 계산한다.
export function shouldInsertLocally(
  created: Pick<AdminPrivacyBase, 'releaseDate'>,
  opts: { windowFrom?: string; windowTo?: string; isFirstPage: boolean; currentCount: number; pageSize: number },
): boolean {
  const inRange = (!opts.windowFrom || created.releaseDate >= opts.windowFrom) && (!opts.windowTo || created.releaseDate <= opts.windowTo)
  return opts.isFirstPage && inRange && opts.currentCount < opts.pageSize
}

export function insertByReleaseDateDesc<T extends Pick<AdminPrivacyBase, 'releaseDate'>>(bases: T[], created: T): T[] {
  const at = bases.findIndex((b) => b.releaseDate < created.releaseDate)
  const idx = at === -1 ? bases.length : at
  return [...bases.slice(0, idx), created, ...bases.slice(idx)]
}

interface Props {
  bases: AdminPrivacyBase[]
  // 서버가 집계한 필터 통과 전체 건수 — 헤더에 표시. 로컬 등록 반영 시 함께 증가시켜
  // 화면에 보이는 행 수와 어긋나지 않게 한다.
  totalCount: number
  // 신규 등록 항목이 현재 화면(기간 필터·1페이지)에 들어오는지 판정하는 데 쓰는 서버 조회 조건.
  windowFrom?: string
  windowTo?: string
  pageSize?: number
  isFirstPage?: boolean
}

export function AdminPrivacyBaseTable({ bases: initialBases, totalCount: initialTotalCount, windowFrom, windowTo, pageSize = Infinity, isFirstPage = true }: Props) {
  const [bases, setBases] = useState(initialBases)
  const [totalCount, setTotalCount] = useState(initialTotalCount)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [createOpen, setCreateOpen] = useState(false)
  const [editBase, setEditBase] = useState<AdminPrivacyBase | null>(null)
  const [editOrder, setEditOrder] = useState<{ baseId: string; order: AdminPrivacyOrder } | null>(null)
  const [addOrderBaseId, setAddOrderBaseId] = useState<string | null>(null)
  const [deleteOrderTarget, setDeleteOrderTarget] = useState<{ baseId: string; order: AdminPrivacyOrder } | null>(null)
  const [deletePending, setDeletePending] = useState(false)

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function updateBase(updated: AdminPrivacyBase) {
    setBases((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
  }

  // 신규 등록 항목이 현재 화면(1페이지 + 기간 필터 범위 + 페이지 정원 이내)에 들어오면 로컬에
  // 바로 얹는다. 그 밖이면(다른 페이지·필터 범위 밖·페이지 꽉 참) 서버 총 건수·페이지네이션과
  // 어긋날 수 있어 얹지 않고 안내만 한다 — router.refresh()는 이 프로젝트에서 routine mutation에
  // 금지돼 있어 안내 후 사용자가 직접 새로고침하도록 한다.
  function handleCreated(created: AdminPrivacyBase) {
    if (shouldInsertLocally(created, { windowFrom, windowTo, isFirstPage, currentCount: bases.length, pageSize })) {
      setBases((prev) => insertByReleaseDateDesc(prev, created))
      setTotalCount((prev) => prev + 1)
      toast.success('P 매매표가 등록되었습니다')
    } else {
      toast.success('P 매매표가 등록되었습니다. 목록에 보이지 않으면 새로고침하세요.')
    }
  }

  async function handleDeleteOrder() {
    if (!deleteOrderTarget) return
    setDeletePending(true)
    try {
      const updated = await deleteAdminPrivacyOrder(deleteOrderTarget.baseId, deleteOrderTarget.order.id)
      updateBase(updated)
      toast.success('주문이 삭제되었습니다')
      setDeleteOrderTarget(null)
    } catch (err) {
      toast.error(apiMsg(err, '삭제에 실패했습니다'))
    } finally {
      setDeletePending(false)
    }
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">총 {totalCount}건</span>
        <Button type="button" size="sm" className={cn('gap-1.5', BRAND_TINT_BUTTON_CLASS)} onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" />
          매매표 등록
        </Button>
      </div>

      {bases.length === 0 ? (
        <EmptyState message="P 매매표가 없습니다." />
      ) : (
        <>
          <div className="space-y-3 sm:hidden" data-testid="admin-privacy-mobile-list">
            {bases.map((b) => {
              const open = expanded.has(b.id)
              return (
                <MobileBaseCard
                  key={b.id}
                  base={b}
                  open={open}
                  onToggle={() => toggle(b.id)}
                  onEditBase={() => setEditBase(b)}
                  onEditOrder={(order) => setEditOrder({ baseId: b.id, order })}
                  onAddOrder={() => setAddOrderBaseId(b.id)}
                  onDeleteOrder={(order) => setDeleteOrderTarget({ baseId: b.id, order })}
                />
              )
            })}
          </div>

          <div className="hidden rounded-[var(--r-lg)] border border-border overflow-x-auto sm:block" data-testid="admin-privacy-desktop-table-wrap">
            <table className="w-full text-sm sm:min-w-[760px]" data-testid="admin-privacy-desktop-table">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <TableHeadCell className="w-8 px-2" aria-label="확장" />
                  <TableHeadCell className="px-2.5 sm:px-4 whitespace-nowrap">날짜</TableHeadCell>
                  <TableHeadCell className="px-2.5 sm:px-4 whitespace-nowrap">종목</TableHeadCell>
                  <TableHeadCell className="px-2.5 sm:px-4 whitespace-nowrap">
                    <span className="sm:hidden">시작금액</span>
                    <span className="hidden sm:inline">사이클 시작금액</span>
                  </TableHeadCell>
                  <TableHeadCell className="hidden sm:table-cell px-2.5 sm:px-4 whitespace-nowrap">평단가</TableHeadCell>
                  <TableHeadCell className="px-2.5 sm:px-4 whitespace-nowrap">보유</TableHeadCell>
                  <TableHeadCell className="hidden sm:table-cell px-2.5 sm:px-4 whitespace-nowrap">실현손익</TableHeadCell>
                  <TableHeadCell className="hidden sm:table-cell px-2.5 sm:px-4 whitespace-nowrap">주문</TableHeadCell>
                  <TableHeadCell className="w-16 px-2.5 sm:px-4 whitespace-nowrap" aria-label="수정" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bases.map((b) => {
                  const open = expanded.has(b.id)
                  return (
                    <FragmentRow
                      key={b.id}
                      base={b}
                      open={open}
                      onToggle={() => toggle(b.id)}
                      onEditBase={() => setEditBase(b)}
                      onEditOrder={(order) => setEditOrder({ baseId: b.id, order })}
                      onAddOrder={() => setAddOrderBaseId(b.id)}
                      onDeleteOrder={(order) => setDeleteOrderTarget({ baseId: b.id, order })}
                    />
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {createOpen && (
        <CreatePrivacyBaseDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={handleCreated} />
      )}

      {editBase && (
        <EditPrivacyBaseDialog
          base={editBase}
          open
          onOpenChange={(next) => { if (!next) setEditBase(null) }}
          onUpdated={updateBase}
        />
      )}

      {editOrder && (
        <EditPrivacyOrderDialog
          baseId={editOrder.baseId}
          order={editOrder.order}
          open
          onOpenChange={(next) => { if (!next) setEditOrder(null) }}
          onUpdated={updateBase}
        />
      )}

      {addOrderBaseId && (
        <AddPrivacyOrderDialog
          baseId={addOrderBaseId}
          open
          onOpenChange={(next) => { if (!next) setAddOrderBaseId(null) }}
          onAdded={updateBase}
        />
      )}

      <ConfirmDeleteDialog
        open={deleteOrderTarget != null}
        onOpenChange={(next) => { if (!next) setDeleteOrderTarget(null) }}
        title="주문 삭제"
        description={deleteOrderTarget ? `${DIRECTION_LABEL[deleteOrderTarget.order.direction] ?? deleteOrderTarget.order.direction} ${deleteOrderTarget.order.orderType} 주문을 삭제합니다.` : ''}
        onConfirm={handleDeleteOrder}
        isPending={deletePending}
      />
    </>
  )
}

function MobileBaseCard({
  base: b, open, onToggle, onEditBase, onEditOrder, onAddOrder, onDeleteOrder,
}: {
  base: AdminPrivacyBase
  open: boolean
  onToggle: () => void
  onEditBase: () => void
  onEditOrder: (order: AdminPrivacyOrder) => void
  onAddOrder: () => void
  onDeleteOrder: (order: AdminPrivacyOrder) => void
}) {
  return (
    <article className="rounded-[var(--r-lg)] border border-border bg-card/70 p-4 shadow-sm">
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- role=button + tabIndex 아래에서 명시, 내부에 실제 <button>(수정) 중첩 필요해 <button> 래퍼 대신 div 사용 */}
      <div
        role="button"
        tabIndex={0}
        className="w-full text-left cursor-pointer"
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } }}
        aria-expanded={open}
        aria-label={`${b.releaseDate} ${b.ticker} 매매표 ${open ? '접기' : '펼치기'}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{b.releaseDate}</p>
            <h3 className="mt-1 text-lg font-extrabold tracking-tight">{b.ticker}</h3>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{b.orders.length}건</span>
            <button
              type="button"
              className="text-xs font-medium text-foreground underline underline-offset-2"
              onClick={(e) => { e.stopPropagation(); onEditBase() }}
            >
              수정
            </button>
            {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-2">
          <Metric label="시작금액" value={`$${fmtUsd(b.currentCycleStart)}`} valueClassName="font-mono" />
          <Metric
            label="실현손익"
            value={fmtSignedUsd(b.currentCycleRealizedPnl)}
            valueClassName={`font-mono ${pnlTextClass(b.currentCycleRealizedPnl)}`}
          />
          <Metric label="평단가" value={b.avgPrice == null ? '-' : `$${fmtUsd(b.avgPrice)}`} valueClassName="font-mono" />
          <Metric label="보유" value={String(b.holdings)} />
        </dl>
      </div>

      {open && (
        <div className="mt-4 border-t border-border pt-3">
          <OrderDetailsSection orders={b.orders} onEditOrder={onEditOrder} onAddOrder={onAddOrder} onDeleteOrder={onDeleteOrder} />
        </div>
      )}
    </article>
  )
}

function Metric({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="rounded-[var(--r-sm)] bg-muted/30 px-3 py-2">
      <dt className="text-[11px] font-medium text-muted-foreground">{label}</dt>
      <dd className={`mt-1 text-sm font-bold ${valueClassName ?? ''}`}>{value}</dd>
    </div>
  )
}

const ORDER_DETAILS_HEAD_CLASS = 'px-0 py-1 text-xs lg:text-xs font-medium normal-case tracking-normal text-muted-foreground'
const ORDER_DETAILS_CELL_CLASS = 'px-0 py-1 text-xs'

function OrderDetailsSection({
  orders, onEditOrder, onAddOrder, onDeleteOrder,
}: {
  orders: AdminPrivacyBase['orders']
  onEditOrder: (order: AdminPrivacyOrder) => void
  onAddOrder: () => void
  onDeleteOrder: (order: AdminPrivacyOrder) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">주문 {orders.length}건</span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 gap-1 px-2 text-xs"
          onClick={(e) => { e.stopPropagation(); onAddOrder() }}
        >
          <Plus className="size-3" />주문 추가
        </Button>
      </div>
      {orders.length > 0 && <OrderDetailsTable orders={orders} onEditOrder={onEditOrder} onDeleteOrder={onDeleteOrder} />}
    </div>
  )
}

function OrderDetailsTable({
  orders, onEditOrder, onDeleteOrder,
}: {
  orders: AdminPrivacyBase['orders']
  onEditOrder: (order: AdminPrivacyOrder) => void
  onDeleteOrder: (order: AdminPrivacyOrder) => void
}) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr>
          <TableHeadCell className={cn(ORDER_DETAILS_HEAD_CLASS, 'text-left')}>방향</TableHeadCell>
          <TableHeadCell className={cn(ORDER_DETAILS_HEAD_CLASS, 'text-left')}>유형</TableHeadCell>
          <TableHeadCell className={cn(ORDER_DETAILS_HEAD_CLASS, 'text-right')}>가격</TableHeadCell>
          <TableHeadCell className={cn(ORDER_DETAILS_HEAD_CLASS, 'text-right')}>수량</TableHeadCell>
          <TableHeadCell className={cn(ORDER_DETAILS_HEAD_CLASS, 'text-right')} aria-label="수정·삭제" />
        </tr>
      </thead>
      <tbody>
        {orders.map((o) => (
          <tr key={o.id}>
            <TableDataCell className={cn(ORDER_DETAILS_CELL_CLASS, 'text-left font-semibold', directionTextClass(o.direction))}>
              {DIRECTION_LABEL[o.direction] ?? o.direction}
            </TableDataCell>
            <TableDataCell className={cn(ORDER_DETAILS_CELL_CLASS, 'text-left text-muted-foreground')}>{o.orderType}</TableDataCell>
            <TableDataCell className={cn(ORDER_DETAILS_CELL_CLASS, 'text-right font-mono')}>${fmtUsd(o.price)}</TableDataCell>
            <TableDataCell className={cn(ORDER_DETAILS_CELL_CLASS, 'text-right')}>{o.quantity ?? '-'}</TableDataCell>
            <TableDataCell className={cn(ORDER_DETAILS_CELL_CLASS, 'text-right')}>
              <span className="inline-flex items-center gap-2">
                <button
                  type="button"
                  className="text-foreground underline underline-offset-2"
                  onClick={(e) => { e.stopPropagation(); onEditOrder(o) }}
                >
                  수정
                </button>
                <button
                  type="button"
                  className="text-destructive underline underline-offset-2"
                  onClick={(e) => { e.stopPropagation(); onDeleteOrder(o) }}
                >
                  삭제
                </button>
              </span>
            </TableDataCell>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function FragmentRow({
  base: b, open, onToggle, onEditBase, onEditOrder, onAddOrder, onDeleteOrder,
}: {
  base: AdminPrivacyBase
  open: boolean
  onToggle: () => void
  onEditBase: () => void
  onEditOrder: (order: AdminPrivacyOrder) => void
  onAddOrder: () => void
  onDeleteOrder: (order: AdminPrivacyOrder) => void
}) {
  return (
    <>
      <tr
        className="hover:bg-muted/20 transition-colors cursor-pointer"
        onClick={onToggle}
        aria-label={`${b.releaseDate} ${b.ticker} 행 ${open ? '접기' : '펼치기'}`}
      >
        <TableDataCell className="px-2 py-3 text-muted-foreground">
          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </TableDataCell>
        <TableDataCell className="px-2.5 py-3 text-muted-foreground text-xs whitespace-nowrap sm:px-4">{b.releaseDate}</TableDataCell>
        <TableDataCell className="px-2.5 py-3 whitespace-nowrap sm:px-4">{b.ticker}</TableDataCell>
        <TableDataCell className="px-2.5 py-3 font-mono text-xs whitespace-nowrap sm:px-4">${fmtUsd(b.currentCycleStart)}</TableDataCell>
        <TableDataCell className="hidden px-2.5 py-3 font-mono text-xs whitespace-nowrap sm:table-cell sm:px-4">{b.avgPrice == null ? '-' : `$${fmtUsd(b.avgPrice)}`}</TableDataCell>
        <TableDataCell className="px-2.5 py-3 whitespace-nowrap sm:px-4">{b.holdings}</TableDataCell>
        <TableDataCell className={`hidden px-2.5 py-3 font-mono text-xs whitespace-nowrap sm:table-cell sm:px-4 ${pnlTextClass(b.currentCycleRealizedPnl)}`}>
          {fmtSignedUsd(b.currentCycleRealizedPnl)}
        </TableDataCell>
        <TableDataCell className="hidden px-2.5 py-3 text-muted-foreground whitespace-nowrap sm:table-cell sm:px-4">{b.orders.length}건</TableDataCell>
        <TableDataCell className="px-2.5 py-3 whitespace-nowrap sm:px-4">
          <button
            type="button"
            className="text-xs font-medium text-foreground underline underline-offset-2"
            onClick={(e) => { e.stopPropagation(); onEditBase() }}
          >
            수정
          </button>
        </TableDataCell>
      </tr>
      {open && (
        <tr className="bg-muted/10">
          <td></td>{/* eslint-disable-line react-doctor/control-has-associated-label */}
          <td colSpan={8} className="px-4 py-3">
            <OrderDetailsSection orders={b.orders} onEditOrder={onEditOrder} onAddOrder={onAddOrder} onDeleteOrder={onDeleteOrder} />
          </td>
        </tr>
      )}
    </>
  )
}
