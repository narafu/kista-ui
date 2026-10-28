'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ChevronRight, ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IconButton } from '@shared/ui/IconButton'
import { fmtUsd, fmtSignedUsd, pnlTextClass } from '@shared/lib/format'
import { cn } from '@shared/lib/utils'
import { directionBadgeClass } from '@entities/trade'
import { useMeta } from '@entities/meta'
import { EmptyState } from '@shared/ui/EmptyState'
import { Badge } from '@shared/ui/Badge'
import { LoadingRow } from '@shared/ui/LoadingRow'
import { TableHeadCell } from '@shared/ui/TableHeadCell'
import { TableDataCell } from '@shared/ui/TableDataCell'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { ConfirmDeleteDialog } from '@shared/ui/ConfirmDeleteDialog'
import { filterAdminPrivacyBasesByRange, useAdminPrivacyBasesQuery, useDeleteAdminPrivacyOrderMutation } from '@entities/privacy'
import type { AdminPrivacyBase, AdminPrivacyOrder } from '@entities/privacy'
import { CreatePrivacyBaseDialog } from './CreatePrivacyBaseDialog'
import { EditPrivacyBaseDialog } from './EditPrivacyBaseDialog'
import { EditPrivacyOrderDialog } from './EditPrivacyOrderDialog'
import { AddPrivacyOrderDialog } from './AddPrivacyOrderDialog'
import { latestYearlyResetByTicker } from './model/privacyChartSeries'

// 조회 전·실패 시 useMemo 의존성 참조를 고정한다
const EMPTY_BASES: AdminPrivacyBase[] = []

// 필요한 카테고리만 좁힌 labelOf (MetaProvider.labelOf를 그대로 넘길 수 있다)
type OrderLabelOf = (category: 'orderDirections' | 'orderTypes', code: string) => string

function describeOrder(order: AdminPrivacyOrder, labelOf: OrderLabelOf): string {
  const qty = order.quantity == null ? '' : ` × ${order.quantity}주`
  return `${labelOf('orderDirections', order.direction)} ${labelOf('orderTypes', order.orderType)} $${fmtUsd(order.price)}${qty}`
}

interface Props {
  // 기간 필터·페이지 조회 조건. windowFrom/windowTo는 URL 쿼리 그대로, page도 원본(클램프 전) 값을
  // 그대로 받는다 — totalPages는 여기서 canonical 쿼리 캐시로부터 매번 다시 계산해 뮤테이션 직후에도
  // (SSR 스냅샷이 아니라) 최신 총 건수를 반영한다. PaginationBar도 이 컴포넌트가 직접 렌더한다.
  windowFrom?: string
  windowTo?: string
  // '올해' 기간 — 종목마다 마지막 연초 재설정일부터 보여준다(windowFrom/windowTo는 비어 온다)
  sinceYearlyReset?: boolean
  pageSize: number
  page: number
}

