'use client'

// eslint-disable-next-line react-doctor/prefer-dynamic-import
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, Legend } from 'recharts'
import { fmtMonthDay } from '@shared/lib/format'
import { AXIS_TICK } from '@shared/lib/chart/axisTick'
import { TOOLTIP_CONTENT_STYLE } from '@shared/lib/chart/tooltip'

export interface IndicatorSeries {
  key: string
  name: string
  color: string
}

interface Props {
  data: readonly { date: string }[] // series key 값은 number | null
  series: IndicatorSeries[]
  title: string
  formatAxis: (value: number) => string
  formatValue: (value: number) => string
  referenceY?: number
  yWidth?: number
}

// 김프·펀딩비·OI 추이 공용 선 차트 — date는 UTC 일자(YYYY-MM-DD). null 값은 선을 끊어 "값 없는 날"을 드러낸다
export default function IndicatorLineChart({ data, series, title, formatAxis, formatValue, referenceY, yWidth = 44 }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} title={title}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="date" tickFormatter={(d) => fmtMonthDay(String(d))} tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tickFormatter={(v) => formatAxis(Number(v))} tick={AXIS_TICK} tickLine={false} axisLine={false} width={yWidth} domain={['auto', 'auto']} />
        {referenceY != null && <ReferenceLine y={referenceY} stroke="var(--muted-foreground)" strokeDasharray="4 4" />}
        <Tooltip
          formatter={(v, name) => [formatValue(Number(v)), name]}
          labelFormatter={(d) => `${String(d).replace(/-/g, '.')} UTC`}
          labelStyle={{ fontSize: 12 }}
          contentStyle={TOOLTIP_CONTENT_STYLE}
        />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11, color: 'var(--muted-foreground)' }} />}
        {series.map((s) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={false} connectNulls={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
