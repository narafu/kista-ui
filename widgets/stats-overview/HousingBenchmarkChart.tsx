'use client'

// eslint-disable-next-line react-doctor/prefer-dynamic-import
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { HousingBenchmark, HousingBenchmarkPoint } from '@entities/stats'
import {
  HOUSING_BENCHMARK_CHART_NOTICE,
  formatHousingBenchmarkAxisMonth,
  formatHousingBenchmarkMonth,
  formatHousingBenchmarkSeriesLabel,
  formatHousingBenchmarkTooltipValue,
  type HousingBenchmarkSeriesKey,
} from './housingBenchmarkChartFormatters'

interface Props {
  points: HousingBenchmarkPoint[]
  investmentLabel: string
  benchmark: HousingBenchmark
  benchmarkCurrency: 'USD' | 'KRW'
}

export function HousingBenchmarkChart({ points, investmentLabel, benchmark, benchmarkCurrency }: Props) {
  const benchmarkLabel = benchmark.label ?? '벤치마크'

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="text-base lg:text-lg">월별 누적지수</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">첫 공통 월 100 기준</p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-3.5 rounded-full bg-[var(--chart-1)]" />
              {formatHousingBenchmarkSeriesLabel(investmentLabel, 'USD')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0 w-3.5 border-t-2 border-dashed border-[var(--chart-2)]" />
              {formatHousingBenchmarkSeriesLabel(benchmarkLabel, benchmarkCurrency)}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-4 sm:px-6 sm:pb-6">
        <figure className="h-[240px] min-h-[240px] w-full sm:h-[320px]" aria-label="투자와 서울 아파트 월별 누적 성과 선 차트">
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
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={36}
                domain={['auto', 'auto']}
              />
              <Tooltip
                labelFormatter={(label) => formatHousingBenchmarkMonth(String(label))}
                formatter={(value, name, item) => {
                  const point = item.payload as HousingBenchmarkPoint
                  return [
                    formatHousingBenchmarkTooltipValue(
                      value,
                      item.dataKey as HousingBenchmarkSeriesKey,
                      point,
                    ),
                    String(name),
                  ]
                }}
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
                dataKey="investmentIndexUsd"
                name={formatHousingBenchmarkSeriesLabel(investmentLabel, 'USD')}
                stroke="var(--chart-1)"
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="benchmarkIndex"
                name={formatHousingBenchmarkSeriesLabel(benchmarkLabel, benchmarkCurrency)}
                stroke="var(--chart-2)"
                strokeWidth={2.5}
                strokeDasharray="6 4"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </figure>
        <p className="mt-2 text-xs text-muted-foreground">
          {HOUSING_BENCHMARK_CHART_NOTICE}
          {points[0]?.baseMonth ? ` 비교 시작 ${formatHousingBenchmarkMonth(points[0].baseMonth)}` : ''}
        </p>
      </CardContent>
    </Card>
  )
}
