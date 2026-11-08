import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SortableHeadCell } from '@shared/ui/SortableHeadCell'
import { MobileSortControl } from '@shared/ui/MobileSortControl'
import { useTableSort } from '@shared/lib/hooks/use-table-sort'
import { TableDataCell } from '@shared/ui/TableDataCell'
import { Badge } from '@shared/ui/Badge'
import { EmptyState } from '@shared/ui/EmptyState'
import { fmtSignedUsd, pnlTextClass, fmtSignedPercent } from '@shared/lib/format'
import { cn } from '@shared/lib/utils'
import type { StrategyTypeStats } from '@entities/stats'
import { useMeta } from '@entities/meta'

interface Props {
  byType: StrategyTypeStats[]
}

type SortKey = 'default' | 'type' | 'cycles' | 'avgReturnRate' | 'avgDurationDays' | 'realizedPnl' | 'unrealizedPnl'

export function StrategyTypeComparison({ byType }: Props) {
  const { labelOf } = useMeta()
  // 'default'는 헤더에 없는 키 — API 응답 순서 유지
  const { sortKey, sortDirection, handleSort } = useTableSort<SortKey>('default')
  const sorted = sortKey === 'default' ? byType : [...byType].sort((a, b) => {
    const dir = sortDirection === 'asc' ? 1 : -1
    if (sortKey === 'type') return dir * labelOf('strategyTypes', a.type).localeCompare(labelOf('strategyTypes', b.type), 'ko')
    const value = (t: StrategyTypeStats) => sortKey === 'cycles' ? t.closedCycleCount + t.activeCycleCount : t[sortKey]
    const av = value(a), bv = value(b)
    if (av == null) return bv == null ? 0 : 1 // null은 방향과 무관하게 맨 아래
    if (bv == null) return -1
    return dir * (av - bv)
  })
  const head = { activeKey: sortKey, direction: sortDirection, onSort: handleSort }
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle role="heading" aria-level={2} className="text-base lg:text-lg">전략 유형 비교</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {byType.length === 0 ? (
          <EmptyState variant="text" message="비교할 전략 데이터가 없습니다." />
        ) : (
          <>
            {/* 2xl에서는 사이클 성과 옆 반쪽 폭이라 셀 좌우 여백을 줄여 6열을 넣는다 */}
            <div className="hidden overflow-x-auto lg:block" role="region" aria-label="전략 유형 비교 표" tabIndex={0}>
              <table className="w-full text-sm 2xl:[&_td]:px-3 2xl:[&_th]:px-3">
                <thead className="bg-muted/50">
                  <tr>
                    <SortableHeadCell sortKey="type" {...head}>전략</SortableHeadCell>
                    <SortableHeadCell sortKey="cycles" numeric {...head}>사이클</SortableHeadCell>
                    <SortableHeadCell sortKey="avgReturnRate" numeric {...head}>평균 수익률</SortableHeadCell>
                    <SortableHeadCell sortKey="avgDurationDays" numeric {...head}>평균 소요일</SortableHeadCell>
                    {/* 의도적으로 KPI(실현손익·미실현 평가손익)보다 짧게 — 6열 표 폭 때문에 '미실현'과 같은 방식으로 줄인다 */}
                    <SortableHeadCell sortKey="realizedPnl" numeric {...head}>실현손익</SortableHeadCell>
                    <SortableHeadCell sortKey="unrealizedPnl" numeric {...head}>미실현</SortableHeadCell>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((t) => (
                    <tr key={t.type} className="border-t hover:bg-muted/30 transition-colors">
                      <TableDataCell>
                        <Badge tone="brand" size="md">
                          {labelOf('strategyTypes', t.type)}
                        </Badge>
                      </TableDataCell>
                      <TableDataCell className="text-right tabular-nums whitespace-nowrap text-muted-foreground">
                        종료 {t.closedCycleCount} · 진행 {t.activeCycleCount}
                      </TableDataCell>
                      <TableDataCell className={cn('text-right tabular-nums whitespace-nowrap', t.avgReturnRate != null && pnlTextClass(t.avgReturnRate))}>
                        {fmtSignedPercent(t.avgReturnRate)}
                      </TableDataCell>
                      <TableDataCell className="text-right tabular-nums whitespace-nowrap">{t.avgDurationDays != null ? `${t.avgDurationDays.toFixed(1)}일` : '-'}</TableDataCell>
                      <TableDataCell className={cn('text-right tabular-nums whitespace-nowrap font-medium', pnlTextClass(t.realizedPnl))}>{fmtSignedUsd(t.realizedPnl, 2, '$')}</TableDataCell>
                      <TableDataCell className={cn('text-right tabular-nums whitespace-nowrap font-medium', pnlTextClass(t.unrealizedPnl))}>{fmtSignedUsd(t.unrealizedPnl, 2, '$')}</TableDataCell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <MobileSortControl
              {...head}
              options={[
                { key: 'type', label: '전략' },
                { key: 'cycles', label: '사이클' },
                { key: 'avgReturnRate', label: '평균 수익률' },
                { key: 'avgDurationDays', label: '평균 소요일' },
                { key: 'realizedPnl', label: '실현손익' },
                { key: 'unrealizedPnl', label: '미실현' },
              ]}
            />
            <ul className="divide-y lg:hidden list-none p-0 m-0" aria-label="전략 유형 비교">
              {sorted.map((item) => (
                <li key={item.type} className="px-4 py-4">
                  <Badge tone="brand" size="md">
                    {labelOf('strategyTypes', item.type)}
                  </Badge>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">사이클</dt>
                      <dd className="mt-0.5 tabular-nums">
                        종료 {item.closedCycleCount} · 진행 {item.activeCycleCount}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">평균 수익률</dt>
                      <dd className={cn('mt-0.5 tabular-nums', item.avgReturnRate != null && pnlTextClass(item.avgReturnRate))}>
                        {fmtSignedPercent(item.avgReturnRate)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">평균 소요일</dt>
                      <dd className="mt-0.5 tabular-nums">{item.avgDurationDays != null ? `${item.avgDurationDays.toFixed(1)}일` : '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">실현손익</dt>
                      <dd className={cn('mt-0.5 font-medium tabular-nums', pnlTextClass(item.realizedPnl))}>{fmtSignedUsd(item.realizedPnl, 2, '$')}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">미실현</dt>
                      <dd className={cn('mt-0.5 font-medium tabular-nums', pnlTextClass(item.unrealizedPnl))}>{fmtSignedUsd(item.unrealizedPnl, 2, '$')}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  )
}
