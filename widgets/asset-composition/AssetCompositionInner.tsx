'use client'

// 아래 AssetComposition.tsx의 next/dynamic({ ssr: false }) 셸이 이 파일 자체를 지연 로드한다. 룰은 파일 간
// 도달 가능성을 보지 않고 recharts import를 정적으로만 감지해 분리 구조와 무관하게 항상 발화한다
// (EquityCurveChart.tsx 등 기존 recharts 위젯과 동일한 처리).
// eslint-disable-next-line react-doctor/prefer-dynamic-import
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import {
  ASSET_CLASS_ORDER,
  ASSET_L1_CATEGORY_IDS,
  assetCategoryColor,
  assetClassColor,
  calcAssetClassComposition,
  calcCategoryComposition,
  formatAssetL1CategoryLabel,
  useAssetSnapshotsQuery,
  type AssetClass,
  type CompositionColumn,
} from '@entities/finance'
import { useMeta } from '@entities/meta'
import { fmtKrw } from '@shared/lib/format'
import { SectionError } from '@shared/ui/SectionError'

// Tailwind `sm` 브레이크포인트(640px)와 동일 기준 — globals.css 변경 시 함께 맞출 것.
const MOBILE_BREAKPOINT_PX = 640

function amountKey(item: string): string {
  return `${item}__amount`
}

function amountFromPayload(payload: unknown, item: string): number | undefined {
  if (!payload || typeof payload !== 'object') return undefined
  const value = (payload as Record<string, unknown>)[amountKey(item)]
  return typeof value === 'number' ? value : undefined
}

// monthsLimit(기본 6)은 "최근 기록이 있는 달" 기준이라 기록이 뜸하면 연도를 건너뛸 수 있다
// (예: 2025-03, 2026-03만 기록이 있는 경우) — 연도 없이 "3월"만 쓰면 두 달이 같은 눈금으로 보인다.
function formatMonthLabel(month: string): string {
  const [year, monthPart] = month.split('-')
  const parsedMonth = Number(monthPart)
  if (!year || Number.isNaN(parsedMonth)) return month
  return `${year.slice(2)}.${parsedMonth}월`
}

function toChartRows(columns: CompositionColumn[]): Record<string, string | number>[] {
  return columns.map((column) => {
    const row: Record<string, string | number> = { month: column.month }
    for (const entry of column.entries) {
      row[entry.item] = entry.percent
      row[amountKey(entry.item)] = entry.amount
    }
    return row
  })
}

// 실제로 금액이 잡힌 자산군만 세그먼트로 노출한다. AssetClass는 서버 enum(닫힌 6값)이라
// ASSET_CLASS_ORDER 고정 순서에서 등장한 것만 걸러내면 된다 — 자유 입력이던 시절의
// "미등록 값 뒤에 이어붙이기" 방어는 더 이상 필요 없다.
function collectPresentSegments(columns: CompositionColumn[]): string[] {
  const present = new Set<string>()
  for (const column of columns) {
    for (const entry of column.entries) {
      if (entry.amount > 0) present.add(entry.item)
    }
  }
  return ASSET_CLASS_ORDER.filter((item) => present.has(item))
}

interface CompositionChartProps {
  title: string
  columns: CompositionColumn[]
  segments: string[]
  labelFor: (item: string) => string
  colorFor: (item: string) => string
}

function CompositionChart({ title, columns, segments, labelFor, colorFor }: CompositionChartProps) {
  const rows = toChartRows(columns)

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      {columns.length === 0 ? (
        <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground sm:h-[280px]">
          표시할 구성비 데이터가 없습니다
        </div>
      ) : (
        <>
          <div className="h-[240px] w-full sm:h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="month"
                  tickFormatter={formatMonthLabel}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={16}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                  domain={[0, 100]}
                  tickFormatter={(value: number) => `${value}%`}
                />
                <Tooltip
                  cursor={{ fill: 'var(--muted)' }}
                  labelFormatter={(label) => formatMonthLabel(String(label))}
                  formatter={(value, name, item) => {
                    const percent = typeof value === 'number' ? value.toFixed(1) : String(value)
                    const isMobile = typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT_PX
                    const amount = isMobile ? undefined : amountFromPayload(item?.payload, String(name))
                    const amountLabel = typeof amount === 'number' ? ` (${fmtKrw(amount)})` : ''
                    return [`${percent}%${amountLabel}`, labelFor(String(name))]
                  }}
                  contentStyle={{
                    fontSize: 12,
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    color: 'var(--foreground)',
                    borderRadius: 6,
                  }}
                />
                {segments.map((segment) => (
                  <Bar
                    key={segment}
                    dataKey={segment}
                    name={segment}
                    stackId="composition"
                    fill={colorFor(segment)}
                    animationDuration={500}
                    animationEasing="ease-out"
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            {segments.map((segment) => (
              <span key={segment} className="flex items-center gap-1.5">
                <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: colorFor(segment) }} />
                {labelFor(segment)}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function AssetCompositionInner() {
  const { data: snapshots = [], isLoading, isError } = useAssetSnapshotsQuery()
  const { labelOf } = useMeta()

  if (isLoading) {
    return <p className="py-10 text-center text-sm text-muted-foreground">불러오는 중…</p>
  }

  if (isError) {
    return <SectionError message="구성비 데이터를 불러오지 못했습니다" />
  }

  const categoryColumns = calcCategoryComposition(snapshots)
  const assetClassColumns = calcAssetClassComposition(snapshots)
  const assetClassSegments = collectPresentSegments(assetClassColumns)

  return (
    <div className="flex flex-col gap-6">
      <CompositionChart
        title="카테고리별 구성비"
        columns={categoryColumns}
        segments={ASSET_L1_CATEGORY_IDS}
        labelFor={formatAssetL1CategoryLabel}
        colorFor={assetCategoryColor}
      />
      <CompositionChart
        title="자산군별 구성비"
        columns={assetClassColumns}
        segments={assetClassSegments}
        labelFor={(item) => labelOf('assetClasses', item)}
        colorFor={(item) => assetClassColor(item as AssetClass)}
      />
    </div>
  )
}