export function AdminPrivacyBaseTable({ windowFrom, windowTo, sinceYearlyReset = false, pageSize, page }: Props) {
  const { labelOf } = useMeta()
  const { data, isError, isFetching, refetch } = useAdminPrivacyBasesQuery()
  const allBases = data ?? EMPTY_BASES
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [createOpen, setCreateOpen] = useState(false)
  // 서버 객체를 복사해 두면 뮤테이션 후 낡은 값이 남으므로 id만 보관하고 렌더 때 캐시에서 찾는다.
  // 대상이 캐시에서 사라지면 find가 undefined를 돌려줘 다이얼로그가 닫힌다.
  const [editBaseId, setEditBaseId] = useState<string | null>(null)
  const [editOrderRef, setEditOrderRef] = useState<{ baseId: string; orderId: string } | null>(null)
  const [addOrderBaseId, setAddOrderBaseId] = useState<string | null>(null)
  const [deleteOrderRef, setDeleteOrderRef] = useState<{ baseId: string; orderId: string } | null>(null)
  const deleteOrderMutation = useDeleteAdminPrivacyOrderMutation()

  const filtered = useMemo(
    () => {
      if (!sinceYearlyReset) return filterAdminPrivacyBasesByRange(allBases, windowFrom, windowTo)
      const resets = latestYearlyResetByTicker(allBases)
      return allBases.filter((b) => b.releaseDate >= (resets.get(b.ticker) ?? ''))
    },
    [allBases, windowFrom, windowTo, sinceYearlyReset],
  )
  const totalCount = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const currentPage = Math.min(page, totalPages)
  const bases = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const findOrder = (ref: { baseId: string; orderId: string } | null) => {
    if (!ref) return undefined
    const order = allBases.find((b) => b.id === ref.baseId)?.orders.find((o) => o.id === ref.orderId)
    return order && { baseId: ref.baseId, order }
  }
  const editBase = allBases.find((b) => b.id === editBaseId)
  const editOrder = findOrder(editOrderRef)
  const deleteOrderTarget = findOrder(deleteOrderRef)
  const addOrderBase = allBases.find((b) => b.id === addOrderBaseId)
  const isRangeFiltered = sinceYearlyReset || Boolean(windowFrom || windowTo)

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

  function handleDeleteOrder() {
    if (!deleteOrderTarget) return
    deleteOrderMutation.mutate(
      { baseId: deleteOrderTarget.baseId, orderId: deleteOrderTarget.order.id },
      {
        onSuccess: () => {
          toast.success('주문이 삭제되었습니다')
          setDeleteOrderRef(null)
        },
      },
    )
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{data ? `총 ${totalCount}건` : ''}</span>
        <div className="flex items-center gap-2">
          {/* 페이지 크기는 이 표에만 적용돼 차트 위가 아니라 표 머리에 둔다 — 값은 URL(size)이 SSOT */}
          <PageSizeSelector value={String(pageSize)} />
          <Button type="button" variant="brand-soft" size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" />
          매매표 등록
          </Button>
        </div>
      </div>

      {!data && isError ? (
        <EmptyState
          message="P 매매표를 불러오지 못했습니다."
          action={<Button type="button" variant="outline" size="sm" onClick={() => { void refetch() }} disabled={isFetching}>다시 시도</Button>}
        />
      ) : !data ? (
        <LoadingRow />
      ) : bases.length === 0 ? (
        <EmptyState message={isRangeFiltered && allBases.length > 0 ? '선택한 기간에 매매표가 없습니다. 기간을 넓혀 보세요.' : 'P 매매표가 없습니다. 매매표 등록 버튼으로 추가할 수 있습니다.'} />
      ) : (
        <>
          {/* 위 차트 카드 제목(h2) 아래에 모바일 카드 h3이 이어 붙지 않도록 이 목록 자체의 제목을 둔다 */}
          <h2 className="sr-only">P 매매표 목록</h2>
          <div className="space-y-3 lg:hidden" data-testid="admin-privacy-mobile-list">
            {bases.map((b) => {
              const open = expanded.has(b.id)
              return (
                <MobileBaseCard
                  key={b.id}
                  base={b}
                  open={open}
                  onToggle={() => toggle(b.id)}
                  onEditBase={() => setEditBaseId(b.id)}
                  onEditOrder={(order) => setEditOrderRef({ baseId: b.id, orderId: order.id })}
                  onAddOrder={() => setAddOrderBaseId(b.id)}
                  onDeleteOrder={(order) => setDeleteOrderRef({ baseId: b.id, orderId: order.id })}
                />
              )
            })}
          </div>

          <div className="hidden rounded-[var(--r-lg)] border border-border overflow-x-auto lg:block" role="region" aria-label="P 매매표 목록" tabIndex={0} data-testid="admin-privacy-desktop-table-wrap">
            <table className="w-full text-sm min-w-[760px]" data-testid="admin-privacy-desktop-table">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <TableHeadCell className="w-8 px-2"><span className="sr-only">펼치기</span></TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">날짜</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">종목</TableHeadCell>
                  <TableHeadCell numeric className="whitespace-nowrap">사이클 시작금액</TableHeadCell>
                  <TableHeadCell numeric className="whitespace-nowrap">평단가</TableHeadCell>
                  <TableHeadCell numeric className="whitespace-nowrap">보유</TableHeadCell>
                  <TableHeadCell numeric className="whitespace-nowrap">실현손익</TableHeadCell>
                  <TableHeadCell numeric className="whitespace-nowrap">주문</TableHeadCell>
                  <TableHeadCell className="w-16 whitespace-nowrap"><span className="sr-only">수정</span></TableHeadCell>
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
                      onEditBase={() => setEditBaseId(b.id)}
                      onEditOrder={(order) => setEditOrderRef({ baseId: b.id, orderId: order.id })}
                      onAddOrder={() => setAddOrderBaseId(b.id)}
                      onDeleteOrder={(order) => setDeleteOrderRef({ baseId: b.id, orderId: order.id })}
                    />
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <PaginationBar page={currentPage} totalPages={totalPages} />

      {createOpen && (
        <CreatePrivacyBaseDialog open={createOpen} onOpenChange={setCreateOpen} />
      )}

      {editBase && (
        <EditPrivacyBaseDialog
          base={editBase}
          open
          onOpenChange={(next) => { if (!next) setEditBaseId(null) }}
        />
      )}

      {editOrder && (
        <EditPrivacyOrderDialog
          baseId={editOrder.baseId}
          order={editOrder.order}
          open
          onOpenChange={(next) => { if (!next) setEditOrderRef(null) }}
        />
      )}

      {addOrderBase && (
        <AddPrivacyOrderDialog
          baseId={addOrderBase.id}
          open
          onOpenChange={(next) => { if (!next) setAddOrderBaseId(null) }}
        />
      )}

      <ConfirmDeleteDialog
        open={deleteOrderTarget != null}
        onOpenChange={(next) => { if (!next) setDeleteOrderRef(null) }}
        title="주문 삭제"
        description={deleteOrderTarget ? `${describeOrder(deleteOrderTarget.order, labelOf)} 주문을 삭제합니다.` : ''}
        onConfirm={handleDeleteOrder}
        isPending={deleteOrderMutation.isPending}
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
    <article className="rounded-[var(--r-lg)] border border-border bg-card/70 px-4 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        {/* 카드 헤더 전체가 아코디언 토글 — 데스크탑 표의 IconButton 토글과 같은 aria-expanded/controls */}
        <h3 className="min-w-0 flex-1">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 text-left"
            onClick={onToggle}
            aria-expanded={open}
            aria-controls={open ? `privacy-base-${b.id}-mobile` : undefined}
          >
            {/* 날짜·종목을 한 줄로 — 카드 높이를 줄여 목록을 한눈에 훑게 한다 */}
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="text-base font-extrabold tracking-tight">{b.ticker}</span>
              <span className="text-xs font-medium text-muted-foreground">{b.releaseDate}</span>
            </span>
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{b.orders.length}건</span>
              {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </span>
          </button>
        </h3>
        <IconButton onClick={onEditBase} aria-label={`${b.releaseDate} ${b.ticker} 매매표 수정`}>
          <Pencil className="size-4" />
        </IconButton>
      </div>

      {/* 지표 4개는 타일 대신 라벨-값 2열 목록 — 카드 하나가 화면을 덜 차지하게 */}
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
        <Metric label="시작금액" value={`$${fmtUsd(b.currentCycleStart)}`} valueClassName="tabular-nums" />
        <Metric
          label="실현손익"
          value={fmtSignedUsd(b.currentCycleRealizedPnl)}
          valueClassName={`tabular-nums ${pnlTextClass(b.currentCycleRealizedPnl)}`}
        />
        <Metric label="평단가" value={b.avgPrice == null ? '-' : `$${fmtUsd(b.avgPrice)}`} valueClassName="tabular-nums" />
        <Metric label="보유" value={String(b.holdings)} />
      </dl>

      {open && (
        <div id={`privacy-base-${b.id}-mobile`} className="mt-3 border-t border-border pt-3">
          <OrderDetailsSection orders={b.orders} onEditOrder={onEditOrder} onAddOrder={onAddOrder} onDeleteOrder={onDeleteOrder} />
        </div>
      )}
    </article>
  )
}

function Metric({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`text-sm font-semibold ${valueClassName ?? ''}`}>{value}</dd>
    </div>
  )
}

const ORDER_DETAILS_HEAD_CLASS = 'px-3 py-1 text-xs lg:text-xs font-medium normal-case tracking-normal text-muted-foreground'
const ORDER_DETAILS_CELL_CLASS = 'px-3 py-1 text-xs'

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
          className="gap-1.5"
          onClick={(e) => { e.stopPropagation(); onAddOrder() }}
        >
          <Plus className="size-3.5" />주문 추가
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
  const { labelOf } = useMeta()
  return (
    <table className="w-full text-xs">
      <thead>
        <tr>
          <TableHeadCell className={ORDER_DETAILS_HEAD_CLASS}>방향</TableHeadCell>
          <TableHeadCell className={ORDER_DETAILS_HEAD_CLASS}>유형</TableHeadCell>
          <TableHeadCell numeric className={ORDER_DETAILS_HEAD_CLASS}>가격</TableHeadCell>
          <TableHeadCell numeric className={ORDER_DETAILS_HEAD_CLASS}>수량</TableHeadCell>
          <TableHeadCell className={cn(ORDER_DETAILS_HEAD_CLASS, 'w-px')}><span className="sr-only">수정·삭제</span></TableHeadCell>
        </tr>
      </thead>
      <tbody>
        {orders.map((o) => (
          <tr key={o.id}>
            <TableDataCell className={ORDER_DETAILS_CELL_CLASS}>
              <Badge tone="none" size="sm" className={directionBadgeClass(o.direction)}>{labelOf('orderDirections', o.direction)}</Badge>
            </TableDataCell>
            <TableDataCell className={cn(ORDER_DETAILS_CELL_CLASS, 'text-muted-foreground')}>{labelOf('orderTypes', o.orderType)}</TableDataCell>
            <TableDataCell className={cn(ORDER_DETAILS_CELL_CLASS, 'text-right tabular-nums whitespace-nowrap')}>${fmtUsd(o.price)}</TableDataCell>
            <TableDataCell className={cn(ORDER_DETAILS_CELL_CLASS, 'text-right tabular-nums whitespace-nowrap')}>{o.quantity ?? '-'}</TableDataCell>
            <TableDataCell className={cn(ORDER_DETAILS_CELL_CLASS, 'text-right whitespace-nowrap')}>
              <span className="inline-flex items-center gap-1.5">
                <IconButton
                  onClick={(e) => { e.stopPropagation(); onEditOrder(o) }}
                  aria-label={`${describeOrder(o, labelOf)} 수정`}
                >
                  <Pencil className="size-4" />
                </IconButton>
                <IconButton
                  onClick={(e) => { e.stopPropagation(); onDeleteOrder(o) }}
                  aria-label={`${describeOrder(o, labelOf)} 삭제`}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </IconButton>
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
      <tr className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={onToggle}>
        <TableDataCell className="px-2 py-3 text-muted-foreground">
          {/* 행 높이를 키우지 않도록 IconButton 기본 44px 대신 32px로 줄인다 — 행 전체 클릭으로도 펼쳐져 터치 영역은 그 이상이다 */}
          <IconButton
            className="-my-1 size-8"
            onClick={(e) => { e.stopPropagation(); onToggle() }}
            aria-expanded={open}
            aria-controls={open ? `privacy-base-${b.id}-details` : undefined}
            aria-label={`${b.releaseDate} ${b.ticker} 주문 명세`}
          >
            {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </IconButton>
        </TableDataCell>
        <TableDataCell className="text-muted-foreground whitespace-nowrap">{b.releaseDate}</TableDataCell>
        <TableDataCell className="whitespace-nowrap">{b.ticker}</TableDataCell>
        <TableDataCell className="text-right tabular-nums whitespace-nowrap">${fmtUsd(b.currentCycleStart)}</TableDataCell>
        <TableDataCell className="text-right tabular-nums whitespace-nowrap">{b.avgPrice == null ? '-' : `$${fmtUsd(b.avgPrice)}`}</TableDataCell>
        <TableDataCell className="text-right tabular-nums whitespace-nowrap">{b.holdings}</TableDataCell>
        <TableDataCell className={`text-right tabular-nums whitespace-nowrap ${pnlTextClass(b.currentCycleRealizedPnl)}`}>
          {fmtSignedUsd(b.currentCycleRealizedPnl)}
        </TableDataCell>
        <TableDataCell className="text-right tabular-nums text-muted-foreground whitespace-nowrap">{b.orders.length}건</TableDataCell>
        <TableDataCell className="whitespace-nowrap">
          <IconButton
            onClick={(e) => { e.stopPropagation(); onEditBase() }}
            aria-label={`${b.releaseDate} ${b.ticker} 매매표 수정`}
          >
            <Pencil className="size-4" />
          </IconButton>
        </TableDataCell>
      </tr>
      {open && (
        <tr id={`privacy-base-${b.id}-details`} className="bg-muted/10">
          <td></td>{/* eslint-disable-line react-doctor/control-has-associated-label */}
          <td colSpan={8} className="px-4 py-3">
            <OrderDetailsSection orders={b.orders} onEditOrder={onEditOrder} onAddOrder={onAddOrder} onDeleteOrder={onDeleteOrder} />
          </td>
        </tr>
      )}
    </>
  )
}
