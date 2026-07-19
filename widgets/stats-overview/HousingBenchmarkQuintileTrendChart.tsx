'use client'

// eslint-disable-next-line react-doctor/prefer-dynamic-import
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useHousingBenchmarkSeriesQuery } from '@entities/stats'
import { EmptyState } from '@shared/ui/EmptyState'
import { fmtDate, fmtKrwEok } from '@shared/lib/format'
import { formatHousingBenchmarkAxisMonth, formatHousingBenchmarkMonth } from './housingBenchmarkChartFormatters'
import { SectionError } from './SectionError'

interface Props {
  enabled: boolean
}

// 5분위 각각의 데이터 키·색상·범례 라벨 — chart-1(1분위) ~ chart-5(5분위) 순서 고정
const QUINTILE_SERIES = [
  { dataKey: 'firstQuintilePrice', color: 'var(--chart-1)', label: '1분위' },
  { dataKey: 'secondQuintilePrice', color: 'var(--chart-2)', label: '2분위' },
  { dataKey: 'thirdQuintilePrice', color: 'var(--chart-3)', label: '3분위' },
  { dataKey: 'fourthQuintilePrice', color: 'var(--chart-4)', label: '4분위' },
  { dataKey: 'fifthQuintilePrice', color: 'var(--chart-5)', label: '5분위' },
] as const

function TrendLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="서울 아파트 5분위 가격 추이 불러오는 중"
    >
      <Skeleton data-testid="housing-benchmark-quintile-trend-skeleton" className="min-h-[240px] sm:min-h-[300px]" />
    </div>
  )
}

export function HousingBenchmarkQuintileTrendChart({ enabled }: Props) {
  // 사용자 투자 데이터와 무관한 원본 시계열 — 항상 전체 기간 조회
  const query = useHousingBenchmarkSeriesQuery({}, enabled)
  const data = query.data
  const points = data?.points ?? []

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="text-base lg:text-lg">서울 아파트 5분위 가격 추이</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">월별 매매평균가격 (억원)</p>
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
            <SectionError message="서울 아파트 5분위 시세를 불러오지 못했습니다" />
          </div>
        ) : points.length === 0 ? (
          <EmptyState message="표시할 서울 아파트 시세 데이터가 없습니다." />
        ) : (
          <>
            <figure className="h-[240px] min-h-[240px] w-full sm:h-[320px]" aria-label="서울 아파트 5분위 월별 매매평균가격 선 차트">
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
              데이터 출처: KB부동산 서울 아파트 5분위 매매평균가격
              {data?.sourceUpdatedDate ? ` · 업데이트 ${fmtDate(data.sourceUpdatedDate)}` : ''}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
