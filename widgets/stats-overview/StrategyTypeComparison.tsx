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

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'type', label: '전략' },
  { key: 'cycles', label: '사이클' },
  { key: 'avgReturnRate', label: '수익률' },
  { key: 'avgDurationDays', label: '소요일' },
  { key: 'realizedPnl', label: '실현손익' },
  { key: 'unrealizedPnl', label: '미실현' },
]

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
        {/* 모바일 정렬 컨트롤은 제목 오른쪽에 둔다 — 목록 위에 따로 두면 제목과 사이가 떠 보인다 */}
        <div className="flex items-center justify-between gap-2">
          <CardTitle role="heading" aria-level={2} className="text-base lg:text-lg">전략 유형 비교</CardTitle>
          {byType.length > 0 && <MobileSortControl {...head} options={SORT_OPTIONS} className="p-0" />}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {byType.length === 0 ? (
          <EmptyState variant="text" message="비교할 전략 데이터가 없습니다." />
        ) : (
          <>
            {/* 2xl에서는 사이클 성과 옆 반쪽 폭이라 셀 좌우 여백을 줄여 6열을 넣는다 */}
            <div className="hidden overflow-x-auto lg:block" role="region" aria-label="전략 유형 비교 표" tabIndex={0}>
              <table className="w-full text-sm 2xl:[&_td]:px-2 2xl:[&_th]:px-2">
                <thead className="bg-muted/50">
                  <tr>
                    <SortableHeadCell sortKey="type" {...head}>전략</SortableHeadCell>
                    <SortableHeadCell sortKey="cycles" numeric {...head}>사이클</SortableHeadCell>
                    <SortableHeadCell sortKey="avgReturnRate" numeric {...head}>수익률</SortableHeadCell>
                    <SortableHeadCell sortKey="avgDurationDays" numeric {...head}>소요일</SortableHeadCell>
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
                      <dt className="text-xs text-muted-foreground">수익률</dt>
                      <dd className={cn('mt-0.5 tabular-nums', item.avgReturnRate != null && pnlTextClass(item.avgReturnRate))}>
                        {fmtSignedPercent(item.avgReturnRate)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">소요일</dt>
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
            {/* 6열 헤더에 넣으면 2xl 반쪽 폭에서 잘려 표 아래 보조문구로 둔다 */}
            <p className="border-t px-4 py-3 text-xs text-muted-foreground">
              수익률은 종료 사이클별 수익률의 단순평균입니다(진행 중 매도분 제외). 사이클 중 추가·인출이 분모에 들어가 추가금은 수익률을 희석하고, VR은 롤오버 주기 구간을 사이클 하나로 셉니다.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
