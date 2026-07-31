'use client'

import { useEffect, useMemo, useState } from 'react'
// eslint-disable-next-line react-doctor/prefer-dynamic-import
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useHousingBenchmarkRegionsQuery, useHousingBenchmarkSeriesQuery } from '@entities/stats'
import type { HousingBenchmarkRegion } from '@entities/stats'
import { EmptyState } from '@shared/ui/EmptyState'
import { SectionError } from '@shared/ui/SectionError'
import { fmtDate, fmtKrwEok, pnlTextClass } from '@shared/lib/format'
import { cn } from '@shared/lib/utils'
import type { HousingQuintile } from './housingBenchmarkContent'
import {
  calculateQuintileCagr,
  formatHousingBenchmarkAxisMonth,
  formatHousingBenchmarkMonth,
  formatQuintileCagr,
} from './housingBenchmarkChartFormatters'

interface Props {
  enabled: boolean
  quintile: HousingQuintile
  from?: string
  to?: string
  onRegionChange?: (region: HousingBenchmarkRegion) => void
}

// KB Land 지역 목록 조회가 실패했을 때만 사용하는 최소 fallback — 하드코딩 목록 아님
const SEOUL_REGION_CODE = '1100000000'
const SEOUL_FALLBACK_REGION = { code: SEOUL_REGION_CODE, name: '서울' }

// "가격 추이" 비교지역은 서울/수도권/전국 3개로만 제한 — KB Land가 내려주는 전체 지역 목록 중 일부만 노출
const ALLOWED_REGION_NAMES = ['서울', '수도권', '전국'] as const

// 5분위는 가격 순위상 항상 5>4>3>2>1 순서로 그려져 세로 위치만으로도 순서가 구분되므로,
// 색상은 순서 표현보다 인접한 5개 선을 서로 뚜렷이 구분하는 역할에 집중한다.
// 웜톤 그러데이션(--quintile-1~5, globals.css)이되 인접 색상 CVD 대비(ΔE)를 검증해 선정했다
const QUINTILE_SERIES = [
  { quintile: 1, dataKey: 'firstQuintilePrice', color: 'var(--quintile-1)', label: '1분위' },
  { quintile: 2, dataKey: 'secondQuintilePrice', color: 'var(--quintile-2)', label: '2분위' },
  { quintile: 3, dataKey: 'thirdQuintilePrice', color: 'var(--quintile-3)', label: '3분위' },
  { quintile: 4, dataKey: 'fourthQuintilePrice', color: 'var(--quintile-4)', label: '4분위' },
  { quintile: 5, dataKey: 'fifthQuintilePrice', color: 'var(--quintile-5)', label: '5분위' },
] as const

function TrendLoading({ quintile }: { quintile: HousingQuintile }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`아파트 ${quintile}분위 가격 추이 불러오는 중`}
    >
      <Skeleton data-testid="housing-benchmark-quintile-trend-skeleton" className="min-h-[240px] sm:min-h-[300px]" />
    </div>
  )
}

export function HousingBenchmarkQuintileTrendChart({ enabled, quintile, from, to, onRegionChange }: Props) {
  const [regionCode, setRegionCode] = useState(SEOUL_REGION_CODE)
  const regionsQuery = useHousingBenchmarkRegionsQuery(enabled)
  const fetchedRegions = regionsQuery.data?.regions ?? []
  const regions = useMemo(() => {
    const allowed = ALLOWED_REGION_NAMES
      .map((name) => fetchedRegions.find((region) => region.name === name))
      .filter((region): region is HousingBenchmarkRegion => region != null)
    return allowed.length > 0 ? allowed : [SEOUL_FALLBACK_REGION]
  }, [fetchedRegions])
  const selectedRegion = regions.find((region) => region.code === regionCode) ?? regions[0]
  const regionLabel = selectedRegion.name
  const selectedSeries = QUINTILE_SERIES.find((series) => series.quintile === quintile) ?? QUINTILE_SERIES[QUINTILE_SERIES.length - 1]

  useEffect(() => {
    onRegionChange?.(selectedRegion)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRegion.code, selectedRegion.name])

  // 상단 "비교 기간" 토글과 동일한 from/to로 조회 — 추이 차트만 별도 기간을 쓰지 않는다
  const query = useHousingBenchmarkSeriesQuery({ from, to, regionCode }, enabled)
  const data = query.data
  const points = data?.points ?? []

  // 현재 조회 기간(상단 "비교 기간" 토글) 첫·마지막 시점 기준 연평균 상승률(CAGR) — 범례 배지용
  const selectedCagr = useMemo(
    () => calculateQuintileCagr(points, selectedSeries.dataKey),
    [points, selectedSeries.dataKey],
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3">
          <div>
            <CardTitle className="flex flex-wrap items-center gap-1.5 text-base lg:text-lg">
              <select
                aria-label="비교 지역"
                value={regionCode}
                onChange={(event) => setRegionCode(event.target.value)}
                className="min-h-8 rounded-md border border-input bg-background px-2 text-base font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring lg:text-lg"
              >
                {regions.map((region) => (
                  <option key={region.code} value={region.code}>{region.name}</option>
                ))}
              </select>
              아파트 {quintile}분위 가격 추이
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">월별 매매평균가격 (억원) · 배지는 조회 기간 연평균 상승률</p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-0.5 w-3.5 rounded-full"
                style={{ backgroundColor: selectedSeries.color }}
              />
              {selectedSeries.label}
              <span className={cn('text-[10px]', selectedCagr == null ? 'text-muted-foreground' : pnlTextClass(selectedCagr))}>
                {formatQuintileCagr(selectedCagr)}
              </span>
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-4 sm:px-6 sm:pb-6">
        {query.isLoading ? (
          <TrendLoading quintile={quintile} />
        ) : query.isError && !data ? (
          <div role="alert" aria-live="assertive">
            <SectionError message={`${regionLabel} 아파트 ${quintile}분위 시세를 불러오지 못했습니다`} />
          </div>
        ) : points.length === 0 ? (
          <EmptyState message={`표시할 ${regionLabel} 아파트 시세 데이터가 없습니다.`} />
        ) : (
          <>
            <figure className="h-[240px] min-h-[240px] w-full sm:h-[320px]" aria-label={`${regionLabel} 아파트 ${quintile}분위 월별 매매평균가격 선 차트`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} accessibilityLayer>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="baseMonth"
                    tickFormatter={formatHousingBenchmarkAxisMonth}
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={28}
                  />
                  <YAxis
                    tickFormatter={(value) => fmtKrwEok(Number(value), 0)}
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    labelFormatter={(label) => formatHousingBenchmarkMonth(String(label))}
                    formatter={(value) => fmtKrwEok(Number(value))}
                    itemSorter={(item) => -Number(item.value)}
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
                    dataKey={selectedSeries.dataKey}
                    name={selectedSeries.label}
                    stroke={selectedSeries.color}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </figure>
            <p className="mt-2 text-xs text-muted-foreground">
              데이터 출처: KB부동산 {regionLabel} 아파트 {quintile}분위 매매평균가격
              {data?.sourceUpdatedDate ? ` · 업데이트 ${fmtDate(data.sourceUpdatedDate)}` : ''}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
