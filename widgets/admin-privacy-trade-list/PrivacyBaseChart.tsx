'use client'

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
// eslint-disable-next-line react-doctor/prefer-dynamic-import
import { Area, Brush, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { filterAdminPrivacyBasesByRange, useAdminPrivacyBasesQuery } from '@entities/privacy'
import { useCandlesRangeQuery } from '@entities/market'
import { EmptyState } from '@shared/ui/EmptyState'
import { fmtMonthDay, fmtSignedUsd, fmtUsd, pnlTextClass } from '@shared/lib/format'
import { cn } from '@shared/lib/utils'
import { buildPrivacyChartSeries, candleRangeFor } from './model/privacyChartSeries'
import type { PrivacyChartRow } from './model/privacyChartSeries'

interface Props {
  windowFrom?: string
  windowTo?: string
}

const DEFAULT_TICKER = 'SOXL'
const SYNC_ID = 'privacy-base-chart'
const AXIS_TICK = { fontSize: 10 }
const Y_AXIS_WIDTH = 52
// 세 패널의 플롯 영역 좌우 끝을 맞추기 위해 margin·축 폭을 공유한다
// right는 Brush 끝 날짜 라벨이 잘리지 않을 만큼 둔다
const MARGIN = { top: 4, right: 40, left: 0, bottom: 0 }
const ORDER_DOT_BUY = { r: 2, fill: 'var(--pos)', stroke: 'none' }
const ORDER_DOT_SELL = { r: 2, fill: 'var(--neg)', stroke: 'none' }
const CURSOR = { stroke: 'var(--muted-foreground)', strokeDasharray: '3 3' }
const CASH_TICKS = [0, 0.5, 1]
// 현금비중 경고 기준 — 이 아래 구간은 배경 음영으로 구분한다
const CASH_THRESHOLD = 0.5

function fmtPercent(ratio: number) {
  return `${Math.round(ratio * 100)}%`
}

function fmtPrices(prices: number[]) {
  return prices.length > 0 ? prices.map((p) => fmtUsd(p)).join(' · ') : '-'
}

// 범례와 툴팁이 같은 표식을 쓰도록 한곳에 둔다 — 툴팁 값과 차트 요소를 눈으로 짝짓기 위함
const SWATCH = {
  close: 'h-0.5 w-4 bg-[var(--chart-2)]',
  avgPrice: 'h-0.5 w-4 bg-[var(--foreground)]',
  buy: 'size-2 rounded-full bg-[var(--pos)]',
  sell: 'size-2 rounded-full bg-[var(--neg)]',
  cash: 'h-2 w-4 rounded-sm bg-[var(--info)]',
  cashLow: 'h-2 w-4 rounded-sm border border-[var(--warn)] bg-[var(--warn-bg)]',
  boundary: 'h-3 w-0 border-l border-dashed border-muted-foreground',
  profit: 'h-2 w-4 rounded-sm bg-[var(--pos)]',
  loss: 'h-2 w-4 rounded-sm bg-[var(--neg)]',
  flat: 'h-2 w-4 rounded-sm bg-muted-foreground',
}

// 범례 — 패널마다 recharts Legend를 두면 차트 사이에 떠서 산만해 카드 상단 한 줄로 모은다
const LEGEND_ITEMS: Array<{ label: string; swatch: string }> = [
  { label: '종가', swatch: SWATCH.close },
  { label: '평단가', swatch: SWATCH.avgPrice },
  { label: '매수 주문', swatch: SWATCH.buy },
  { label: '매도 주문', swatch: SWATCH.sell },
  { label: '현금비중', swatch: SWATCH.cash },
  { label: '현금 50% 미만', swatch: SWATCH.cashLow },
  { label: '사이클 경계', swatch: SWATCH.boundary },
]

function Swatch({ className }: { className: string }) {
  return (
    <span className="inline-flex w-4 shrink-0 items-center justify-center" aria-hidden>
      <span className={cn('inline-block', className)} />
    </span>
  )
}

function TooltipRow({ label, value, swatch, className }: { label: string; value: string; swatch: string; className?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <Swatch className={swatch} />
        {label}
      </span>
      <span className={cn('font-medium tabular-nums', className)}>{value}</span>
    </div>
  )
}

// 툴팁 묶음은 위에서 아래로 차트 패널 순서(가격 → 현금비중 → 실현손익)와 같게 둔다
function TooltipSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-0.5 border-t border-border pt-1.5">
      <div className="text-[11px] text-muted-foreground">{title}</div>
      {children}
    </div>
  )
}

