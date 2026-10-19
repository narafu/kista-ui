'use client'

// eslint-disable-next-line react-doctor/prefer-dynamic-import
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, Legend } from 'recharts'
import { fmtMonthDay } from '@shared/lib/format'
import { AXIS_TICK } from '@shared/lib/chart/axisTick'
import { TOOLTIP_CONTENT_STYLE } from '@shared/lib/chart/tooltip'
import { niceTicks } from './niceTicks'

export interface IndicatorSeries {
  key: string
  name: string
  color: string
  strokeWidth?: number // 기본 2 — 이동평균처럼 보조선은 가늘게
}

interface Props {
  data: readonly { date: string }[] // series key 값은 number | null
  series: IndicatorSeries[]
  title: string
  // step: 눈금 간격(값이 없어 recharts 기본 눈금을 쓸 때는 undefined) — 라벨 소수 자릿수를 간격에 맞추는 데 쓴다
  formatAxis: (value: number, step?: number) => string
  formatValue: (value: number) => string
  referenceY?: number
  yWidth?: number
}

// 김프·펀딩비·OI 추이 공용 선 차트 — date는 UTC 일자(YYYY-MM-DD). null 값은 선을 끊어 "값 없는 날"을 드러낸다
export default function IndicatorLineChart({ data, series, title, formatAxis, formatValue, referenceY, yWidth = 44 }: Props) {
  // 기준선도 눈금 범위에 넣어 데이터가 기준선에 못 미쳐도 점선이 차트 안에 보이게 한다
  const values = data.flatMap((row) => series.map((s) => (row as Record<string, unknown>)[s.key])).filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  const ticks = niceTicks(referenceY != null ? [...values, referenceY] : values)
  const step = ticks && ticks.length > 1 ? ticks[1] - ticks[0] : undefined
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} title={title}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="date" tickFormatter={(d) => fmtMonthDay(String(d))} tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tickFormatter={(v) => formatAxis(Number(v), step)} tick={AXIS_TICK} tickLine={false} axisLine={false} width={yWidth} ticks={ticks} domain={ticks ? [ticks[0], ticks[ticks.length - 1]] : ['auto', 'auto']} />
        {referenceY != null && <ReferenceLine y={referenceY} stroke="var(--muted-foreground)" strokeDasharray="4 4" />}
        <Tooltip
          formatter={(v, name) => [formatValue(Number(v)), name]}
          labelFormatter={(d) => `${String(d).replace(/-/g, '.')} UTC`}
          labelStyle={{ fontSize: 12 }}
          contentStyle={TOOLTIP_CONTENT_STYLE}
        />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11, color: 'var(--muted-foreground)' }} />}
        {series.map((s) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={s.strokeWidth ?? 2} dot={false} connectNulls={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
