'use client'

import { useId, useMemo, useState } from 'react'
// eslint-disable-next-line react-doctor/prefer-dynamic-import
import { Area, Bar, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { filterAdminPrivacyBasesByRange, useAdminPrivacyBasesQuery } from '@entities/privacy'
import { useCandlesQuery } from '@entities/market'
import { EmptyState } from '@shared/ui/EmptyState'
import { fmtMonthDay, fmtSignedUsd, fmtUsd } from '@shared/lib/format'
import { buildPrivacyChartSeries } from './model/privacyChartSeries'

interface Props {
  windowFrom?: string
  windowTo?: string
}

const DEFAULT_TICKER = 'SOXL'
const SYNC_ID = 'privacy-base-chart'
const AXIS_TICK = { fontSize: 10 }
const TOOLTIP_STYLE = {
  fontSize: 12,
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  color: 'var(--foreground)',
  borderRadius: 6,
}
const LEGEND_STYLE = { fontSize: 11 }
const ORDER_DOT_BUY = { r: 2, fill: 'var(--pos)', stroke: 'none' }
const ORDER_DOT_SELL = { r: 2, fill: 'var(--neg)', stroke: 'none' }

function fmtPercent(ratio: number) {
  return `${Math.round(ratio * 100)}%`
}

// 주문 점(buyN/sellN)은 같은 이름이 여러 줄 뜨므로 툴팁에서만 "매수 1"처럼 번호를 붙인다
function fmtTooltipEntry(value: unknown, name: unknown, item: { dataKey?: unknown }): [string, string] {
  const order = /^(buy|sell)(\d+)$/.exec(String(item.dataKey))
  const label = order ? `${order[1] === 'buy' ? '매수' : '매도'} ${Number(order[2]) + 1}` : String(name)
  return [fmtTooltipValue(value, name), label]
}

function fmtTooltipValue(value: unknown, name: unknown) {
  const n = Number(value)
  if (name === '현금비율') return fmtPercent(n)
  if (name === '보유수량') return `${n}주`
  if (name === '실현손익') return fmtSignedUsd(n)
  return fmtUsd(n)
}

export function PrivacyBaseChart({ windowFrom, windowTo }: Props) {
  const { data: allBases = [] } = useAdminPrivacyBasesQuery()
  const tickers = useMemo(() => [...new Set(allBases.map((b) => b.ticker))].sort(), [allBases])
  const [pickedTicker, setPickedTicker] = useState<string | null>(null)
  const ticker = pickedTicker ?? (tickers.includes(DEFAULT_TICKER) ? DEFAULT_TICKER : tickers[0] ?? DEFAULT_TICKER)
  // ponytail: candles API 최대 200거래일 — 기간 기반 조회는 kista-api에 요청됨, 반영되면 from/to로 교체
  const candlesQuery = useCandlesQuery(ticker, 200)
  const pnlGradientId = `pnl-${useId().replace(/[^a-zA-Z0-9]/g, '')}`

  const series = useMemo(
    () => buildPrivacyChartSeries(
      filterAdminPrivacyBasesByRange(allBases.filter((b) => b.ticker === ticker), windowFrom, windowTo),
      candlesQuery.data ?? [],
    ),
    [allBases, ticker, windowFrom, windowTo, candlesQuery.data],
  )
  const { rows, maxBuyOrders, maxSellOrders } = series
  const boundaries = rows.filter((r) => r.cycleBoundary).map((r) => r.date)
  const missingCloseCount = rows.filter((r) => r.close == null).length

  // 손익 영역을 0 기준으로 이익(--pos)/손실(--neg) 색을 나누는 그라디언트 분기점
  const pnlValues = rows.map((r) => r.realizedPnl)
  const pnlMax = Math.max(0, ...pnlValues)
  const pnlMin = Math.min(0, ...pnlValues)
  const pnlZeroOffset = pnlMax === pnlMin ? 1 : pnlMax / (pnlMax - pnlMin)

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base lg:text-lg">P 매매표 추이</CardTitle>
          <Select value={ticker} onValueChange={(value) => setPickedTicker(String(value))}>
            <SelectTrigger aria-label="종목" className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {tickers.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          발표일 기준 · 종가는 발표일 직전 거래일 · 현금비율은 실현손익이 현금으로 회수되고 입출금이 없다고 가정한 추정치
        </p>
      </CardHeader>
      <CardContent className="space-y-2 px-2 pb-4 sm:px-6 sm:pb-6">
        {rows.length === 0 ? (
          <EmptyState message="선택한 기간에 표시할 매매표가 없습니다." />
        ) : candlesQuery.isLoading ? (
          <div role="status" aria-live="polite" aria-label="종가 불러오는 중">
            <Skeleton className="h-[520px]" />
          </div>
        ) : (
          <>
            <figure className="h-[220px] w-full" aria-label={`${ticker} 종가·평단가·주문 가격`}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={rows} syncId={SYNC_ID} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} title={`${ticker} 가격`}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" hide />
                  <YAxis yAxisId="price" tickFormatter={(v) => fmtUsd(Number(v), 0)} tick={AXIS_TICK} tickLine={false} axisLine={false} width={48} domain={['auto', 'auto']} />
                  <YAxis yAxisId="spacer" orientation="right" width={40} tick={false} axisLine={false} />
                  <Tooltip labelFormatter={(d) => String(d)} formatter={fmtTooltipEntry} contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={LEGEND_STYLE} />
                  {boundaries.map((d) => <ReferenceLine key={d} yAxisId="price" x={d} stroke="var(--muted-foreground)" strokeDasharray="4 4" />)}
                  {Array.from({ length: maxBuyOrders }, (_, i) => (
                    <Line key={`buy${i}`} yAxisId="price" dataKey={`buy${i}`} name="매수 주문" stroke="var(--pos)" strokeWidth={0} dot={ORDER_DOT_BUY} activeDot={false} legendType={i === 0 ? 'circle' : 'none'} isAnimationActive={false} />
                  ))}
                  {Array.from({ length: maxSellOrders }, (_, i) => (
                    <Line key={`sell${i}`} yAxisId="price" dataKey={`sell${i}`} name="매도 주문" stroke="var(--neg)" strokeWidth={0} dot={ORDER_DOT_SELL} activeDot={false} legendType={i === 0 ? 'circle' : 'none'} isAnimationActive={false} />
                  ))}
                  {/* 종가·평단가 선은 주문 점보다 나중에 그려 점에 가리지 않게 한다 */}
                  <Line yAxisId="price" dataKey="close" name="종가" stroke="var(--chart-2)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                  <Line yAxisId="price" type="stepAfter" dataKey="avgPrice" name="평단가" stroke="var(--chart-4)" strokeWidth={2} dot={false} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </figure>

            <figure className="h-[160px] w-full" aria-label="보유수량·현금비율">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={rows} syncId={SYNC_ID} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} title="보유수량·현금비율">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" hide />
                  <YAxis yAxisId="qty" tick={AXIS_TICK} tickLine={false} axisLine={false} width={48} />
                  <YAxis yAxisId="ratio" orientation="right" domain={[0, 1]} tickFormatter={(v) => fmtPercent(Number(v))} tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} />
                  <Tooltip labelFormatter={(d) => String(d)} formatter={fmtTooltipEntry} contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={LEGEND_STYLE} />
                  {boundaries.map((d) => <ReferenceLine key={d} yAxisId="qty" x={d} stroke="var(--muted-foreground)" strokeDasharray="4 4" />)}
                  <Bar yAxisId="qty" dataKey="holdings" name="보유수량" fill="var(--chart-5)" isAnimationActive={false} />
                  <Line yAxisId="ratio" dataKey="cashRatio" name="현금비율" stroke="var(--chart-1)" strokeWidth={2} dot={false} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </figure>

            <figure className="h-[160px] w-full" aria-label="사이클 실현손익">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={rows} syncId={SYNC_ID} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} title="사이클 실현손익">
                  <defs>
                    <linearGradient id={pnlGradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset={pnlZeroOffset} stopColor="var(--pos)" />
                      <stop offset={pnlZeroOffset} stopColor="var(--neg)" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tickFormatter={(d) => fmtMonthDay(String(d))} tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={28} />
                  <YAxis yAxisId="pnl" tickFormatter={(v) => fmtUsd(Number(v), 0)} tick={AXIS_TICK} tickLine={false} axisLine={false} width={48} />
                  <YAxis yAxisId="spacer" orientation="right" width={40} tick={false} axisLine={false} />
                  <Tooltip labelFormatter={(d) => String(d)} formatter={fmtTooltipEntry} contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={LEGEND_STYLE} />
                  <ReferenceLine yAxisId="pnl" y={0} stroke="var(--muted-foreground)" />
                  {boundaries.map((d) => <ReferenceLine key={d} yAxisId="pnl" x={d} stroke="var(--muted-foreground)" strokeDasharray="4 4" />)}
                  <Area yAxisId="pnl" type="stepAfter" dataKey="realizedPnl" name="실현손익" stroke={`url(#${pnlGradientId})`} fill={`url(#${pnlGradientId})`} fillOpacity={0.25} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </figure>

            {candlesQuery.isError ? (
              <p className="text-xs text-[var(--warn)]">종가를 불러오지 못해 종가·현금비율을 표시하지 않습니다.</p>
            ) : missingCloseCount > 0 ? (
              <p className="text-xs text-muted-foreground">종가 데이터(최근 200거래일) 밖의 {missingCloseCount}일은 종가·현금비율을 표시하지 않습니다.</p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
