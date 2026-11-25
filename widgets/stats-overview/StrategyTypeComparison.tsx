import { Surface } from '@shared/ui/Surface'
import { SectionTitle } from '@shared/ui/SectionTitle'
import { MobileSortControl } from '@shared/ui/MobileSortControl'
import { DataList, useDataListSort, type DataListColumn } from '@shared/ui/data-list/DataList'
import { Badge } from '@shared/ui/Badge'
import { fmtSignedMoney, pnlTextClass, fmtSignedPercent, roundMoney, fmtDecimal } from '@shared/lib/format'
import type { Currency } from '@shared/lib/api-schema'
import type { StrategyTypeStats } from '@entities/stats'
import { useMeta } from '@entities/meta'

interface Props {
  byType: StrategyTypeStats[]
  currency: Currency
}

export function StrategyTypeComparison({ byType, currency }: Props) {
  const { labelOf } = useMeta()
  const columns: DataListColumn<StrategyTypeStats>[] = [
    {
      key: 'type',
      header: '전략',
      mobile: 'title',
      sortBy: (t) => labelOf('strategyTypes', t.type),
      cell: (t) => <Badge tone="brand" size="md">{labelOf('strategyTypes', t.type)}</Badge>,
    },
    {
      key: 'cycles',
      header: '사이클',
      numeric: true,
      className: 'text-muted-foreground',
      sortBy: (t) => t.closedCycleCount + t.activeCycleCount,
      cell: (t) => `종료 ${t.closedCycleCount} · 진행 ${t.activeCycleCount}`,
    },
    {
      key: 'avgReturnRate',
      header: '수익률',
      numeric: true,
      className: (t) => t.avgReturnRate != null && pnlTextClass(t.avgReturnRate),
      sortBy: (t) => t.avgReturnRate,
      cell: (t) => fmtSignedPercent(t.avgReturnRate),
    },
    {
      key: 'avgDurationDays',
      header: '소요일',
      numeric: true,
      sortBy: (t) => t.avgDurationDays,
      cell: (t) => (t.avgDurationDays != null ? `${fmtDecimal(t.avgDurationDays, 1)}일` : '-'),
    },
    // 의도적으로 KPI(실현손익·미실현 평가손익)보다 짧게 — 6열 표 폭 때문에 '미실현'과 같은 방식으로 줄인다
    {
      key: 'realizedPnl',
      header: '실현손익',
      numeric: true,
      className: (t) => `font-medium ${pnlTextClass(roundMoney(t.realizedPnl, currency))}`,
      sortBy: (t) => t.realizedPnl,
      cell: (t) => fmtSignedMoney(t.realizedPnl, currency),
    },
    {
      key: 'unrealizedPnl',
      header: '미실현',
      numeric: true,
      className: (t) => `font-medium ${pnlTextClass(roundMoney(t.unrealizedPnl, currency))}`,
      sortBy: (t) => t.unrealizedPnl,
      cell: (t) => fmtSignedMoney(t.unrealizedPnl, currency),
    },
  ]
  const sort = useDataListSort(byType, columns)

  return (
    <Surface size="flush" className="flex flex-col gap-4 overflow-hidden py-4 text-sm">
      <div className="px-4 pb-3">
        {/* 모바일 정렬 컨트롤은 제목 오른쪽에 둔다 — 목록 위에 따로 두면 제목과 사이가 떠 보인다 */}
        <div className="flex items-center justify-between gap-2">
          <SectionTitle>전략 유형 비교</SectionTitle>
          {byType.length > 0 && <MobileSortControl {...sort.control} className="p-0" />}
        </div>
      </div>
      <div>
        {/* 2xl에서는 사이클 성과 옆 반쪽 폭이라 셀 좌우 여백을 줄여 6열을 넣는다 */}
        <DataList
          label="전략 유형 비교"
          rows={sort.rows}
          columns={columns}
          rowKey={(t) => t.type}
          sort={sort.control}
          empty="비교할 전략 데이터가 없습니다."
          tableClassName="2xl:[&_td]:px-2 2xl:[&_th]:px-2"
        />
        {/* 6열 헤더에 넣으면 2xl 반쪽 폭에서 잘려 표 아래 보조문구로 둔다 */}
        {byType.length > 0 && (
          <p className="border-t px-4 py-3 text-xs text-muted-foreground">
            수익률은 종료 사이클별 수익률의 단순평균입니다(진행 중 매도분 제외). 사이클 중 추가·인출이 분모에 들어가 추가금은 수익률을 희석하고, VR은 롤오버 주기 구간을 사이클 하나로 셉니다.
          </p>
        )}
      </div>
    </Surface>
  )
}
