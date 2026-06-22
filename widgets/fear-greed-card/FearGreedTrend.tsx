'use client'

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import type { FearGreedPoint } from '@entities/market'

interface Props {
  history: FearGreedPoint[]
  color: string
}

export function FearGreedTrend({ history, color }: Props) {
  const data = history.map((p) => ({
    date: new Date(p.date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }),
    value: p.value,
  }))

  return (
    <ResponsiveContainer width="100%" height={120}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`fg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.22} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={28} />
        <Tooltip
          formatter={(v) => [String(v), '지수']}
          labelStyle={{ fontSize: 12 }}
          contentStyle={{ fontSize: 12 }}
        />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#fg-${color.replace('#', '')})`} dot={false} activeDot={{ r: 4, fill: color }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
