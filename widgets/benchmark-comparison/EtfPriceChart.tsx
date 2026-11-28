'use client'

import { AXIS_TICK } from '@shared/lib/chart/axisTick'
import { TOOLTIP_CONTENT_STYLE } from '@shared/lib/chart/tooltip'
import { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Surface } from '@shared/ui/Surface'
import { SectionTitle } from '@shared/ui/SectionTitle'
import { Skeleton } from '@/components/ui/skeleton'
import { useEtfPriceSeriesQuery } from '@entities/stats'
import { EmptyState } from '@shared/ui/EmptyState'
import { SectionError } from '@shared/ui/SectionError'
import { fmtUsd, pnlTextClass } from '@shared/lib/format'
import { cn } from '@shared/lib/utils'
import {
  formatCagr,
  formatHousingBenchmarkAxisDate,
  formatHousingBenchmarkDate,
} from '@entities/stats'

interface Props {
  enabled: boolean
  from?: string
  to?: string
  symbol: string
  label: string
}

function EtfChartLoading() {
  return (
    <div role="status" aria-live="polite" aria-label="ETF 가격 불러오는 중">
      <Skeleton data-testid="etf-price-skeleton" className="min-h-[240px] sm:min-h-[300px]" />
    </div>
  )
}

// 전략(투자 기록) 비교 없이 선택 ETF의 일별 종가 원본만 보여준다 — "없음" 선택 전용
export function EtfPriceChart({ enabled, from, to, symbol, label }: Props) {
  const query = useEtfPriceSeriesQuery({ from, to, symbol }, enabled)
  const data = query.data
  const points = useMemo(() => data?.points ?? [], [data])
  // 조회 기간 첫·마지막 종가 기준 연평균 상승률(CAGR, 서버 계산) — 배지용
  const cagr = data?.cagr ?? null

  return (
    <Surface size="flush" className="flex flex-col gap-4 overflow-hidden py-4 text-sm">
      <div className="px-4 pb-3">
        <SectionTitle className="flex flex-wrap items-center gap-1.5">
          {label} 가격 추이
          <span className={cn('text-xs', cagr == null ? 'text-muted-foreground' : pnlTextClass(cagr))}>
            {formatCagr(cagr)}
          </span>
        </SectionTitle>
        <p className="mt-1 text-xs text-muted-foreground">
          일별 종가 · 투자 기록과 비교하지 않는 원본 시세입니다. 배지는 조회 기간 연평균 상승률입니다.
        </p>
      </div>
      <div className="px-2 pb-4 sm:px-6 sm:pb-6">
        {query.isLoading ? (
          <EtfChartLoading />
        ) : query.isError && !data ? (
          <div role="alert" aria-live="assertive">
            <SectionError message={`${label} 가격을 불러오지 못했습니다.`} />
          </div>
        ) : points.length === 0 ? (
          <EmptyState message={`표시할 ${label} 가격 데이터가 없습니다.`} />
        ) : (
          <>
            <figure
              className="h-[240px] min-h-[240px] w-full sm:h-[320px]"
              aria-label={`${label} 일별 종가 선 차트`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} accessibilityLayer title={`${label} 일별 종가`}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="tradeDate"
                    tickFormatter={formatHousingBenchmarkAxisDate}
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={28}
                  />
                  <YAxis
                    tickFormatter={(value) => fmtUsd(Number(value), 0)}
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    labelFormatter={(tickLabel) => formatHousingBenchmarkDate(String(tickLabel))}
                    formatter={(value) => fmtUsd(Number(value))}
                    contentStyle={TOOLTIP_CONTENT_STYLE}
                  />
                  <Line
                    type="monotone"
                    dataKey="close"
                    name="종가"
                    stroke="var(--chart-2)"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </figure>
            <p className="mt-2 text-xs text-muted-foreground">
              데이터 출처: Alpaca Market Data (일별 종가)
            </p>
          </>
        )}
      </div>
    </Surface>
  )
}
