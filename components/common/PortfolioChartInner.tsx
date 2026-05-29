'use client'

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import type { PortfolioSnapshot } from '@/types/trade'

interface Props {
  snapshots: PortfolioSnapshot[]
}

export default function PortfolioChartInner({ snapshots }: Props) {
  const data = snapshots.map((s) => ({
    date: new Date(s.snapshotDate).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }),
    totalAsset: Number(s.totalAssetUsd.toFixed(2)),
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="roseGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B66951" stopOpacity={0.22} />
            <stop offset="100%" stopColor="#B66951" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `$${v.toLocaleString()}`}
          width={64}
        />
        <Tooltip
          formatter={(value) => [`$${Number(value).toLocaleString()}`, '총 자산']}
          labelStyle={{ fontSize: 12 }}
          contentStyle={{ fontSize: 12 }}
        />
        <Area
          type="monotone"
          dataKey="totalAsset"
          stroke="#B66951"
          strokeWidth={2}
          fill="url(#roseGold)"
          dot={false}
          activeDot={{ r: 4, fill: '#B66951' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
