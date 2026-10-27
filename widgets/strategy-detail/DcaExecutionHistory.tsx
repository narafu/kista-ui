'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMeta } from '@entities/meta'
import { formatDcaRuleSummary, useDcaExecutionsQuery } from '@entities/strategy'
import type { DcaRule } from '@entities/strategy'
import { directionBadgeClass } from '@entities/trade'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { EmptyState } from '@shared/ui/EmptyState'
import { LoadingRow } from '@shared/ui/LoadingRow'
import { Badge } from '@shared/ui/Badge'
import { TableHeadCell } from '@shared/ui/TableHeadCell'
import { TableDataCell } from '@shared/ui/TableDataCell'
import { fmtDate, fmtMoney, fmtQuantity } from '@shared/lib/format'
import { isCryptoMarket, marketCurrency } from '@shared/lib/api-schema'
import type { TradingMarket } from '@shared/lib/api-schema'
import { SectionError } from '@shared/ui/SectionError'

const PAGE_SIZE = 20

type ExecutionItem = NonNullable<ReturnType<typeof useDcaExecutionsQuery>['data']>['content'][number]

export function DcaExecutionHistory({ strategyId, ticker, rules, market }: { strategyId: string; ticker: string; rules: DcaRule[]; market: TradingMarket }) {
  const { labelOf } = useMeta()
  const isCrypto = isCryptoMarket(market)
  const currency = marketCurrency(market)
  const [page, setPage] = useState(1) // PaginationBar는 1-base, API는 0-base
  const { data, isLoading, isError } = useDcaExecutionsQuery(strategyId, page - 1, PAGE_SIZE)
  const rows = data?.content ?? []
  const totalPages = Math.ceil((data?.totalElements ?? 0) / PAGE_SIZE)

  // 표·카드 공용 셀 렌더러
  const ruleCell = (r: ExecutionItem) => {
    const rule = rules.find((x) => x.ruleKey === r.ruleKey)
    return rule ? formatDcaRuleSummary(rule, labelOf, market) : (
      <span className="inline-flex items-center gap-1.5">
        <Badge tone="none" size="sm" className={directionBadgeClass(r.direction)}>{labelOf('orderDirections', r.direction)}</Badge>
        <span className="text-muted-foreground">삭제된 규칙</span>
      </span>
    )
  }
  const statusBadge = (r: ExecutionItem) => (
    <Badge tone={r.status === 'ORDERED' ? 'none' : 'neutral'} size="sm" className={r.status === 'ORDERED' ? 'bg-info-bg text-info' : undefined}>{labelOf('dcaExecutionStatuses', r.status)}</Badge>
  )
  const priceText = (r: ExecutionItem) => (r.referencePrice != null ? fmtMoney(r.referencePrice, currency) : '-')
  const quantityText = (r: ExecutionItem) => (r.quantity != null ? (isCrypto ? `${fmtQuantity(r.quantity)} ${ticker}` : `${fmtQuantity(r.quantity)}주`) : '-')
  const filledText = (r: ExecutionItem) => (r.order
    ? `${labelOf('orderStatuses', r.order.status)}${r.order.filledPrice != null ? ` · ${fmtMoney(r.order.filledPrice, currency)}` : ''}`
    : '-')
  // 날짜(fmtDate 결과)별 그룹 — 입력 순서 유지
  const groups = rows.reduce<{ date: string; items: ExecutionItem[] }[]>((acc, r) => {
    const date = fmtDate(r.kstTradeDate)
    const last = acc[acc.length - 1]
    if (last && last.date === date) last.items.push(r)
    else acc.push({ date, items: [r] })
    return acc
  }, [])

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
          <>
            {/* 모바일: 카드 리스트 */}
            <div className="space-y-2 p-4 lg:hidden">
              {groups.map((g, i) => (
                <div key={`${g.date}-${i}`} className="space-y-1.5">
                  <div className="px-1 pt-2 text-sm uppercase tracking-widest text-muted-foreground">{g.date}</div>
                  {g.items.map((r) => (
                    <div key={r.ruleKey} className="rounded-[var(--r-md)] border border-border bg-card px-3 py-2.5 space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <div>{ruleCell(r)}</div>
                        <div className="shrink-0">{statusBadge(r)}</div>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-muted-foreground">
                          기준가 <span className="font-semibold text-foreground">{priceText(r)}</span> · 수량 <span className="font-semibold text-foreground">{quantityText(r)}</span>
                        </span>
                        <span className="text-muted-foreground">
                          체결 <span className="font-semibold text-foreground">{filledText(r)}</span>
                        </span>
                      </div>
                      {(r.skipReason || r.detail) && (
                        <div className="text-xs text-muted-foreground">
                          {r.skipReason && <div>{labelOf('dcaSkipReasons', r.skipReason)}</div>}
                          {r.detail && <div>{r.detail}</div>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {/* 데스크탑: 테이블 */}
            <div role="region" aria-label="회차별 실행 이력" tabIndex={0} className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <TableHeadCell className="whitespace-nowrap">{isCrypto ? '실행일' : '거래일'}</TableHeadCell>
                    <TableHeadCell className="whitespace-nowrap">규칙</TableHeadCell>
                    <TableHeadCell className="whitespace-nowrap">결과</TableHeadCell>
                    <TableHeadCell className="whitespace-nowrap">사유</TableHeadCell>
                    <TableHeadCell numeric className="whitespace-nowrap">기준가</TableHeadCell>
                    <TableHeadCell numeric className="whitespace-nowrap">수량</TableHeadCell>
                    <TableHeadCell className="whitespace-nowrap">체결</TableHeadCell>
                  </tr>
                </thead>
                <tbody>
                  {/* kista-api uq_dca_execution_strategy_trade_date(strategy_id, trade_date, rule_key)로 (전략, 거래일, 규칙)당 1건 보장 */}
                  {rows.map((r) => (
                    <tr key={`${r.kstTradeDate}-${r.ruleKey}`} className="border-t hover:bg-muted/30 transition-colors">
                      <TableDataCell className="text-muted-foreground whitespace-nowrap">{fmtDate(r.kstTradeDate)}</TableDataCell>
                      <TableDataCell className="whitespace-nowrap">{ruleCell(r)}</TableDataCell>
                      <TableDataCell className="whitespace-nowrap">{statusBadge(r)}</TableDataCell>
                      {/* detail은 가변 길이 자유 텍스트라 nowrap 대신 최소 너비로 글자 단위 줄바꿈만 막는다 */}
                      <TableDataCell className="min-w-32">
                        {r.skipReason && <div>{labelOf('dcaSkipReasons', r.skipReason)}</div>}
                        {r.detail && <div className="text-xs text-muted-foreground">{r.detail}</div>}
                      </TableDataCell>
                      <TableDataCell className="text-right tabular-nums whitespace-nowrap">{priceText(r)}</TableDataCell>
                      <TableDataCell className="text-right tabular-nums whitespace-nowrap">{quantityText(r)}</TableDataCell>
                      <TableDataCell className="whitespace-nowrap">{filledText(r)}</TableDataCell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
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
