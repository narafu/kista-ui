'use client'

import { useState } from 'react'
import type { AdminTrade } from '@entities/user'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { AdminTradesTable } from './AdminTradesTable'

interface Props {
  initialTrades: AdminTrade[]
  initialPage: number
  initialSize: number
}

export function AdminTradesWorkbench({ initialTrades, initialPage, initialSize }: Props) {
  const [page, setPage] = useState(initialPage)
  const [size, setSize] = useState(initialSize)
  const [selectedTradeIds, setSelectedTradeIds] = useState<string[]>([])

  const totalPages = Math.max(1, Math.ceil(initialTrades.length / size))
  const currentPage = Math.min(page, totalPages)
  const pagedTrades = initialTrades.slice((currentPage - 1) * size, currentPage * size)
  const selectedTrades = initialTrades.filter((trade) => selectedTradeIds.includes(trade.id))

  const handleSizeChange = (nextSize: string) => {
    setSize(Number(nextSize))
    setPage(1)
  }

  const handleToggleTrade = (tradeId: string) => {
    setSelectedTradeIds((current) =>
      current.includes(tradeId)
        ? current.filter((id) => id !== tradeId)
        : [...current, tradeId],
    )
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-muted/20 p-4" aria-label="선택된 보정 대상">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-base font-semibold">선택된 보정 대상</h2>
            <p className="mt-1 text-sm text-muted-foreground">{selectedTrades.length}건 선택됨</p>
          </div>
          <PageSizeSelector value={String(size)} onChange={handleSizeChange} />
        </div>

        {selectedTrades.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">선택한 거래가 없습니다</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {selectedTrades.map((trade) => (
              <li
                key={trade.id}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <span className="font-medium">{trade.ownerNickname}</span>
                <span className="mx-2 text-muted-foreground">·</span>
                <span>{trade.ticker}</span>
                <span className="mx-2 text-muted-foreground">·</span>
                <span className="text-muted-foreground">{trade.tradeDate}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AdminTradesTable
        trades={pagedTrades}
        selectedTradeIds={selectedTradeIds}
        onToggleTrade={handleToggleTrade}
      />

      <PaginationBar page={currentPage} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}
