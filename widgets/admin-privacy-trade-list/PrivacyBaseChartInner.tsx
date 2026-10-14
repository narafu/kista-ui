'use client'

import { useMemo } from 'react'
import type { ReactNode } from 'react'
// 부모 PrivacyBaseChart.tsx의 next/dynamic({ ssr: false }) 셸이 이 파일 자체를 지연 로드한다. 룰은 파일 간
// 도달 가능성을 보지 않고 recharts import를 정적으로만 감지해 분리 구조와 무관하게 항상 발화한다
// (asset-trend/AssetTrendInner.tsx 등 기존 recharts 위젯과 동일한 처리).
// eslint-disable-next-line react-doctor/prefer-dynamic-import
import { Area, Brush, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AXIS_TICK } from '@shared/lib/chart/axisTick'
import { fmtMonthDay, fmtSignedUsd, fmtUsd, pnlTextClass } from '@shared/lib/format'
import { cn } from '@shared/lib/utils'
import { CASH_THRESHOLD, PANEL_HEIGHT, SWATCH, Swatch, fmtPercent } from './privacyChartParts'
import type { PrivacyChartRow } from './model/privacyChartSeries'

interface Props {
  rows: PrivacyChartRow[]
  ticker: string
}

const SYNC_ID = 'privacy-base-chart'
const Y_AXIS_WIDTH = 52
// 세 패널의 플롯 영역 좌우 끝을 맞추기 위해 margin·축 폭을 공유한다
// right는 Brush 끝 날짜 라벨이 잘리지 않을 만큼 둔다
const MARGIN = { top: 4, right: 40, left: 0, bottom: 0 }
// 매수는 채운 원, 매도는 속이 빈 원 — 색만으로 구분하지 않는다
const ORDER_DOT_BUY = { r: 3, fill: 'var(--pos)', stroke: 'none' }
const ORDER_DOT_SELL = { r: 3, fill: 'var(--card)', stroke: 'var(--neg)', strokeWidth: 1.5 }
const CURSOR = { stroke: 'var(--muted-foreground)', strokeDasharray: '3 3' }
const CASH_TICKS = [0, 0.5, 1]

function fmtPrices(prices: number[]) {
  return prices.length > 0 ? prices.map((p) => fmtUsd(p)).join(' · ') : '-'
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

function pnlSwatch(value: number) {
  return value > 0 ? SWATCH.profit : value < 0 ? SWATCH.loss : SWATCH.flat
}

// 툴팁 묶음은 위에서 아래로 차트 패널 순서(가격 → 현금비중 → 누적 실현손익)와 같게 둔다
function TooltipSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-0.5 border-t border-border pt-1.5">
      <div className="text-[11px] text-muted-foreground">{title}</div>
      {children}
    </div>
  )
}

// 툴팁은 가격 패널에만 두고 그날 지표를 한 번에 보여준다 — 세 패널이 각자 툴팁을 띄우면 화면을 덮는다.
// 같은 syncId라 아래 두 패널을 만지거나 가리켜도 이 툴팁이 활성화된다.
// payload는 값이 null인 계열을 걸러내 종가·평단가·주문이 모두 없는 날엔 비므로, 행은 label(날짜)로 찾는다
function ChartTooltip({ row, ticker }: { row: PrivacyChartRow | undefined; ticker: string }) {
  if (!row) return null
  const cashLow = row.cashRatio != null && row.cashRatio < CASH_THRESHOLD
  return (
    <div className="min-w-52 max-w-[calc(100vw-2rem)] space-y-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs shadow-md">
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
      <TooltipSection title="누적 실현손익">
        <TooltipRow label="사이클 시작금액" value={fmtUsd(row.cycleStart)} swatch={SWATCH.flat} />
        <TooltipRow label="확정 손익" value={fmtSignedUsd(row.confirmedPnl)} swatch={pnlSwatch(row.confirmedPnl)} className={pnlTextClass(row.confirmedPnl)} />
        <TooltipRow label="진행 사이클 손익" value={fmtSignedUsd(row.realizedPnl)} swatch={pnlSwatch(row.realizedPnl)} className={pnlTextClass(row.realizedPnl)} />
        {row.yearlyReset && (
          <TooltipRow
            label="연초 재설정(추정)"
            value={row.resetEstimatedPnl == null ? '추정 불가' : fmtSignedUsd(row.resetEstimatedPnl)}
            swatch={pnlSwatch(row.resetEstimatedPnl ?? 0)}
            className={row.resetEstimatedPnl == null ? 'text-[var(--warn)]' : pnlTextClass(row.resetEstimatedPnl)}
          />
        )}
        <TooltipRow label="누적 실현손익" value={fmtSignedUsd(row.cumulativePnl)} swatch={SWATCH.cumulative} className={cn('font-semibold', pnlTextClass(row.cumulativePnl))} />
      </TooltipSection>
    </div>
  )
}

