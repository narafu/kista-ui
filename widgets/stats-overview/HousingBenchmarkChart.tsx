'use client'

// eslint-disable-next-line react-doctor/prefer-dynamic-import
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fmtDate } from '@shared/lib/format'
import type { HousingBenchmark, HousingBenchmarkPoint } from '@entities/stats'

interface Props {
  points: HousingBenchmarkPoint[]
  investmentLabel: string
  benchmark: HousingBenchmark
}

function formatIndex(value: unknown) {
  return typeof value === 'number' ? value.toFixed(1) : '—'
}

function formatMonthlyReturn(value: number | null | undefined) {
  if (value == null) return '기준월'
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}% 월간`
}

function formatMonth(value: string) {
  return new Date(value).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })
}

export function HousingBenchmarkChart({ points, investmentLabel, benchmark }: Props) {
  const benchmarkLabel = benchmark.label ?? '서울 아파트'

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
              {investmentLabel} (USD)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-3.5 rounded-full bg-[var(--chart-3)]" />
              {benchmarkLabel} (KRW)
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
                tickFormatter={(value: string) => formatMonth(value).replace('년 ', '.').replace('월', '')}
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
                labelFormatter={(label) => formatMonth(String(label))}
                formatter={(value, name, item) => {
                  const point = item.payload as HousingBenchmarkPoint
                  const monthlyReturn = item.dataKey === 'investmentIndexUsd'
                    ? point.investmentMonthlyReturn
                    : point.benchmarkMonthlyReturn
                  return [`${formatIndex(value)} · ${formatMonthlyReturn(monthlyReturn)}`, String(name)]
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
                name={`${investmentLabel} (USD)`}
                stroke="var(--chart-1)"
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="benchmarkIndex"
                name={`${benchmarkLabel} (KRW)`}
                stroke="var(--chart-3)"
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </figure>
        <p className="mt-2 text-xs text-muted-foreground">
          월별 지수와 수익률은 서버 계산값이며, 표시된 현재 환율로 환산하지 않습니다.
          {points[0]?.baseMonth ? ` 비교 시작 ${fmtDate(points[0].baseMonth)}.` : ''}
        </p>
      </CardContent>
    </Card>
  )
}
