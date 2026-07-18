'use client'

import type { ReactNode } from 'react'
// eslint-disable-next-line react-doctor/prefer-dynamic-import
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@shared/lib/utils'
import { fmtMonthDay, fmtDate } from '@shared/lib/format'
import type { NormalizedRow } from './lib/normalizeEquityCurve'
import type { RangeKey } from './StatsOverview'

interface Props {
  rows: NormalizedRow[]
  range: RangeKey
  onRangeChange: (range: RangeKey) => void
}

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: '1M', label: '1M' },
  { value: '3M', label: '3M' },
  { value: '6M', label: '6M' },
  { value: '1Y', label: '1Y' },
  { value: 'ALL', label: '전체' },
]

function ToggleButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-xs px-2 py-1 rounded font-medium transition-colors',
        active
          ? 'bg-[var(--brand-fg-soft)] text-[var(--background)]'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent',
      )}
    >
      {children}
    </button>
  )
}

export function EquityCurveChart({ rows, range, onRangeChange }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base lg:text-lg">누적 자산 추이</CardTitle>
          <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
            {RANGE_OPTIONS.map((opt) => (
              <ToggleButton key={opt.value} active={range === opt.value} onClick={() => onRangeChange(opt.value)}>
                {opt.label}
              </ToggleButton>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap pt-1">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-3.5 rounded-full" style={{ backgroundColor: 'var(--chart-1)' }} />
            내 자산
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0 w-3.5 border-t-2 border-dashed" style={{ borderColor: 'var(--muted-foreground)' }} />
            투입 원금
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">표시할 자산 추이 데이터가 없습니다.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickFormatter={(value: string) => fmtMonthDay(value)}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={36} domain={['auto', 'auto']} />
              <Tooltip
                labelFormatter={(label) => fmtDate(String(label))}
                formatter={(value, name) => [typeof value === 'number' ? value.toFixed(1) : String(value), String(name)]}
                contentStyle={{
                  fontSize: 12,
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  color: 'var(--foreground)',
                  borderRadius: 6,
                }}
              />
              <Line type="monotone" dataKey="principal" name="투입 원금" stroke="var(--muted-foreground)" strokeWidth={2} strokeDasharray="5 4" dot={false} />
              <Line type="monotone" dataKey="asset" name="내 자산" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          전략에 배정된 예수금 기준 근사치입니다. 수수료는 반영되지 않습니다.
        </p>
      </CardContent>
    </Card>
  )
}
