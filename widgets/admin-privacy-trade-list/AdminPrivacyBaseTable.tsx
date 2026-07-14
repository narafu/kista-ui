'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { fmtUsd, fmtSignedUsd, pnlTextClass } from '@shared/lib/format'
import { DIRECTION_LABEL, directionTextClass } from '@entities/trade'
import { EmptyState } from '@shared/ui/EmptyState'
import { TableHeadCell } from '@shared/ui/TableHeadCell'
import type { AdminPrivacyBase } from '@entities/privacy'

interface Props {
  bases: AdminPrivacyBase[]
}

export function AdminPrivacyBaseTable({ bases }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

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

  if (bases.length === 0) {
    return (
      <EmptyState message="P 매매표가 없습니다." />
    )
  }

  return (
    <>
      <div className="space-y-3 sm:hidden" data-testid="admin-privacy-mobile-list">
        {bases.map((b) => {
          const open = expanded.has(b.id)
          return (
            <MobileBaseCard key={b.id} base={b} open={open} onToggle={() => toggle(b.id)} />
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
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {bases.map((b) => {
              const open = expanded.has(b.id)
              return (
                <FragmentRow key={b.id} base={b} open={open} onToggle={() => toggle(b.id)} />
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

function MobileBaseCard({ base: b, open, onToggle }: { base: AdminPrivacyBase; open: boolean; onToggle: () => void }) {
  return (
    <article className="rounded-[var(--r-lg)] border border-border bg-card/70 p-4 shadow-sm">
      <button
        type="button"
        className="w-full text-left"
        onClick={onToggle}
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
      </button>

      {open && b.orders.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <OrderDetailsTable orders={b.orders} />
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

function OrderDetailsTable({ orders }: { orders: AdminPrivacyBase['orders'] }) {
  return (
    <table className="w-full text-xs">
      <thead className="text-muted-foreground">
        <tr>
          <th className="text-left py-1 font-medium">방향</th>
          <th className="text-left py-1 font-medium">유형</th>
          <th className="text-right py-1 font-medium">가격</th>
          <th className="text-right py-1 font-medium">수량</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((o) => (
          <tr key={o.id}>
            <td className={`py-1 font-semibold ${directionTextClass(o.direction)}`}>
              {DIRECTION_LABEL[o.direction] ?? o.direction}
            </td>
            <td className="py-1 text-muted-foreground">{o.orderType}</td>
            <td className="py-1 text-right font-mono">${fmtUsd(o.price)}</td>
            <td className="py-1 text-right">{o.quantity ?? '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function FragmentRow({ base: b, open, onToggle }: { base: AdminPrivacyBase; open: boolean; onToggle: () => void }) {
  return (
    <>
      <tr
        className="hover:bg-muted/20 transition-colors cursor-pointer"
        onClick={onToggle}
        aria-label={`${b.releaseDate} ${b.ticker} 행 ${open ? '접기' : '펼치기'}`}
      >
        <td className="px-2 py-3 text-muted-foreground">
          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </td>
        <td className="px-2.5 py-3 text-center text-muted-foreground text-xs whitespace-nowrap sm:px-4">{b.releaseDate}</td>
        <td className="px-2.5 py-3 text-center whitespace-nowrap sm:px-4">{b.ticker}</td>
        <td className="px-2.5 py-3 text-center font-mono text-xs whitespace-nowrap sm:px-4">${fmtUsd(b.currentCycleStart)}</td>
        <td className="hidden px-2.5 py-3 text-center font-mono text-xs whitespace-nowrap sm:table-cell sm:px-4">{b.avgPrice == null ? '-' : `$${fmtUsd(b.avgPrice)}`}</td>
        <td className="px-2.5 py-3 text-center whitespace-nowrap sm:px-4">{b.holdings}</td>
        <td className={`hidden px-2.5 py-3 text-center font-mono text-xs whitespace-nowrap sm:table-cell sm:px-4 ${pnlTextClass(b.currentCycleRealizedPnl)}`}>
          {fmtSignedUsd(b.currentCycleRealizedPnl)}
        </td>
        <td className="hidden px-2.5 py-3 text-center text-muted-foreground whitespace-nowrap sm:table-cell sm:px-4">{b.orders.length}건</td>
      </tr>
      {open && b.orders.length > 0 && (
        <tr className="bg-muted/10">
          <td></td>{/* eslint-disable-line react-doctor/control-has-associated-label */}
          <td colSpan={7} className="px-4 py-3">
            <OrderDetailsTable orders={b.orders} />
          </td>
        </tr>
      )}
    </>
  )
}
