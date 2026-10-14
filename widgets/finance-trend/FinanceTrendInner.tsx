'use client'

import { useMemo, useState } from 'react'
// 아래 FinanceTrend.tsx의 next/dynamic({ ssr: false }) 셸이 이 파일 자체를 지연 로드한다. 룰은 파일 간
// 도달 가능성을 보지 않고 recharts import를 정적으로만 감지해 분리 구조와 무관하게 항상 발화한다
// (widgets/asset-trend/AssetTrendInner.tsx 등 기존 recharts 위젯과 동일한 처리).
// eslint-disable-next-line react-doctor/prefer-dynamic-import
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionError } from '@shared/ui/SectionError'
import { fmtKrw } from '@shared/lib/format'
import { useAmountHiddenPreference } from '@shared/lib/hooks/use-amount-hidden'
import { calcFlowTrend, filterByType, flowCategoryColor, sortCategoryTree } from '@entities/finance'
import type { CategoryIndex, FinanceCategory, FinanceCategoryType, FinanceTransaction, Period, TrendRange } from '@entities/finance'
import { AXIS_TICK } from '@shared/lib/chart/axisTick'

// Y축 눈금 전용 — fmtKrw는 "1,000,000원" 같은 긴 문자열이라 좁은 축 폭에 맞지 않는다.
// 만원 단위로 축약해 표시하고, 정확한 금액은 Tooltip의 fmtKrw로 보여준다.
function fmtKrwAxisTick(value: number): string {
  return `${Math.round(value / 10_000).toLocaleString('ko-KR')}만`
}

interface Props {
  type: FinanceCategoryType
  transactions: FinanceTransaction[]
  range: TrendRange
  categoryTree: FinanceCategory[]
  index: CategoryIndex
  period: Period
  isLoading: boolean
  isError: boolean
  today: string
}

export default function FinanceTrendInner({ type, transactions, range, categoryTree, index, period, isLoading, isError, today }: Props) {
  const [byCategory, setByCategory] = useState(false)
  const { maskIfHidden } = useAmountHiddenPreference()

  const typeTransactions = useMemo(() => filterByType(transactions, index, type), [transactions, index, type])
  const trend = useMemo(
    () => calcFlowTrend(typeTransactions, index, period, today, range),
    [typeTransactions, index, period, today, range],
  )
  const orderedRootIds = useMemo(() => sortCategoryTree(categoryTree).map((c) => c.id), [categoryTree])

  if (isLoading) {
    return <Skeleton className="min-h-[240px] sm:min-h-[280px]" />
  }
  if (isError) {
    return <SectionError message="추이를 불러오지 못했습니다" />
  }

  const hasData = trend.some((point) => point.amount !== 0)

  return (
    <div className="flex flex-1 flex-col gap-3">
      {!hasData ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">표시할 추이 데이터가 없습니다</p>
        </div>
      ) : (
        <>
          <div className="flex justify-end">
            <button
              type="button"
              aria-pressed={byCategory}
              onClick={() => setByCategory((v) => !v)}
              className="rounded px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent aria-pressed:bg-[var(--brand-fg-soft)] aria-pressed:text-[var(--background)]"
            >
              카테고리별 보기
            </button>
          </div>
          <div className="min-h-[240px] w-full flex-1 sm:min-h-[280px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
              <LineChart data={trend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} title={period.mode === 'yearly' ? '연도별 추이' : '월별 추이'}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="period" tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} tickFormatter={fmtKrwAxisTick} domain={['auto', 'auto']} />
                {/* hover 가독성 — AssetTrendInner와 동일한 가이드선·강조 점·툴팁 스타일. 카테고리별 보기에선
                    항목 색으로 계열을 구분하므로 itemStyle에 color를 고정하지 않는다. */}
                <Tooltip
                  formatter={(value, name) => [maskIfHidden(fmtKrw(Number(value))), name]}
                  cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1, strokeDasharray: '4 4' }}
                  contentStyle={{
                    fontSize: 14,
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    color: 'var(--foreground)',
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
