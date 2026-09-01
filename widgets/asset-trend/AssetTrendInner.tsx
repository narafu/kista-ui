'use client'

import { useMemo, useState } from 'react'
// 아래 AssetTrend.tsx의 next/dynamic({ ssr: false }) 셸이 이 파일 자체를 지연 로드한다. 룰은 파일 간
// 도달 가능성을 보지 않고 recharts import를 정적으로만 감지해 분리 구조와 무관하게 항상 발화한다
// (EquityCurveChart.tsx 등 기존 recharts 위젯과 동일한 처리).
// eslint-disable-next-line react-doctor/prefer-dynamic-import
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SectionError } from '@shared/ui/SectionError'
import { cn } from '@shared/lib/utils'
import { fmtKrw } from '@shared/lib/format'
import { useMeta } from '@entities/meta'
import {
  ASSET_CLASS_ORDER,
  ASSET_L1_CATEGORY_IDS,
  calcMonthlyTrend,
  formatAssetL1CategoryLabel,
  useAssetSnapshotsQuery,
} from '@entities/finance'
import type { TrendMode } from '@entities/finance'

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

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex min-h-9 w-full items-center justify-center rounded px-2 py-1 text-xs font-medium transition-colors',
        active
          ? 'bg-[var(--brand-fg-soft)] text-[var(--background)]'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent',
      )}
    >
      {children}
    </button>
  )
}

export default function AssetTrendInner() {
  const { data: snapshots = [], isLoading, isError } = useAssetSnapshotsQuery()
  const { labelOf } = useMeta()
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

  const trend = useMemo(() => calcMonthlyTrend(snapshots, mode, effectiveSelector), [snapshots, mode, effectiveSelector])

  if (isLoading) {
    return <div className="flex min-h-[240px] flex-1 items-center justify-center text-sm text-muted-foreground sm:min-h-[280px]">불러오는 중…</div>
  }
  if (isError) {
    return <SectionError message="자산 추이를 불러오지 못했습니다" />
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid w-full grid-cols-3 rounded-md border border-border p-0.5 sm:w-64">
          {MODE_OPTIONS.map((option) => (
            <ModeButton key={option.value} active={mode === option.value} onClick={() => setMode(option.value)}>
              {option.label}
            </ModeButton>
          ))}
        </div>
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
            <LineChart data={trend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={44} tickFormatter={fmtKrwAxisTick} domain={['auto', 'auto']} />
              <Tooltip
                formatter={(value) => [fmtKrw(Number(value)), '금액']}
                contentStyle={{
                  fontSize: 12,
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  color: 'var(--foreground)',
                  borderRadius: 6,
                }}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="var(--chart-1)"
                strokeWidth={2.5}
                dot={false}
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
