'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMeta } from '@entities/meta'
import { dcaIndicatorLabel, formatDcaCondition, formatDcaSchedule, useDcaExecutionsQuery } from '@entities/strategy'
import type { DcaRule } from '@entities/strategy'
import { directionBadgeClass } from '@entities/trade'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { EmptyState } from '@shared/ui/EmptyState'
import { LoadingRow } from '@shared/ui/LoadingRow'
import { Badge } from '@shared/ui/Badge'
import { groupConsecutiveBy } from '@shared/lib/utils'
import { DATE_GROUP_LABEL_CLASS } from '@shared/ui/dateGroup'
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

  // 방향·주기·조건을 따로 그린다(PC 표 칸, 모바일 카드 줄) — 삭제된 규칙은 응답의 방향만 남는다
  const directionBadge = (r: ExecutionItem) => (
    <Badge tone="none" size="sm" className={directionBadgeClass(r.direction)}>{labelOf('orderDirections', r.direction)}</Badge>
  )
  const scheduleCell = (r: ExecutionItem) => {
    const rule = rules.find((x) => x.ruleKey === r.ruleKey)
    return rule ? formatDcaSchedule(rule, labelOf('dcaFrequencies', rule.frequency)) : <span className="text-muted-foreground">삭제된 규칙</span>
  }
  const conditionsOf = (r: ExecutionItem) => rules.find((x) => x.ruleKey === r.ruleKey)?.conditions ?? []
  const conditionCell = (r: ExecutionItem) => {
    const conditions = conditionsOf(r)
    return conditions.length === 0 ? '-' : conditions.map((c, i) => (
      <div key={i}>{formatDcaCondition(c, dcaIndicatorLabel(c.indicator, labelOf('dcaIndicators', c.indicator), isCrypto), labelOf('dcaOperators', c.operator))}</div>
    ))
  }
  const statusBadge = (r: ExecutionItem) => (
    <Badge tone={r.status === 'ORDERED' ? 'none' : 'neutral'} size="sm" className={r.status === 'ORDERED' ? 'bg-info-bg text-info' : undefined}>{labelOf('dcaExecutionStatuses', r.status)}</Badge>
  )
  const priceText = (r: ExecutionItem) => (r.referencePrice != null ? fmtMoney(r.referencePrice, currency) : '-')
  const quantityText = (r: ExecutionItem) => (r.quantity != null ? (isCrypto ? `${fmtQuantity(r.quantity)} ${ticker}` : `${fmtQuantity(r.quantity)}주`) : '-')
  const filledText = (r: ExecutionItem) => (r.order
    ? `${labelOf('orderStatuses', r.order.status)}${r.order.filledPrice != null ? ` · ${fmtMoney(r.order.filledPrice, currency)}` : ''}`
    : '-')
  // 모바일 카드는 칸 이름이 '체결가'라 상태 라벨을 반복하지 않는다 — 체결가가 없을 때만 주문 상태를 보여 준다
  const fillPriceText = (r: ExecutionItem) => (!r.order ? '-' : r.order.filledPrice != null ? fmtMoney(r.order.filledPrice, currency) : labelOf('orderStatuses', r.order.status))
  // 날짜(fmtDate 결과)별 그룹 — 입력 순서 유지
  const groups = groupConsecutiveBy(rows, (r) => fmtDate(r.kstTradeDate))

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
                <div key={`${g.key}-${i}`} className="space-y-1.5">
                  <div className={DATE_GROUP_LABEL_CLASS}>{g.key}</div>
                  {g.items.map((r) => (
                    <div key={r.ruleKey} className="rounded-[var(--r-md)] border border-border bg-card px-3 py-2.5 space-y-2">
                      <div className="flex items-start justify-between gap-2 text-sm">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">{directionBadge(r)}{scheduleCell(r)}</div>
                          {/* 조건이 없으면 '-' 줄을 따로 두지 않는다 */}
                          {conditionsOf(r).length > 0 && <div className="mt-1 text-xs text-muted-foreground">{conditionCell(r)}</div>}
                        </div>
                        <div className="shrink-0">{statusBadge(r)}</div>
                      </div>
                      {/* 3칸 고정 — 금액이 길면 단위 앞에서 줄바꿈해 칸을 넘지 않는다 */}
                      <dl className="grid grid-cols-3 gap-2 text-sm">
                        {([['기준가', priceText(r)], ['수량', quantityText(r)], ['체결가', fillPriceText(r)]] as const).map(([label, value]) => (
                          <div key={label} className="min-w-0">
                            <dt className="text-xs text-muted-foreground">{label}</dt>
                            <dd className="mt-0.5 font-semibold tabular-nums break-keep">{value}</dd>
                          </div>
                        ))}
                      </dl>
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
                    <TableHeadCell className="whitespace-nowrap">방향</TableHeadCell>
                    <TableHeadCell className="whitespace-nowrap">주기</TableHeadCell>
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
                      <TableDataCell className="whitespace-nowrap">{directionBadge(r)}</TableDataCell>
                      <TableDataCell className="whitespace-nowrap">{scheduleCell(r)}</TableDataCell>
                      <TableDataCell className="whitespace-nowrap">{conditionCell(r)}</TableDataCell>
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
