'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { fmtUsd } from '@shared/lib/format'
import type { AdminPrivacyBase } from '@entities/privacy'

const DIRECTION_LABEL: Record<string, string> = { BUY: '매수', SELL: '매도' }

interface Props {
  bases: AdminPrivacyBase[]
}

export function AdminPrivacyBaseTable({ bases }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (bases.length === 0) {
    return (
      <div className="rounded-xl border border-border p-10 text-center text-sm text-muted-foreground">
        기준 매매표가 없습니다
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 border-b border-border">
          <tr>
            <th className="w-8 px-2 py-3"></th>
            <th className="text-left px-4 py-3 font-semibold text-muted-foreground">날짜</th>
            <th className="text-left px-4 py-3 font-semibold text-muted-foreground">종목</th>
            <th className="text-right px-4 py-3 font-semibold text-muted-foreground">기준가</th>
            <th className="text-right px-4 py-3 font-semibold text-muted-foreground">평단가</th>
            <th className="text-right px-4 py-3 font-semibold text-muted-foreground">보유</th>
            <th className="text-right px-4 py-3 font-semibold text-muted-foreground">실현손익</th>
            <th className="text-right px-4 py-3 font-semibold text-muted-foreground">주문</th>
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
      <tr className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={onToggle}>
        <td className="px-2 py-3 text-muted-foreground">
          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </td>
        <td className="px-4 py-3 text-muted-foreground text-xs">{b.tradeDate}</td>
        <td className="px-4 py-3">{b.ticker}</td>
        <td className="px-4 py-3 text-right font-mono text-xs">${fmtUsd(b.currentCycleStart)}</td>
        <td className="px-4 py-3 text-right font-mono text-xs">{b.avgPrice == null ? '-' : `$${fmtUsd(b.avgPrice)}`}</td>
        <td className="px-4 py-3 text-right">{b.holdings}</td>
        <td className={`px-4 py-3 text-right font-mono text-xs ${b.currentCycleRealizedPnl >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {b.currentCycleRealizedPnl >= 0 ? '+' : ''}{fmtUsd(b.currentCycleRealizedPnl)}
        </td>
        <td className="px-4 py-3 text-right text-muted-foreground">{b.orders.length}건</td>
      </tr>
      {open && b.orders.length > 0 && (
        <tr className="bg-muted/10">
          <td></td>
          <td colSpan={7} className="px-4 py-3">
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
                    <td className={`py-1 font-semibold ${o.direction === 'BUY' ? 'text-blue-600' : 'text-red-500'}`}>
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
