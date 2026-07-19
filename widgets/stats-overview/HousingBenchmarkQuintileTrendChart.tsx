'use client'

import { useState } from 'react'
// eslint-disable-next-line react-doctor/prefer-dynamic-import
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useHousingBenchmarkRegionsQuery, useHousingBenchmarkSeriesQuery } from '@entities/stats'
import { EmptyState } from '@shared/ui/EmptyState'
import { fmtDate, fmtKrwEok } from '@shared/lib/format'
import { formatHousingBenchmarkAxisMonth, formatHousingBenchmarkMonth } from './housingBenchmarkChartFormatters'
import { SectionError } from './SectionError'

interface Props {
  enabled: boolean
  from?: string
  to?: string
}

// KB Land 지역 목록 조회가 실패했을 때만 사용하는 최소 fallback — 하드코딩 목록 아님
const SEOUL_REGION_CODE = '1100000000'
const SEOUL_FALLBACK_REGION = { code: SEOUL_REGION_CODE, name: '서울' }

// 5분위 각각의 데이터 키·범례 라벨·색상 — 앱 브랜드 톤(--chart-1~5)은 갈색·베이지 계열이라
// 5개 라인을 구분하기 어려워 범주형 구분이 뚜렷한 고정 팔레트를 사용한다
const QUINTILE_SERIES = [
  { dataKey: 'firstQuintilePrice', color: '#2563eb', label: '1분위' },
  { dataKey: 'secondQuintilePrice', color: '#16a34a', label: '2분위' },
  { dataKey: 'thirdQuintilePrice', color: '#f59e0b', label: '3분위' },
  { dataKey: 'fourthQuintilePrice', color: '#dc2626', label: '4분위' },
  { dataKey: 'fifthQuintilePrice', color: '#9333ea', label: '5분위' },
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

export function HousingBenchmarkQuintileTrendChart({ enabled, from, to }: Props) {
  const [regionCode, setRegionCode] = useState(SEOUL_REGION_CODE)
  const regionsQuery = useHousingBenchmarkRegionsQuery(enabled)
  const regions = regionsQuery.data?.regions?.length ? regionsQuery.data.regions : [SEOUL_FALLBACK_REGION]
  const selectedRegionName = regions.find((region) => region.code === regionCode)?.name
  const regionLabel = selectedRegionName ?? '서울'

  // 상단 "비교 기간" 토글과 동일한 from/to로 조회 — 추이 차트만 별도 기간을 쓰지 않는다
  const query = useHousingBenchmarkSeriesQuery({ from, to, regionCode }, enabled)
  const data = query.data
  const points = data?.points ?? []

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle className="text-base lg:text-lg">{regionLabel} 아파트 5분위 가격 추이</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">월별 매매평균가격 (억원)</p>
            </div>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground sm:w-48">
              비교 지역
              <select
                aria-label="비교 지역"
                value={regionCode}
                onChange={(event) => setRegionCode(event.target.value)}
                className="min-h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {regions.map((region) => (
                  <option key={region.code} value={region.code}>{region.name}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {QUINTILE_SERIES.map((series) => (
              <span key={series.dataKey} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-0.5 w-3.5 rounded-full"
                  style={{ backgroundColor: series.color }}
                />
                {series.label}
              </span>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-4 sm:px-6 sm:pb-6">
        {query.isLoading ? (
          <TrendLoading />
        ) : query.isError && !data ? (
          <div role="alert" aria-live="assertive">
            <SectionError message={`${regionLabel} 아파트 5분위 시세를 불러오지 못했습니다`} />
          </div>
        ) : points.length === 0 ? (
          <EmptyState message={`표시할 ${regionLabel} 아파트 시세 데이터가 없습니다.`} />
        ) : (
          <>
            <figure className="h-[240px] min-h-[240px] w-full sm:h-[320px]" aria-label={`${regionLabel} 아파트 5분위 월별 매매평균가격 선 차트`}>
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
                    contentStyle={{
                      fontSize: 12,
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      color: 'var(--foreground)',
                      borderRadius: 6,
                    }}
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
              데이터 출처: KB부동산 {regionLabel} 아파트 5분위 매매평균가격
              {data?.sourceUpdatedDate ? ` · 업데이트 ${fmtDate(data.sourceUpdatedDate)}` : ''}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
