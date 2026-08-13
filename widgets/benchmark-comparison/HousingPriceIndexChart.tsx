'use client'

// eslint-disable-next-line react-doctor/prefer-dynamic-import
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useHousingPriceIndexSeriesQuery } from '@entities/stats'
import { EmptyState } from '@shared/ui/EmptyState'
import { SectionError } from '@shared/ui/SectionError'
import { fmtDate } from '@shared/lib/format'
import {
  formatHousingBenchmarkAxisWeek,
  formatHousingBenchmarkDate,
  formatHousingIndexValue,
} from './housingBenchmarkChartFormatters'

interface Props {
  enabled: boolean
  from?: string
  to?: string
  regionCode: string
  regionLabel: string
}

function IndexChartLoading() {
  return (
    <div role="status" aria-live="polite" aria-label="아파트 매매가격지수 불러오는 중">
      <Skeleton data-testid="housing-price-index-skeleton" className="min-h-[240px] sm:min-h-[300px]" />
    </div>
  )
}

// 전략(투자 기록) 비교 없이 선택 지역의 KB Land 주간 매매가격지수 원본만 보여준다 — "없음" 선택 전용
export function HousingPriceIndexChart({ enabled, from, to, regionCode, regionLabel }: Props) {
  const query = useHousingPriceIndexSeriesQuery({ from, to, regionCode }, enabled)
  const data = query.data
  const points = data?.points ?? []

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base lg:text-lg">{regionLabel} 아파트 매매가격지수</CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">
          KB Land 주간 조사일 기준 · 투자 기록과 비교하지 않는 원본 지수입니다.
        </p>
      </CardHeader>
      <CardContent className="px-2 pb-4 sm:px-6 sm:pb-6">
        {query.isLoading ? (
          <IndexChartLoading />
        ) : query.isError && !data ? (
          <div role="alert" aria-live="assertive">
            <SectionError message={`${regionLabel} 아파트 매매가격지수를 불러오지 못했습니다`} />
          </div>
        ) : points.length === 0 ? (
          <EmptyState message={`표시할 ${regionLabel} 아파트 매매가격지수 데이터가 없습니다.`} />
        ) : (
          <>
            <figure
              className="h-[240px] min-h-[240px] w-full sm:h-[320px]"
              aria-label={`${regionLabel} 아파트 매매가격지수 선 차트`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} accessibilityLayer>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="baseDate"
                    tickFormatter={formatHousingBenchmarkAxisWeek}
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={28}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    labelFormatter={(label) => formatHousingBenchmarkDate(String(label))}
                    formatter={(value) => formatHousingIndexValue(value)}
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
                    dataKey="indexValue"
                    name="매매가격지수"
                    stroke="var(--chart-2)"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </figure>
            <p className="mt-2 text-xs text-muted-foreground">
              데이터 출처: KB Land {regionLabel} 아파트 주간 매매가격지수
              {data?.sourceUpdatedDate ? ` · 업데이트 ${fmtDate(data.sourceUpdatedDate)}` : ''}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
