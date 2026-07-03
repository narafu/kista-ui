'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { fmtUsd, pnlTextClass } from '@shared/lib/format'
import { DIRECTION_LABEL, directionTextClass } from '@entities/trade'
import { EmptyState } from '@shared/ui/EmptyState'
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
      <EmptyState message="기준 매매표가 없습니다." />
    )
  }

  return (
    <div className="rounded-[var(--r-lg)] border border-border overflow-x-auto">
      <table className="min-w-[560px] w-full text-sm sm:min-w-[760px]">
        <thead className="bg-muted/40 border-b border-border">
          <tr>
            <th className="w-8 px-2 py-3" aria-label="확장"></th>
            <th className="px-2.5 py-3 text-center font-semibold text-muted-foreground whitespace-nowrap sm:px-4">날짜</th>
            <th className="px-2.5 py-3 text-center font-semibold text-muted-foreground whitespace-nowrap sm:px-4">종목</th>
            <th className="px-2.5 py-3 text-center font-semibold text-muted-foreground whitespace-nowrap sm:px-4">
              <span className="sm:hidden">시작금액</span>
              <span className="hidden sm:inline">사이클 시작금액</span>
            </th>
            <th className="hidden text-center px-2.5 py-3 font-semibold text-muted-foreground whitespace-nowrap sm:table-cell sm:px-4">평단가</th>
            <th className="px-2.5 py-3 text-center font-semibold text-muted-foreground whitespace-nowrap sm:px-4">보유</th>
            <th className="hidden text-center px-2.5 py-3 font-semibold text-muted-foreground whitespace-nowrap sm:table-cell sm:px-4">실현손익</th>
            <th className="hidden text-center px-2.5 py-3 font-semibold text-muted-foreground whitespace-nowrap sm:table-cell sm:px-4">주문</th>
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
  )
}

function FragmentRow({ base: b, open, onToggle }: { base: AdminPrivacyBase; open: boolean; onToggle: () => void }) {
  return (
    <>
      <tr
        className="hover:bg-muted/20 transition-colors cursor-pointer"
        onClick={onToggle}
        aria-label={`${b.tradeDate} ${b.ticker} 행 ${open ? '접기' : '펼치기'}`}
      >
        <td className="px-2 py-3 text-muted-foreground">
          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </td>
        <td className="px-2.5 py-3 text-center text-muted-foreground text-xs whitespace-nowrap sm:px-4">{b.tradeDate}</td>
        <td className="px-2.5 py-3 text-center whitespace-nowrap sm:px-4">{b.ticker}</td>
        <td className="px-2.5 py-3 text-center font-mono text-xs whitespace-nowrap sm:px-4">${fmtUsd(b.currentCycleStart)}</td>
        <td className="hidden px-2.5 py-3 text-center font-mono text-xs whitespace-nowrap sm:table-cell sm:px-4">{b.avgPrice == null ? '-' : `$${fmtUsd(b.avgPrice)}`}</td>
        <td className="px-2.5 py-3 text-center whitespace-nowrap sm:px-4">{b.holdings}</td>
        <td className={`hidden px-2.5 py-3 text-center font-mono text-xs whitespace-nowrap sm:table-cell sm:px-4 ${pnlTextClass(b.currentCycleRealizedPnl)}`}>
          {b.currentCycleRealizedPnl >= 0 ? '+' : ''}{fmtUsd(b.currentCycleRealizedPnl)}
        </td>
        <td className="hidden px-2.5 py-3 text-center text-muted-foreground whitespace-nowrap sm:table-cell sm:px-4">{b.orders.length}건</td>
      </tr>
      {open && b.orders.length > 0 && (
        <tr className="bg-muted/10">
          <td></td>{/* eslint-disable-line react-doctor/control-has-associated-label */}
          <td colSpan={4} className="px-3 py-3 sm:hidden">
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
                {b.orders.map((o) => (
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
          </td>
          <td colSpan={7} className="hidden px-4 py-3 sm:table-cell">
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
                {b.orders.map((o) => (
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
          </td>
        </tr>
      )}
    </>
  )
}
