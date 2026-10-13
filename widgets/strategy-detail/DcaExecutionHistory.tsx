'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMeta } from '@entities/meta'
import { useDcaExecutionsQuery } from '@entities/strategy'
import { ORDER_STATUS_LABEL } from '@entities/order'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { EmptyState } from '@shared/ui/EmptyState'
import { LoadingRow } from '@shared/ui/LoadingRow'
import { Badge } from '@shared/ui/Badge'
import { fmtUsd } from '@shared/lib/format'

const PAGE_SIZE = 20

export function DcaExecutionHistory({ strategyId }: { strategyId: string }) {
  const { labelOf } = useMeta()
  const [page, setPage] = useState(1) // PaginationBar는 1-base, API는 0-base
  const { data, isLoading, isError } = useDcaExecutionsQuery(strategyId, page - 1, PAGE_SIZE)
  const rows = data?.content ?? []
  const totalPages = Math.ceil((data?.totalElements ?? 0) / PAGE_SIZE)

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base lg:text-lg">
          <h2>회차별 실행 이력</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <LoadingRow />
        ) : isError ? (
          <EmptyState variant="text" message="실행 이력을 불러오지 못했습니다." />
        ) : rows.length === 0 ? (
          <EmptyState variant="text" message="아직 실행된 회차가 없습니다." />
        ) : (
          <div role="region" aria-label="회차별 실행 이력" tabIndex={0} className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="px-4 py-2 font-medium whitespace-nowrap">거래일</th>
                  <th className="px-4 py-2 font-medium whitespace-nowrap">결과</th>
                  <th className="px-4 py-2 font-medium whitespace-nowrap">사유</th>
                  <th className="px-4 py-2 font-medium text-right whitespace-nowrap">기준가</th>
                  <th className="px-4 py-2 font-medium text-right whitespace-nowrap">수량</th>
                  <th className="px-4 py-2 font-medium whitespace-nowrap">체결</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.kstTradeDate} className="border-t border-border">
                    <td className="px-4 py-2 tabular-nums whitespace-nowrap">{r.kstTradeDate}</td>
                    <td className="px-4 py-2">
                      <Badge tone={r.status === 'ORDERED' ? 'ok' : 'neutral'} size="sm">{r.status === 'ORDERED' ? '주문됨' : '건너뜀'}</Badge>
                    </td>
                    <td className="px-4 py-2">
                      {r.skipReason && <div>{labelOf('dcaSkipReasons', r.skipReason)}</div>}
                      {r.detail && <div className="text-xs text-muted-foreground">{r.detail}</div>}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums whitespace-nowrap">{r.referencePrice != null ? `$${fmtUsd(r.referencePrice)}` : '-'}</td>
                    <td className="px-4 py-2 text-right tabular-nums whitespace-nowrap">{r.quantity ?? '-'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {r.order
                        ? `${ORDER_STATUS_LABEL[r.order.status] ?? r.order.status}${r.order.filledPrice != null ? ` · $${fmtUsd(r.order.filledPrice)}` : ''}`
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="px-4 pb-4">
            <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
