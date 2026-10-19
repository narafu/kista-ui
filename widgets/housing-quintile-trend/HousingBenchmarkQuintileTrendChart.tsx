'use client'

import { AXIS_TICK } from '@shared/lib/chart/axisTick'
import { TOOLTIP_CONTENT_STYLE } from '@shared/lib/chart/tooltip'
import { useMemo, useState } from 'react'
// eslint-disable-next-line react-doctor/prefer-dynamic-import
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DEFAULT_HOUSING_REGION_CODE,
  DEFAULT_HOUSING_REGION_NAME,
  useHousingBenchmarkRegionsQuery,
  useHousingBenchmarkSeriesQuery,
} from '@entities/stats'
import type { HousingBenchmarkRegion } from '@entities/stats'
import { EmptyState } from '@shared/ui/EmptyState'
import { SectionError } from '@shared/ui/SectionError'
import { fmtDate, fmtKrwEok, pnlTextClass } from '@shared/lib/format'
import { cn, toSelectValue } from '@shared/lib/utils'
import {
  calculateQuintileCagr,
  formatHousingBenchmarkAxisMonth,
  formatHousingBenchmarkMonth,
  formatCagr,
} from '@entities/stats'

interface Props {
  enabled: boolean
  from?: string
  to?: string
  onRegionChange?: (region: HousingBenchmarkRegion) => void
}

// KB Land 지역 목록 조회가 실패했을 때만 사용하는 최소 fallback — 하드코딩 목록 아님
const SEOUL_FALLBACK_REGION = { code: DEFAULT_HOUSING_REGION_CODE, name: DEFAULT_HOUSING_REGION_NAME }

// "가격 추이" 비교지역은 서울/수도권/전국 3개로만 제한 — KB Land가 내려주는 전체 지역 목록 중 일부만 노출
const ALLOWED_REGION_NAMES = ['서울', '수도권', '전국'] as const

// 5분위는 가격 순위상 항상 5>4>3>2>1 순서로 그려져 세로 위치만으로도 순서가 구분되므로,
// 색상은 순서 표현보다 인접한 5개 선을 서로 뚜렷이 구분하는 역할에 집중한다.
// 웜톤 그러데이션(--quintile-1~5, globals.css)이되 인접 색상 CVD 대비(ΔE)를 검증해 선정했다
const QUINTILE_SERIES = [
  { dataKey: 'firstQuintilePrice', color: 'var(--quintile-1)', label: '1분위' },
  { dataKey: 'secondQuintilePrice', color: 'var(--quintile-2)', label: '2분위' },
  { dataKey: 'thirdQuintilePrice', color: 'var(--quintile-3)', label: '3분위' },
  { dataKey: 'fourthQuintilePrice', color: 'var(--quintile-4)', label: '4분위' },
  { dataKey: 'fifthQuintilePrice', color: 'var(--quintile-5)', label: '5분위' },
] as const

function TrendLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="아파트 5분위 가격 추이 불러오는 중"
    >
      <Skeleton data-testid="housing-benchmark-quintile-trend-skeleton" className="min-h-[240px] sm:min-h-[300px]" />
    </div>
  )
}

