'use client'

import { useMemo, useState } from 'react'
// 아래 FinanceTrend.tsx의 next/dynamic({ ssr: false }) 셸이 이 파일 자체를 지연 로드한다. 룰은 파일 간
// 도달 가능성을 보지 않고 recharts import를 정적으로만 감지해 분리 구조와 무관하게 항상 발화한다
// (widgets/asset-trend/AssetTrendInner.tsx 등 기존 recharts 위젯과 동일한 처리).
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionError } from '@shared/ui/SectionError'
import { fmtKrw, fmtKrwAxisTick, fmtShortYearMonth } from '@shared/lib/format'
import { SegmentedToggle } from '@shared/ui/SegmentedToggle'
import { useAmountHiddenPreference } from '@shared/lib/hooks/use-amount-hidden'
import { flowCategoryColor, sortCategoryTree, useFlowTrendQuery } from '@entities/finance'
import type { CategoryIndex, FinanceCategory, FinanceCategoryType, Period, TrendRange } from '@entities/finance'
import { AXIS_TICK } from '@shared/lib/chart/axisTick'
import { TOOLTIP_CONTENT_STYLE } from '@shared/lib/chart/tooltip'

const SERIES_OPTIONS: { value: 'total' | 'category'; label: string }[] = [
  { value: 'total', label: '합계' },
  { value: 'category', label: '카테고리별' },
]

interface Props {
  type: FinanceCategoryType
  range: TrendRange
  categoryTree: FinanceCategory[]
  index: CategoryIndex
  period: Period
  isLoading: boolean
}

export default function FinanceTrendInner({ type, range, categoryTree, index, period, isLoading }: Props) {
  const [byCategory, setByCategory] = useState(false)
  const { maskIfHidden } = useAmountHiddenPreference()

  // 월간은 월별, 연간은 연도별 버킷(range 'all'이면 가장 오래된 거래부터). byCategory는 루트별 합 배열이라
  // 라인 dataKey가 바로 찾도록 rootId → 합계 맵으로 바꿔 둔다.
  const trendQuery = useFlowTrendQuery(type, period, range, { enabled: !isLoading })
  const trend = useMemo(
    () => (trendQuery.data?.points ?? []).map((point) => ({
      period: point.period,
      amount: point.amount,
      byCategory: Object.fromEntries(point.byCategory.map((entry) => [entry.categoryId, entry.amount])) as Record<string, number>,
    })),
    [trendQuery.data],
  )
  const orderedRootIds = useMemo(() => sortCategoryTree(categoryTree).map((c) => c.id), [categoryTree])

  if (isLoading || trendQuery.isLoading) {
    return <Skeleton className="min-h-[240px] sm:min-h-[280px]" />
  }
  if (!trendQuery.data) {
    return <SectionError message="추이를 불러오지 못했습니다." />
  }

  const hasData = trend.some((point) => point.amount !== 0)
  const stale = trendQuery.isPlaceholderData

  return (
    <div className="flex flex-1 flex-col gap-3">
      {!hasData ? (
        <div aria-busy={stale} className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">표시할 추이 데이터가 없습니다.</p>
        </div>
      ) : (
        <>
          <div className="flex justify-end">
            <SegmentedToggle
              aria-label="추이 표시 방식"
              options={SERIES_OPTIONS}
              value={byCategory ? 'category' : 'total'}
              onChange={(value) => setByCategory(value === 'category')}
            />
          </div>
          <div aria-busy={stale} className="min-h-[240px] w-full flex-1 sm:min-h-[280px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
              <LineChart data={trend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} title={period.mode === 'yearly' ? '연도별 추이' : '월별 추이'}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="period" tickFormatter={fmtShortYearMonth} tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} tickFormatter={fmtKrwAxisTick} domain={['auto', 'auto']} />
                {/* hover 가독성 — AssetTrendInner와 동일한 가이드선·강조 점·툴팁 스타일. 카테고리별 보기의
                    계열 구분은 globals.css의 툴팁 항목 색 점이 맡는다. */}
                <Tooltip
                  formatter={(value, name) => [maskIfHidden(fmtKrw(Number(value))), name]}
                  labelFormatter={(label) => fmtShortYearMonth(String(label))}
                  cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1, strokeDasharray: '4 4' }}
                  contentStyle={{
                    ...TOOLTIP_CONTENT_STYLE,
                    fontSize: 14,
                    borderRadius: 8,
                    padding: '8px 12px',
                    boxShadow: '0 4px 12px rgb(0 0 0 / 0.12)',
                  }}
                  labelStyle={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 2 }}
                  itemStyle={{ fontWeight: 600 }}
                />
                {byCategory && <Legend wrapperStyle={{ fontSize: 11, color: 'var(--muted-foreground)' }} />}
                <Line
                  type="monotone"
                  dataKey="amount"
                  name="합계"
                  stroke="var(--chart-1)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 6, stroke: 'var(--card)', strokeWidth: 2, fill: 'var(--chart-1)' }}
                  animationDuration={500}
                  animationEasing="ease-out"
                />
                {byCategory && orderedRootIds.map((rootId) => (
                  <Line
                    key={rootId}
                    type="monotone"
                    dataKey={(point: (typeof trend)[number]) => point.byCategory[rootId] ?? 0}
                    name={index.get(rootId)?.name ?? rootId}
                    stroke={flowCategoryColor(orderedRootIds, rootId)}
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 4, stroke: 'var(--card)', strokeWidth: 2, fill: flowCategoryColor(orderedRootIds, rootId) }}
                    animationDuration={500}
                    animationEasing="ease-out"
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}
