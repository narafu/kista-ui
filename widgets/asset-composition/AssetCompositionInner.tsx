'use client'

// 아래 AssetComposition.tsx의 next/dynamic({ ssr: false }) 셸이 이 파일 자체를 지연 로드한다. 룰은 파일 간
// 도달 가능성을 보지 않고 recharts import를 정적으로만 감지해 분리 구조와 무관하게 항상 발화한다
// (EquityCurveChart.tsx 등 기존 recharts 위젯과 동일한 처리).
// eslint-disable-next-line react-doctor/prefer-dynamic-import
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import {
  ASSET_CATEGORIES,
  KNOWN_ASSET_CLASSES,
  assetCategoryColor,
  assetClassColorMap,
  calcAssetClassComposition,
  calcCategoryComposition,
  useAssetsQuery,
  type AssetCategory,
  type CompositionColumn,
} from '@entities/asset'
import { formatAssetCategoryLabel } from '@shared/lib/api-schema'
import { fmtKrw } from '@shared/lib/format'
import { SectionError } from '@shared/ui/SectionError'

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

// 실제로 금액이 잡힌 자산군만 세그먼트로 노출한다 — KNOWN_ASSET_CLASSES만으로 필터링하면
// calcAssetClassComposition이 이미 포함시킨 자유 입력 자산군이 세그먼트/범례에서 다시 빠진다.
// 알려진 순서를 먼저 두고, 데이터에만 있는 항목은 등장한 순서대로 뒤에 이어붙인다.
function collectPresentSegments(columns: CompositionColumn[]): string[] {
  const order = [...KNOWN_ASSET_CLASSES]
  const present = new Set<string>()
  for (const column of columns) {
    for (const entry of column.entries) {
      if (entry.amount <= 0) continue
      present.add(entry.item)
      if (!order.includes(entry.item)) order.push(entry.item)
    }
  }
  return order.filter((item) => present.has(item))
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
                    const amount = amountFromPayload(item?.payload, String(name))
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
  const { data: assets = [], isLoading, isError } = useAssetsQuery()

  if (isLoading) {
    return <p className="py-10 text-center text-sm text-muted-foreground">불러오는 중…</p>
  }

  if (isError) {
    return <SectionError message="구성비 데이터를 불러오지 못했습니다" />
  }

  const categoryColumns = calcCategoryComposition(assets)
  const assetClassColumns = calcAssetClassComposition(assets)
  const assetClassSegments = collectPresentSegments(assetClassColumns)
  // useMemo가 아니라 일반 함수 호출이다 — isLoading/isError early return 뒤라 hook을 여기 두면
  // Rules of Hooks 위반(hook 호출 개수가 렌더마다 달라짐)이 된다. assetClassColorMap 자체는
  // 훅이 아닌 순수 함수라 조건부 호출이 안전하다.
  const assetClassColor = assetClassColorMap(assets)

  return (
    <div className="flex flex-col gap-6">
      <CompositionChart
        title="카테고리별 구성비"
        columns={categoryColumns}
        segments={ASSET_CATEGORIES}
        labelFor={formatAssetCategoryLabel}
        colorFor={(item) => assetCategoryColor(item as AssetCategory)}
      />
      <CompositionChart
        title="자산군별 구성비"
        columns={assetClassColumns}
        segments={assetClassSegments}
        labelFor={(item) => item}
        colorFor={assetClassColor}
      />
    </div>
  )
}