export function HousingBenchmarkQuintileTrendChart({ enabled, from, to, onRegionChange }: Props) {
  const [regionCode, setRegionCode] = useState(DEFAULT_HOUSING_REGION_CODE)
  const regionsQuery = useHousingBenchmarkRegionsQuery(enabled)
  const regions = useMemo(() => {
    const fetchedRegions = regionsQuery.data?.regions ?? []
    const allowed = ALLOWED_REGION_NAMES
      .map((name) => fetchedRegions.find((region) => region.name === name))
      .filter((region): region is HousingBenchmarkRegion => region != null)
    return allowed.length > 0 ? allowed : [SEOUL_FALLBACK_REGION]
  }, [regionsQuery.data])
  // code는 생성 타입상 optional — 코드 없는 지역은 선택지에서 뺀다
  const regionItems = regions.flatMap((region) => (region.code ? [{ value: region.code, label: region.name ?? region.code }] : []))
  const selectedRegion = regions.find((region) => region.code === regionCode) ?? regions[0]
  const regionLabel = selectedRegion.name

  // 상단 "비교 기간" 토글과 동일한 from/to로 조회 — 추이 차트만 별도 기간을 쓰지 않는다
  const query = useHousingBenchmarkSeriesQuery({ from, to, regionCode }, enabled)
  const data = query.data
  const points = useMemo(() => data?.points ?? [], [data])

  // 현재 조회 기간(상단 "비교 기간" 토글) 첫·마지막 시점 기준 연평균 상승률(CAGR) — 범례 배지용
  const quintileCagrs = useMemo(
    () => new Map(QUINTILE_SERIES.map((series) => [series.dataKey, calculateQuintileCagr(points, series.dataKey)])),
    [points],
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3">
          <div>
            <CardTitle role="heading" aria-level={2} className="flex flex-wrap items-center gap-1.5 text-base lg:text-lg">
              <Select
                items={regionItems}
                value={toSelectValue(regionItems, regionCode)}
                onValueChange={(code) => {
                  if (!code) return
                  setRegionCode(code)
                  // 상위 기본값(서울)과 초기 선택이 같아 마운트 시 알릴 필요 없이 사용자 변경 시점에만 알린다
                  const region = regions.find((item) => item.code === code)
                  if (region) onRegionChange?.(region)
                }}
              >
                <SelectTrigger aria-label="비교 지역" className="h-8 px-2 text-base font-semibold text-foreground lg:text-lg">
                  <SelectValue placeholder="지역 선택" />
                </SelectTrigger>
                <SelectContent>
                  {regionItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              아파트 5분위 가격 추이
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">월별 매매평균가격 (억원) · 상단 벤치마크 지역과 별도로 선택 · 배지는 조회 기간 연평균 상승률</p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {[...QUINTILE_SERIES].reverse().map((series) => {
              const cagr = quintileCagrs.get(series.dataKey) ?? null
              return (
                <span key={series.dataKey} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-0.5 w-3.5 rounded-full"
                    style={{ backgroundColor: series.color }}
                  />
                  {series.label}
                  <span className={cn('text-xs', cagr == null ? 'text-muted-foreground' : pnlTextClass(cagr))}>
                    {formatCagr(cagr)}
                  </span>
                </span>
              )
            })}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-4 sm:px-6 sm:pb-6">
        {query.isLoading ? (
          <TrendLoading />
        ) : query.isError && !data ? (
          <div role="alert" aria-live="assertive">
            <SectionError message={`${regionLabel} 아파트 5분위 시세를 불러오지 못했습니다.`} />
          </div>
        ) : points.length === 0 ? (
          <EmptyState message={`표시할 ${regionLabel} 아파트 시세 데이터가 없습니다.`} />
        ) : (
          <>
            <figure className="h-[240px] min-h-[240px] w-full sm:h-[320px]" aria-label={`${regionLabel} 아파트 5분위 월별 매매평균가격 선 차트`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} accessibilityLayer title={`${regionLabel} 아파트 5분위 가격 추이`}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="baseMonth"
                    tickFormatter={formatHousingBenchmarkAxisMonth}
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={28}
                  />
                  <YAxis
                    tickFormatter={(value) => fmtKrwEok(Number(value), 0)}
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    labelFormatter={(label) => formatHousingBenchmarkMonth(String(label))}
                    formatter={(value) => fmtKrwEok(Number(value))}
                    itemSorter={(item) => -Number(item.value)}
                    contentStyle={TOOLTIP_CONTENT_STYLE}
                  />
                  {QUINTILE_SERIES.map((series) => (
                    <Line
                      key={series.dataKey}
                      type="monotone"
                      dataKey={series.dataKey}
                      name={series.label}
                      stroke={series.color}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </figure>
            <p className="mt-2 text-xs text-muted-foreground">
              데이터 출처: KB Land {regionLabel} 아파트 5분위 매매평균가격
              {data?.sourceUpdatedDate ? ` · 업데이트 ${fmtDate(data.sourceUpdatedDate)}` : ''}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