// 툴팁은 가격 패널에만 두고 그날 지표를 한 번에 보여준다 — 세 패널이 각자 툴팁을 띄우면 화면을 덮는다
// payload는 값이 null인 계열을 걸러내 종가·평단가·주문이 모두 없는 날엔 비므로, 행은 label(날짜)로 찾는다
function ChartTooltip({ row, ticker }: { row: PrivacyChartRow | undefined; ticker: string }) {
  if (!row) return null
  const cashLow = row.cashRatio != null && row.cashRatio < CASH_THRESHOLD
  return (
    <div className="min-w-52 space-y-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs shadow-md">
      <div className="font-semibold">{row.date}</div>
      <TooltipSection title={`${ticker} 가격`}>
        <TooltipRow label="종가" value={row.close == null ? '-' : fmtUsd(row.close)} swatch={SWATCH.close} />
        <TooltipRow label="평단가" value={row.avgPrice == null ? '-' : fmtUsd(row.avgPrice)} swatch={SWATCH.avgPrice} />
        <TooltipRow label="매수" value={fmtPrices(row.buys)} swatch={SWATCH.buy} className="text-pos" />
        <TooltipRow label="매도" value={fmtPrices(row.sells)} swatch={SWATCH.sell} className="text-neg" />
      </TooltipSection>
      <TooltipSection title="현금비중">
        <TooltipRow
          label={cashLow ? '현금비중 (50% 미만)' : '현금비중'}
          value={row.cashRatio == null ? '-' : fmtPercent(row.cashRatio)}
          swatch={cashLow ? SWATCH.cashLow : SWATCH.cash}
          className={cashLow ? 'text-[var(--warn)]' : undefined}
        />
      </TooltipSection>
      <TooltipSection title="사이클 실현손익">
        <TooltipRow
          label="실현손익"
          value={fmtSignedUsd(row.realizedPnl)}
          swatch={row.realizedPnl > 0 ? SWATCH.profit : row.realizedPnl < 0 ? SWATCH.loss : SWATCH.flat}
          className={pnlTextClass(row.realizedPnl)}
        />
      </TooltipSection>
    </div>
  )
}

const pnlProfit = (row: PrivacyChartRow) => Math.max(row.realizedPnl, 0)
const pnlLoss = (row: PrivacyChartRow) => Math.min(row.realizedPnl, 0)

function PanelLabel({ children }: { children: string }) {
  return <div className="pl-1 text-xs font-medium text-muted-foreground">{children}</div>
}