const confirmedProfit = (row: PrivacyChartRow) => Math.max(row.confirmedPnl, 0)
const confirmedLoss = (row: PrivacyChartRow) => Math.min(row.confirmedPnl, 0)

// 패널 제목 겸 요약 — 값이 툴팁에만 있으면 스크린리더·터치 사용자가 읽을 수 없어 최신 값을 캡션으로 노출한다
function PanelCaption({ title, summary, srOnly }: { title: string; summary: string; srOnly: string }) {
  return (
    <figcaption className="pl-1 text-xs">
      <span className="font-medium text-muted-foreground">{title}</span>
      {summary && <span className="ml-2 tabular-nums text-foreground">{summary}</span>}
      <span className="sr-only">{srOnly}</span>
    </figcaption>
  )
}

export default function PrivacyBaseChartInner({ rows, ticker }: Props) {
  // 주문 점 계열 수는 보이는 기간 기준 — 전체 이력 최대치로 그리면 빈 계열이 생긴다
  // 호버마다 다시 그려지므로 rows에서 파생되는 값은 한 번만 계산한다
  const { maxBuyOrders, maxSellOrders, rowByDate, boundaries } = useMemo(() => ({
    maxBuyOrders: Math.max(0, ...rows.map((r) => r.buys.length)),
    maxSellOrders: Math.max(0, ...rows.map((r) => r.sells.length)),
    rowByDate: new Map(rows.map((r) => [r.date, r])),
    boundaries: rows.filter((r) => r.cycleBoundary).map((r) => r.date),
  }), [rows])

  const first = rows[0]
  const last = rows[rows.length - 1]
  const lastClose = rows.findLast((r) => r.close != null)
  const lastCash = rows.findLast((r) => r.cashRatio != null)
  const lowCashDays = rows.filter((r) => r.cashRatio != null && r.cashRatio < CASH_THRESHOLD).length
  const period = `${first.date}부터 ${last.date}까지 ${rows.length}일`

  const priceSummary = [
    lastClose?.close != null ? `종가 ${fmtUsd(lastClose.close)}` : null,
    last.avgPrice != null ? `평단가 ${fmtUsd(last.avgPrice)}` : null,
  ].filter(Boolean).join(' · ')
  const cashSummary = lastCash?.cashRatio != null ? fmtPercent(lastCash.cashRatio) : ''
  const pnlSummary = fmtSignedUsd(last.cumulativePnl)

  return (
    <div className="space-y-3">
      <figure className="w-full">
        <PanelCaption
          title={`${ticker} 가격`}
          summary={priceSummary ? `${priceSummary} (최신)` : ''}
          srOnly={`${period}. 최신 ${last.date} 기준 ${priceSummary || '종가·평단가 없음'}.`}
        />
        <div className={PANEL_HEIGHT.price}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} syncId={SYNC_ID} margin={MARGIN} title={`${ticker} 종가·평단가·주문 가격`}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
              <XAxis dataKey="date" hide />
              <YAxis tickFormatter={(v) => fmtUsd(Number(v), 0)} tick={AXIS_TICK} tickLine={false} axisLine={false} width={Y_AXIS_WIDTH} domain={['auto', 'auto']} />
              {/* 아래 패널을 눌러도 툴팁이 가격 패널 위쪽에 고정돼 화면 밖으로 밀리지 않게 y를 고정한다 */}
              <Tooltip position={{ y: 0 }} content={({ active, label }) => <ChartTooltip row={active ? rowByDate.get(String(label)) : undefined} ticker={ticker} />} cursor={CURSOR} />
              {boundaries.map((d) => <ReferenceLine key={d} x={d} stroke="var(--muted-foreground)" strokeDasharray="4 4" />)}
              {Array.from({ length: maxBuyOrders }, (_, i) => (
                <Line key={`buy${i}`} dataKey={`buy${i}`} stroke="var(--pos)" strokeWidth={0} dot={ORDER_DOT_BUY} activeDot={false} isAnimationActive={false} />
              ))}
              {Array.from({ length: maxSellOrders }, (_, i) => (
                <Line key={`sell${i}`} dataKey={`sell${i}`} stroke="var(--neg)" strokeWidth={0} dot={ORDER_DOT_SELL} activeDot={false} isAnimationActive={false} />
              ))}
              {/* 종가·평단가 선은 주문 점보다 나중에 그려 점에 가리지 않게 한다. 종가는 매일 바뀌는 값이라 곡선,
                  평단가는 체결 때만 바뀌므로 계단+점선으로 구분한다 */}
              <Line type="monotone" dataKey="close" stroke="var(--chart-2)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              <Line type="stepAfter" dataKey="avgPrice" stroke="var(--foreground)" strokeWidth={1.5} strokeDasharray="5 3" dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </figure>

      <figure className="w-full">
        <PanelCaption
          title="현금비중"
          summary={cashSummary ? `${cashSummary} (최신)` : ''}
          srOnly={`${cashSummary ? `최신 ${lastCash?.date} 기준 ${cashSummary}` : '현금비중 데이터 없음'}. 50% 미만인 날 ${lowCashDays}일.`}
        />
        <div className={PANEL_HEIGHT.cash}>
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

      <p className="pl-1 text-xs text-muted-foreground">아래 슬라이더로 구간을 조절합니다.</p>

      <figure className="w-full">
        <PanelCaption
          title="누적 실현손익"
          summary={`${pnlSummary} (기간 합계)`}
          srOnly={`${period}. 기간 마지막 날 누적 실현손익 ${pnlSummary}.`}
        />
        <div className={PANEL_HEIGHT.pnl}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} syncId={SYNC_ID} margin={MARGIN} title="누적 실현손익">
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
              <XAxis dataKey="date" tickFormatter={(d) => fmtMonthDay(String(d))} tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={28} />
              <YAxis tickFormatter={(v) => fmtUsd(Number(v), 0)} tick={AXIS_TICK} tickLine={false} axisLine={false} width={Y_AXIS_WIDTH} />
              <Tooltip content={() => null} cursor={CURSOR} />
              <ReferenceLine y={0} stroke="var(--muted-foreground)" />
              {boundaries.map((d) => <ReferenceLine key={d} x={d} stroke="var(--muted-foreground)" strokeDasharray="4 4" />)}
              {/* 구간 슬라이더 — 같은 syncId의 위 두 패널도 recharts가 같은 구간으로 맞춘다.
                  라벨 글자색은 recharts가 stroke를 그대로 쓰므로 stroke가 곧 텍스트 토큰이다 */}
              <Brush
                dataKey="date"
                height={32}
                travellerWidth={18}
                tickFormatter={(d) => fmtMonthDay(String(d))}
                stroke="var(--muted-foreground)"
                fill="var(--card)"
              />
              {/* 확정분(종료 사이클 손익 = 시작금액 증감)은 0 기준 이익/손실 두 영역으로 칠하고(그라디언트 분기점은
                  Brush로 보이는 구간이 바뀌면 0과 어긋난다), 진행 중 사이클까지 더한 누적은 선으로 얹는다.
                  영역과 선 사이 간격이 진행 중 사이클 손익이다 */}
              <Area type="stepAfter" dataKey={confirmedProfit} stroke="none" activeDot={false} fill="var(--pos)" fillOpacity={0.25} isAnimationActive={false} />
              <Area type="stepAfter" dataKey={confirmedLoss} stroke="none" activeDot={false} fill="var(--neg)" fillOpacity={0.25} isAnimationActive={false} />
              <Line type="stepAfter" dataKey="cumulativePnl" stroke="var(--chart-4)" strokeWidth={2} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </figure>
    </div>
  )
}
