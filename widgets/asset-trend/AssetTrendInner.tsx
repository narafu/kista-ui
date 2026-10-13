'use client'

import { useMemo, useState } from 'react'
// 아래 AssetTrend.tsx의 next/dynamic({ ssr: false }) 셸이 이 파일 자체를 지연 로드한다. 룰은 파일 간
// 도달 가능성을 보지 않고 recharts import를 정적으로만 감지해 분리 구조와 무관하게 항상 발화한다
// (EquityCurveChart.tsx 등 기존 recharts 위젯과 동일한 처리).
// eslint-disable-next-line react-doctor/prefer-dynamic-import
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionError } from '@shared/ui/SectionError'
import { SegmentedToggle } from '@shared/ui/SegmentedToggle'
import { fmtKrw } from '@shared/lib/format'
import { useAmountHiddenPreference } from '@shared/lib/hooks/use-amount-hidden'
import { useMeta } from '@entities/meta'
import {
  ASSET_CLASS_ORDER,
  ASSET_L1_CATEGORY_IDS,
  calcMonthlyTrend,
  formatAssetL1CategoryLabel,
  useAssetSnapshotsQuery,
} from '@entities/finance'
import type { TrendMode, TrendRange } from '@entities/finance'

// Y축 눈금 전용 — fmtKrw는 "1,000,000원" 같은 긴 문자열이라 좁은 축 폭에 맞지 않는다.
// 만원 단위로 축약해 표시하고, 정확한 금액은 Tooltip의 fmtKrw로 보여준다.
function fmtKrwAxisTick(value: number): string {
  return `${Math.round(value / 10_000).toLocaleString('ko-KR')}만`
}

const MODE_OPTIONS: { value: TrendMode; label: string }[] = [
  { value: 'netWorth', label: '순자산' },
  { value: 'category', label: '카테고리별' },
  { value: 'assetClass', label: '자산군별' },
]

interface Props {
  month?: string
  range?: TrendRange
}

export default function AssetTrendInner({ month, range = 12 }: Props) {
  const { data: snapshots = [], isLoading, isError } = useAssetSnapshotsQuery()
  const { labelOf } = useMeta()
  const { maskIfHidden } = useAmountHiddenPreference()
  const [mode, setMode] = useState<TrendMode>('netWorth')
  const [pickedSelector, setPickedSelector] = useState<string | null>(null)

  const selectorOptions = mode === 'category' ? ASSET_L1_CATEGORY_IDS : mode === 'assetClass' ? ASSET_CLASS_ORDER : []

  // 명시적으로 고른 값이 현재 모드의 선택지에 없으면(모드 전환 등) 첫 번째 선택지로 폴백한다.
  // useEffect로 state를 동기화하지 않고 렌더 중 파생값으로 계산한다.
  const effectiveSelector =
    mode === 'netWorth' ? null : pickedSelector && selectorOptions.includes(pickedSelector) ? pickedSelector : (selectorOptions[0] ?? null)

  const selectorItems = selectorOptions.map((option) => ({
    value: option,
    label: mode === 'category' ? formatAssetL1CategoryLabel(option) : labelOf('assetClasses', option),
  }))

  const trend = useMemo(
    () => calcMonthlyTrend(snapshots, mode, effectiveSelector, range === 'all' ? Infinity : range, month),
    [snapshots, mode, effectiveSelector, range, month],
  )

  if (isLoading) {
    return <Skeleton data-testid="asset-trend-skeleton" className="min-h-[240px] sm:min-h-[280px]" />
  }
  if (isError) {
    return <SectionError message="자산 추이를 불러오지 못했습니다" />
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedToggle
          aria-label="추이 기준"
          options={MODE_OPTIONS}
          value={mode}
          onChange={setMode}
          className="grid w-full grid-cols-3 sm:w-64"
        />
        {mode !== 'netWorth' && selectorItems.length > 0 && (
          <Select
            items={selectorItems}
            value={effectiveSelector}
            onValueChange={(value) => { if (value) setPickedSelector(value) }}
          >
            <SelectTrigger aria-label={mode === 'category' ? '카테고리' : '자산군'} className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {selectorItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {trend.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">표시할 추이 데이터가 없습니다</p>
        </div>
      ) : (
        <div className="min-h-[240px] w-full flex-1 sm:min-h-[280px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
            <LineChart data={trend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} title="월별 추이">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={44} tickFormatter={fmtKrwAxisTick} domain={['auto', 'auto']} />
              {/* hover 가독성 — 세로 가이드선 + 강조 점 + 큰 금액 글씨로 어느 달의 값인지 바로 읽히게 한다 */}
              <Tooltip
                formatter={(value, name) => [maskIfHidden(fmtKrw(Number(value))), name]}
                // recharts 기본 정렬(name)은 "순자산"을 "총자산"보다 먼저 보여준다 — 그래프 위아래 순서와 맞추려고 금액 내림차순 정렬
                itemSorter={(item) => -Number(item.value)}
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
                itemStyle={{ fontWeight: 600, color: 'var(--foreground)' }}
              />
              {mode === 'netWorth' && <Legend wrapperStyle={{ fontSize: 11 }} />}
              {mode === 'netWorth' && (
                <Line
                  type="monotone"
                  dataKey="totalAssets"
                  name="총자산"
                  stroke="var(--muted-foreground)"
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  dot={false}
                  activeDot={{ r: 4, stroke: 'var(--card)', strokeWidth: 2, fill: 'var(--muted-foreground)' }}
                  animationDuration={500}
                  animationEasing="ease-out"
                />
              )}
              <Line
                type="monotone"
                dataKey="amount"
                name={mode === 'netWorth' ? '순자산' : '금액'}
                stroke="var(--chart-1)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 6, stroke: 'var(--card)', strokeWidth: 2, fill: 'var(--chart-1)' }}
                animationDuration={500}
                animationEasing="ease-out"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