export function PrivacyBaseChart({ windowFrom, windowTo }: Props) {
  const { data: allBases = [] } = useAdminPrivacyBasesQuery()
  const tickers = useMemo(() => [...new Set(allBases.map((b) => b.ticker))].sort(), [allBases])
  const [pickedTicker, setPickedTicker] = useState<string | null>(null)
  const ticker = pickedTicker ?? (tickers.includes(DEFAULT_TICKER) ? DEFAULT_TICKER : tickers[0] ?? DEFAULT_TICKER)

  const bases = useMemo(
    () => filterAdminPrivacyBasesByRange(allBases.filter((b) => b.ticker === ticker), windowFrom, windowTo),
    [allBases, ticker, windowFrom, windowTo],
  )
  const candleRange = useMemo(() => candleRangeFor(bases), [bases])
  const candlesQuery = useCandlesRangeQuery(ticker, candleRange)
  const series = useMemo(() => buildPrivacyChartSeries(bases, candlesQuery.data ?? []), [bases, candlesQuery.data])
  const { rows, maxBuyOrders, maxSellOrders } = series
  const rowByDate = new Map(rows.map((r) => [r.date, r]))
  const boundaries = rows.filter((r) => r.cycleBoundary).map((r) => r.date)
  const missingCloseCount = rows.filter((r) => r.close == null).length


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
          발표일 기준 · 종가는 발표일 직전 거래일 · 현금비중은 실현손익이 현금으로 회수되고 입출금이 없다고 가정한 추정치
        </p>
      </CardHeader>
      <CardContent className="px-2 pb-4 sm:px-6 sm:pb-6">
        {rows.length === 0 ? (
          <EmptyState message="선택한 기간에 표시할 매매표가 없습니다." />
        ) : candlesQuery.isLoading ? (
          <div role="status" aria-live="polite" aria-label="종가 불러오는 중">
            <Skeleton className="h-[480px]" />
          </div>
        ) : (
          // 종목·기간·건수가 바뀌면 Brush 구간을 처음(전체)으로 되돌리도록 다시 마운트한다
          <div key={`${ticker}|${windowFrom}|${windowTo}|${rows.length}`} className="space-y-3">
            <ul className="flex flex-wrap gap-x-4 gap-y-1.5 pl-1 text-xs text-muted-foreground" aria-label="범례">
              {LEGEND_ITEMS.map((item) => (
                <li key={item.label} className="inline-flex items-center gap-1.5">
                  <span aria-hidden className={cn('inline-block', item.swatch)} />
                  {item.label}
                </li>
              ))}
            </ul>

            <figure className="w-full">
              <PanelLabel>{`${ticker} 가격`}</PanelLabel>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={rows} syncId={SYNC_ID} margin={MARGIN} title={`${ticker} 종가·평단가·주문 가격`}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                    <XAxis dataKey="date" hide />
                    <YAxis tickFormatter={(v) => fmtUsd(Number(v), 0)} tick={AXIS_TICK} tickLine={false} axisLine={false} width={Y_AXIS_WIDTH} domain={['auto', 'auto']} />
                    <Tooltip content={({ active, label }) => <ChartTooltip row={active ? rowByDate.get(String(label)) : undefined} ticker={ticker} />} cursor={CURSOR} />
                    {boundaries.map((d) => <ReferenceLine key={d} x={d} stroke="var(--muted-foreground)" strokeDasharray="4 4" />)}
                    {Array.from({ length: maxBuyOrders }, (_, i) => (
                      <Line key={`buy${i}`} dataKey={`buy${i}`} stroke="var(--pos)" strokeWidth={0} dot={ORDER_DOT_BUY} activeDot={false} isAnimationActive={false} />
                    ))}
                    {Array.from({ length: maxSellOrders }, (_, i) => (
                      <Line key={`sell${i}`} dataKey={`sell${i}`} stroke="var(--neg)" strokeWidth={0} dot={ORDER_DOT_SELL} activeDot={false} isAnimationActive={false} />
                    ))}
                    {/* 종가·평단가 선은 주문 점보다 나중에 그려 점에 가리지 않게 한다 */}
                    <Line dataKey="close" stroke="var(--chart-2)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                    <Line type="stepAfter" dataKey="avgPrice" stroke="var(--foreground)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </figure>

            <figure className="w-full">
              <PanelLabel>현금비중</PanelLabel>
              <div className="h-[110px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={rows} syncId={SYNC_ID} margin={MARGIN} title="현금비중">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                    <XAxis dataKey="date" hide />
                    <YAxis domain={[0, 1]} ticks={CASH_TICKS} tickFormatter={(v) => fmtPercent(Number(v))} tick={AXIS_TICK} tickLine={false} axisLine={false} width={Y_AXIS_WIDTH} />
                    <Tooltip content={() => null} cursor={CURSOR} />
                    <ReferenceArea y1={0} y2={CASH_THRESHOLD} fill="var(--warn-bg)" ifOverflow="hidden" />
                    <ReferenceLine y={CASH_THRESHOLD} stroke="var(--warn)" strokeDasharray="4 4" />
                    {boundaries.map((d) => <ReferenceLine key={d} x={d} stroke="var(--muted-foreground)" strokeDasharray="4 4" />)}
                    <Area type="stepAfter" dataKey="cashRatio" stroke="var(--info)" strokeWidth={1.5} fill="var(--info)" fillOpacity={0.15} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </figure>

            <figure className="w-full">
              <PanelLabel>사이클 실현손익</PanelLabel>
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={rows} syncId={SYNC_ID} margin={MARGIN} title="사이클 실현손익">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                    <XAxis dataKey="date" tickFormatter={(d) => fmtMonthDay(String(d))} tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={28} />
                    <YAxis tickFormatter={(v) => fmtUsd(Number(v), 0)} tick={AXIS_TICK} tickLine={false} axisLine={false} width={Y_AXIS_WIDTH} />
                    <Tooltip content={() => null} cursor={CURSOR} />
                    <ReferenceLine y={0} stroke="var(--muted-foreground)" />
                    {boundaries.map((d) => <ReferenceLine key={d} x={d} stroke="var(--muted-foreground)" strokeDasharray="4 4" />)}
                    {/* 구간 슬라이더 — 같은 syncId의 위 두 패널도 recharts가 같은 구간으로 맞춘다 */}
                    <Brush
                      dataKey="date"
                      height={24}
                      travellerWidth={10}
                      tickFormatter={(d) => fmtMonthDay(String(d))}
                      stroke="var(--muted-foreground)"
                      fill="var(--card)"
                    />
                    {/* 이익/손실을 0 기준 두 영역으로 나눠 칠한다 — 그라디언트 분기점은 Brush로 보이는 구간이 바뀌면 0과 어긋난다 */}
                    <Area type="stepAfter" dataKey={pnlProfit} stroke="var(--pos)" strokeWidth={1.5} fill="var(--pos)" fillOpacity={0.2} isAnimationActive={false} />
                    <Area type="stepAfter" dataKey={pnlLoss} stroke="var(--neg)" strokeWidth={1.5} fill="var(--neg)" fillOpacity={0.2} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </figure>

            {candlesQuery.isError ? (
              <p className="pl-1 text-xs text-[var(--warn)]">종가를 불러오지 못해 종가·현금비중을 표시하지 않습니다.</p>
            ) : missingCloseCount > 0 ? (
              <p className="pl-1 text-xs text-muted-foreground">종가 조회 범위(최대 5년) 밖이거나 종가가 없는 {missingCloseCount}일은 종가·현금비중을 표시하지 않습니다.</p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
