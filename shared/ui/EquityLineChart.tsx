'use client'

// eslint-disable-next-line react-doctor/prefer-dynamic-import
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { fmtMonthDay, fmtDate } from '@shared/lib/format'

export interface EquityLineChartRow {
  date: string
  asset: number
  principal: number
}

interface Props {
  rows: EquityLineChartRow[]
  assetLabel?: string
  principalLabel?: string
  /** 툴팁에 표시할 값 포맷터. 기본값은 기존 동작(소수 1자리)을 그대로 유지한다 */
  valueFormatter?: (value: number) => string
  /** Y축 너비. 기본값 32(기존 100-base 지수 값 기준) */
  yAxisWidth?: number
  /** Y축 눈금 포맷터. 미지정 시 recharts 기본 포맷(기존 동작)을 그대로 사용한다 */
  yAxisTickFormatter?: (value: number) => string
  /** X축 눈금 날짜 포맷터. 기본값은 기존 동작(fmtMonthDay, 연도 미포함)을 그대로 유지한다 */
  dateTickFormatter?: (value: string) => string
}

export function EquityLineChart({
  rows,
  assetLabel = '내 자산',
  principalLabel = '투입 원금',
  valueFormatter = (value: number) => value.toFixed(1),
  yAxisWidth = 32,
  yAxisTickFormatter,
  dateTickFormatter = fmtMonthDay,
}: Props) {
  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">표시할 자산 추이 데이터가 없습니다.</p>
  }

  return (
    <div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap pb-3">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-3.5 rounded-full" style={{ backgroundColor: 'var(--chart-1)' }} />
          {assetLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0 w-3.5 border-t-2 border-dashed" style={{ borderColor: 'var(--muted-foreground)' }} />
          {principalLabel}
        </span>
      </div>
      <div className="h-[240px] w-full sm:h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickFormatter={(value: string) => dateTickFormatter(value)}
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              minTickGap={24}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={yAxisWidth}
              domain={['auto', 'auto']}
              tickFormatter={yAxisTickFormatter}
            />
            <Tooltip
              labelFormatter={(label) => fmtDate(String(label))}
              formatter={(value, name) => [typeof value === 'number' ? valueFormatter(value) : String(value), String(name)]}
              contentStyle={{
                fontSize: 12,
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
                borderRadius: 6,
              }}
            />
            <Line type="monotone" dataKey="principal" name={principalLabel} stroke="var(--muted-foreground)" strokeWidth={2} strokeDasharray="5 4" dot={false} />
            <Line type="monotone" dataKey="asset" name={assetLabel} stroke="var(--chart-1)" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
