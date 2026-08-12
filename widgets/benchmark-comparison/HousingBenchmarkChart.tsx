'use client'

// eslint-disable-next-line react-doctor/prefer-dynamic-import
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { HousingBenchmark, HousingBenchmarkPoint } from '@entities/stats'
import {
  formatHousingBenchmarkAxisDate,
  formatHousingBenchmarkAxisWeek,
  formatHousingBenchmarkDate,
  formatHousingBenchmarkSeriesLabel,
  formatHousingBenchmarkTooltipValue,
  housingBenchmarkChartNotice,
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
  // ETF는 거래일별, 아파트는 KB Land 주간 조사일별 — 두 경우 모두 point.baseDate가 실제 일자라
  // 툴팁은 항상 연도 포함 전체 일자 포맷터를 쓴다. 축은 아파트 기본 조회 기간이 1~5년이라
  // 연도 없는 MM.DD만으로는 어느 해인지 구분이 안 돼 별도로 연도를 포함한 포맷터를 쓴다.
  const isDaily = benchmark.assetType === 'ETF'
  const formatAxisLabel = isDaily ? formatHousingBenchmarkAxisDate : formatHousingBenchmarkAxisWeek
  const formatTooltipLabel = formatHousingBenchmarkDate

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="text-base lg:text-lg">{isDaily ? '일별 누적지수' : '주별 누적지수'}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {isDaily ? '첫 공통 거래일 100 기준' : '첫 공통 조사일 100 기준'}
            </p>
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
        <figure
          className="h-[240px] min-h-[240px] w-full sm:h-[320px]"
          aria-label={`투자와 ${benchmarkLabel} ${isDaily ? '일별' : '주별'} 누적 성과 선 차트`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} accessibilityLayer>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="baseDate"
                tickFormatter={formatAxisLabel}
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
                labelFormatter={(label) => formatTooltipLabel(String(label))}
                formatter={(value, name, item) => {
                  const point = item.payload as HousingBenchmarkPoint
                  return [
                    formatHousingBenchmarkTooltipValue(
                      value,
                      item.dataKey as HousingBenchmarkSeriesKey,
                      point,
                      isDaily,
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
          {housingBenchmarkChartNotice(isDaily)}
          {points[0]?.baseDate ? ` 비교 시작 ${formatTooltipLabel(points[0].baseDate)}` : ''}
        </p>
      </CardContent>
    </Card>
  )
}
