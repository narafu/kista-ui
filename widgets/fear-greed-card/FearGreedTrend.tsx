'use client'

import { useId } from 'react'
// eslint-disable-next-line react-doctor/prefer-dynamic-import
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import type { FearGreedPoint } from '@entities/market'
import { zoneOf } from './fearGreedZones'

interface Props {
  history: FearGreedPoint[]
}

function buildLineStops(values: number[]) {
  if (values.length === 0) return []

  if (values.length === 1) {
    const color = zoneOf(values[0]).color
    return [
      { offset: '0%', color },
      { offset: '100%', color },
    ]
  }

  return values.flatMap((value, index) => {
    const color = zoneOf(value).color
    const left = index === 0 ? 0 : ((index - 0.5) / (values.length - 1)) * 100
    const right = index === values.length - 1 ? 100 : ((index + 0.5) / (values.length - 1)) * 100

    return [
      { offset: `${left}%`, color },
      { offset: `${right}%`, color },
    ]
  })
}

export function FearGreedTrend({ history }: Props) {
  const gradientId = useId().replace(/:/g, '')
  const data = history.map((p) => ({
    date: new Date(p.date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }),
    value: p.value,
  }))
  const lineStops = buildLineStops(history.map((point) => point.value))
  const currentColor = history.length > 0 ? zoneOf(history[history.length - 1].value).color : '#9CA3AF'

  return (
    <ResponsiveContainer width="100%" height={120}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`fg-line-${gradientId}`} x1="0" y1="0" x2="1" y2="0">
            {lineStops.map((stop, index) => (
              <stop key={`${stop.offset}-${index}`} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>
          <linearGradient id={`fg-fill-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={currentColor} stopOpacity={0.22} />
            <stop offset="100%" stopColor={currentColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={28} />
        <Tooltip
          formatter={(v) => [String(v), '지수']}
          labelStyle={{ fontSize: 12 }}
          contentStyle={{
            fontSize: 12,
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            color: 'var(--foreground)',
            borderRadius: 6,
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={`url(#fg-line-${gradientId})`}
          strokeWidth={2}
          fill={`url(#fg-fill-${gradientId})`}
          dot={false}
          activeDot={({ cx, cy, payload }) => (
            <circle cx={cx} cy={cy} r={4} fill={zoneOf(payload.value).color} stroke="var(--card)" strokeWidth={1.5} />
          )}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
