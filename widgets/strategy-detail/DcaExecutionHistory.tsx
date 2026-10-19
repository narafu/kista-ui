'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMeta } from '@entities/meta'
import { dcaExecutionStatusLabel, useDcaExecutionsQuery } from '@entities/strategy'
import { ORDER_STATUS_LABEL } from '@entities/order'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { EmptyState } from '@shared/ui/EmptyState'
import { LoadingRow } from '@shared/ui/LoadingRow'
import { Badge } from '@shared/ui/Badge'
import { TableHeadCell } from '@shared/ui/TableHeadCell'
import { TableDataCell } from '@shared/ui/TableDataCell'
import { fmtDate, fmtMoney, fmtQuantity } from '@shared/lib/format'
import { isCryptoMarket } from '@shared/lib/api-schema'
import { SectionError } from '@shared/ui/SectionError'

const PAGE_SIZE = 20

export function DcaExecutionHistory({ strategyId, ticker }: { strategyId: string; ticker: string }) {
  const { labelOf, findTicker } = useMeta()
  const isCrypto = isCryptoMarket(findTicker(ticker)?.market)
  const currency = isCrypto ? 'KRW' : 'USD'
  const [page, setPage] = useState(1) // PaginationBar는 1-base, API는 0-base
  const { data, isLoading, isError } = useDcaExecutionsQuery(strategyId, page - 1, PAGE_SIZE)
  const rows = data?.content ?? []
  const totalPages = Math.ceil((data?.totalElements ?? 0) / PAGE_SIZE)

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle role="heading" aria-level={2} className="text-base lg:text-lg">회차별 실행 이력</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <LoadingRow />
        ) : isError && !data ? (
          <div className="px-6 pb-6"><SectionError message="실행 이력을 불러오지 못했습니다." /></div>
        ) : rows.length === 0 ? (
          <EmptyState variant="text" message="아직 실행된 회차가 없습니다." />
        ) : (
          <div role="region" aria-label="회차별 실행 이력" tabIndex={0} className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <TableHeadCell className="whitespace-nowrap">{isCrypto ? '실행일' : '거래일'}</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">결과</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">사유</TableHeadCell>
                  <TableHeadCell className="text-right whitespace-nowrap">기준가</TableHeadCell>
                  <TableHeadCell className="text-right whitespace-nowrap">수량</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">체결</TableHeadCell>
                </tr>
              </thead>
              <tbody>
                {/* kista-api uq_dca_execution_strategy_trade_date(strategy_id, trade_date)로 전략당 거래일 1건 보장 */}
                {rows.map((r) => (
                  <tr key={r.kstTradeDate} className="border-t hover:bg-muted/30 transition-colors">
                    <TableDataCell className="text-muted-foreground whitespace-nowrap">{fmtDate(r.kstTradeDate)}</TableDataCell>
                    <TableDataCell className="whitespace-nowrap">
                      <Badge tone={r.status === 'ORDERED' ? 'none' : 'neutral'} size="sm" className={r.status === 'ORDERED' ? 'bg-info-bg text-info' : undefined}>{dcaExecutionStatusLabel(r.status)}</Badge>
                    </TableDataCell>
                    {/* detail은 가변 길이 자유 텍스트라 nowrap 대신 최소 너비로 글자 단위 줄바꿈만 막는다 */}
                    <TableDataCell className="min-w-32">
                      {r.skipReason && <div>{labelOf('dcaSkipReasons', r.skipReason)}</div>}
                      {r.detail && <div className="text-xs text-muted-foreground">{r.detail}</div>}
                    </TableDataCell>
                    <TableDataCell className="text-right tabular-nums whitespace-nowrap">{r.referencePrice != null ? fmtMoney(r.referencePrice, currency) : '-'}</TableDataCell>
                    <TableDataCell className="text-right tabular-nums whitespace-nowrap">{r.quantity != null ? (isCrypto ? `${fmtQuantity(r.quantity)} ${ticker}` : `${fmtQuantity(r.quantity)}주`) : '-'}</TableDataCell>
                    <TableDataCell className="whitespace-nowrap">
                      {r.order
                        ? `${ORDER_STATUS_LABEL[r.order.status] ?? r.order.status}${r.order.filledPrice != null ? ` · ${fmtMoney(r.order.filledPrice, currency)}` : ''}`
                        : '-'}
                    </TableDataCell>
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
