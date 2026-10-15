'use client'

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { MouseHandlerDataParam } from 'recharts'
// 부모 PrivacyBaseChart.tsx의 next/dynamic({ ssr: false }) 셸이 이 파일 자체를 지연 로드한다. 룰은 파일 간
// 도달 가능성을 보지 않고 recharts import를 정적으로만 감지해 분리 구조와 무관하게 항상 발화한다
// (asset-trend/AssetTrendInner.tsx 등 기존 recharts 위젯과 동일한 처리).
// eslint-disable-next-line react-doctor/prefer-dynamic-import
import { Area, Brush, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AXIS_TICK } from '@shared/lib/chart/axisTick'
import { fmtMonthDay, fmtSignedPercent, fmtSignedUsd, fmtUsd, pnlTextClass } from '@shared/lib/format'
import { cn } from '@shared/lib/utils'
import { CASH_THRESHOLD, PANEL_HEIGHT, SWATCH, Swatch, avgGapLevel, fmtPercent, useIsNarrow } from './privacyChartParts'
import type { PrivacyChartRow } from './model/privacyChartSeries'

interface Props {
  rows: PrivacyChartRow[]
  ticker: string
  showOrders: boolean
  showAvgGap: boolean
}

const SYNC_ID = 'privacy-base-chart'
const Y_AXIS_WIDTH = 52
// 세 패널의 플롯 영역 좌우 끝을 맞추기 위해 margin·축 폭을 공유한다
// right는 Brush 끝 날짜 라벨이 잘리지 않을 만큼 둔다
const MARGIN = { top: 4, right: 40, left: 0, bottom: 0 }
// 모바일은 Brush가 없어 끝 날짜 라벨 여백이 필요 없다 — 좁은 화면에서 플롯 폭을 돌려받는다
const MARGIN_NARROW = { ...MARGIN, right: 12 }
// 매수는 채운 원, 매도는 속이 빈 원 — 색만으로 구분하지 않는다
const ORDER_DOT_BUY = { r: 3, fill: 'var(--pos)', stroke: 'none' }
const ORDER_DOT_SELL = { r: 3, fill: 'var(--card)', stroke: 'var(--neg)', strokeWidth: 1.5 }
const CURSOR = { stroke: 'var(--muted-foreground)', strokeDasharray: '3 3' }
const CASH_TICKS = [0, 0.5, 1]

function fmtPrices(prices: number[]) {
  return prices.length > 0 ? prices.map((p) => fmtUsd(p)).join(' · ') : '-'
}

// 평단가 + 종가 기준 평가 손익률. 예: 137.00(-19.3%)
function fmtAvgPrice(avgPrice: number | null, close: number | null | undefined) {
  if (avgPrice == null) return '-'
  return close == null || avgPrice <= 0 ? fmtUsd(avgPrice) : `${fmtUsd(avgPrice)}(${fmtSignedPercent((close - avgPrice) / avgPrice)})`
}

// 괴리 강조가 켜졌을 때 평단가 값 글자색 — 차트 선과 같은 단계 색을 쓴다
function avgGapTextClass(row: PrivacyChartRow, showAvgGap: boolean) {
  if (!showAvgGap) return undefined
  const level = avgGapLevel(row.close, row.avgPrice)
  return level === 2 ? 'font-semibold text-[var(--avg-gap-2)]' : level === 1 ? 'text-[var(--avg-gap-1)]' : undefined
}

// 현금비중 + 추정 현금. 예: 21%(2,519.69)
function fmtCash(row: PrivacyChartRow) {
  if (row.cashRatio == null) return '-'
  return row.cash == null ? fmtPercent(row.cashRatio) : `${fmtPercent(row.cashRatio)}(${fmtUsd(row.cash)})`
}

// 기간 표기 — 2026/09/15~2026/10/15
function fmtPeriod(from: string, to: string) {
  return `${from.replaceAll('-', '/')}~${to.replaceAll('-', '/')}`
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
function ChartTooltip({ row, ticker, showAvgGap }: { row: PrivacyChartRow | undefined; ticker: string; showAvgGap: boolean }) {
  if (!row) return null
  const cashLow = row.cashRatio != null && row.cashRatio < CASH_THRESHOLD
  return (
    <div className="min-w-52 max-w-[calc(100vw-2rem)] space-y-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs shadow-md">
      <div className="font-semibold">{row.date}</div>
      <TooltipSection title={`${ticker} 가격`}>
        <TooltipRow label="종가" value={row.close == null ? '-' : fmtUsd(row.close)} swatch={SWATCH.close} />
        <TooltipRow label="평단가" value={fmtAvgPrice(row.avgPrice, row.close)} swatch={SWATCH.avgPrice} className={avgGapTextClass(row, showAvgGap)} />
        <TooltipRow label="매수" value={fmtPrices(row.buys)} swatch={SWATCH.buy} className="text-pos" />
        <TooltipRow label="매도" value={fmtPrices(row.sells)} swatch={SWATCH.sell} className="text-neg" />
      </TooltipSection>
      <TooltipSection title="현금비중">
        <TooltipRow
          label="현금비중"
          value={fmtCash(row)}
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

// 모바일 전용 고정 정보 줄 — 떠다니는 툴팁은 가격 패널 안에만 떠서, 가격 패널이 화면 위로 스크롤된 상태에서
// 아래 패널을 누르면 헤더에 가린다. 좁은 화면에서는 툴팁 대신 화면 하단에 붙는 이 줄에 그날 값을 보여준다
function MobileInfoBar({ row, isLatest, showAvgGap }: { row: PrivacyChartRow; isLatest: boolean; showAvgGap: boolean }) {
  const cashLow = row.cashRatio != null && row.cashRatio < CASH_THRESHOLD
  return (
    <div className="sticky bottom-0 z-10 -mx-2 border-t border-border bg-card/95 px-3 py-2 text-xs backdrop-blur sm:hidden">
      <div className="mb-1 font-semibold">
        {row.date}
        {isLatest && <span className="ml-1 font-normal text-muted-foreground">(최신 · 차트를 누르면 바뀝니다)</span>}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 tabular-nums">
        {/* 평단가에 손익률이 붙어 반칸 폭이면 잘려, 종가와 함께 내용 폭대로 양끝 정렬한다 */}
        <div className="col-span-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
          <InfoItem swatch={SWATCH.close} label="종가" value={row.close == null ? '-' : fmtUsd(row.close)} inline />
          <InfoItem swatch={SWATCH.avgPrice} label="평단가" value={fmtAvgPrice(row.avgPrice, row.close)} className={avgGapTextClass(row, showAvgGap)} inline />
        </div>
        <InfoItem swatch={SWATCH.buy} label="매수" value={fmtPrices(row.buys)} className="text-pos" wide />
        <InfoItem swatch={SWATCH.sell} label="매도" value={fmtPrices(row.sells)} className="text-neg" wide />
        {/* 현금비중·누적 실현손익은 비중/손익 요약끼리 한 줄로 묶는다 — 반칸 폭에 넣으면 긴 값이 잘려 내용 폭대로 양끝 정렬 */}
        <div className="col-span-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
          <InfoItem
            swatch={cashLow ? SWATCH.cashLow : SWATCH.cash}
            label="현금비중"
            value={fmtCash(row)}
            className={cashLow ? 'text-[var(--warn)]' : undefined}
            inline
          />
          <InfoItem swatch={SWATCH.cumulative} label="누적 실현손익" value={fmtSignedUsd(row.cumulativePnl)} className={cn('font-semibold', pnlTextClass(row.cumulativePnl))} inline />
        </div>
      </div>
    </div>
  )
}

function InfoItem({ swatch, label, value, className, wide, inline }: { swatch: string; label: string; value: string; className?: string; wide?: boolean; inline?: boolean }) {
  return (
    <div className={cn('flex min-w-0 items-center gap-1.5', wide && 'col-span-2', inline && 'shrink-0')}>
      <Swatch className={swatch} />
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className={cn('font-medium', inline ? 'ml-1' : 'ml-auto truncate', className)}>{value}</span>
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

export default function PrivacyBaseChartInner({ rows, ticker, showOrders, showAvgGap }: Props) {
  // 주문 점 계열 수는 보이는 기간 기준 — 전체 이력 최대치로 그리면 빈 계열이 생긴다
  // 호버마다 다시 그려지므로 rows에서 파생되는 값은 한 번만 계산한다
  const { maxBuyOrders, maxSellOrders, rowByDate, boundaries } = useMemo(() => ({
    maxBuyOrders: Math.max(0, ...rows.map((r) => r.buys.length)),
    maxSellOrders: Math.max(0, ...rows.map((r) => r.sells.length)),
    rowByDate: new Map(rows.map((r) => [r.date, r])),
    boundaries: rows.filter((r) => r.cycleBoundary).map((r) => r.date),
  }), [rows])

  // 괴리 단계가 같은 연속 구간 → 배경 띠. x축이 날짜 점(폭 없음)이라 평단가 계단(stepAfter)처럼 구간 마지막 날의
  // 다음 날 x까지 칠한다 — 하루짜리 구간도 폭이 생긴다. ponytail: 마지막 날 하루만 해당하면 폭 0이라 안 보인다(툴팁·정보 줄 색으로 대신)
  const avgGapBands = useMemo(() => {
    if (!showAvgGap) return []
    const bands: Array<{ x1: string; x2: string; level: 1 | 2 }> = []
    rows.forEach((r, i) => {
      const level = avgGapLevel(r.close, r.avgPrice)
      const x2 = rows[i + 1]?.date ?? r.date
      const prev = bands[bands.length - 1]
      if (level === 0) return
      if (prev?.level === level && prev.x2 === r.date) prev.x2 = x2
      else bands.push({ x1: r.date, x2, level })
    })
    return bands
  }, [rows, showAvgGap])

  // 마지막으로 가리키거나 누른 날짜 — 모바일 정보 줄이 쓴다(없으면 최신 일자)
  const [activeDate, setActiveDate] = useState<string | null>(null)
  // PC는 떠다니는 툴팁을 쓰고 정보 줄이 숨겨져 있어, 좁은 화면에서만 상태를 갱신해 호버마다 세 차트를 다시 그리지 않는다
  const narrow = useIsNarrow()
  const pickActive = (state: MouseHandlerDataParam) => {
    if (state.activeLabel == null || !narrow) return
    setActiveDate(String(state.activeLabel))
  }

  const first = rows[0]
  const last = rows[rows.length - 1]
  const activeRow = (activeDate ? rowByDate.get(activeDate) : undefined) ?? last
  const lastClose = rows.findLast((r) => r.close != null)
  const lastCash = rows.findLast((r) => r.cashRatio != null)
  const lowCashDays = rows.filter((r) => r.cashRatio != null && r.cashRatio < CASH_THRESHOLD).length
  const period = `${first.date}부터 ${last.date}까지 ${rows.length}일`

  const priceSummary = [
    lastClose?.close != null ? `종가 ${fmtUsd(lastClose.close)}` : null,
    last.avgPrice != null ? `평단가 ${fmtAvgPrice(last.avgPrice, lastClose?.close)}` : null,
  ].filter(Boolean).join(' · ')
  const cashSummary = lastCash ? fmtCash(lastCash) : ''
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
            <ComposedChart data={rows} syncId={SYNC_ID} margin={narrow ? MARGIN_NARROW : MARGIN} onMouseMove={pickActive} onClick={pickActive} onTouchMove={pickActive} title={`${ticker} 종가·평단가·주문 가격`}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
              <XAxis dataKey="date" hide />
              <YAxis tickFormatter={(v) => fmtUsd(Number(v), 0)} tick={AXIS_TICK} tickLine={false} axisLine={false} width={Y_AXIS_WIDTH} domain={['auto', 'auto']} />
              {/* 아래 패널을 눌러도 툴팁이 가격 패널 위쪽에 고정돼 화면 밖으로 밀리지 않게 y를 고정한다 */}
              <Tooltip position={{ y: 0 }} content={({ active, label }) => <div className="hidden sm:block"><ChartTooltip row={active ? rowByDate.get(String(label)) : undefined} ticker={ticker} showAvgGap={showAvgGap} /></div>} cursor={CURSOR} />
              {/* 괴리 구간은 패널 전체 높이 배경 띠 — 선 굵기만으로는 눈에 덜 띄어 면적으로 보여준다(현금비중 50% 미만 음영과 같은 방식) */}
              {avgGapBands.map((b) => (
                <ReferenceArea key={b.x1} x1={b.x1} x2={b.x2} fill={b.level === 2 ? 'var(--avg-gap-2-bg)' : 'var(--avg-gap-1-bg)'} fillOpacity={1} ifOverflow="hidden" />
              ))}
              {boundaries.map((d) => <ReferenceLine key={d} x={d} stroke="var(--muted-foreground)" strokeDasharray="4 4" />)}
              {showOrders && Array.from({ length: maxBuyOrders }, (_, i) => (
                <Line key={`buy${i}`} dataKey={`buy${i}`} stroke="var(--pos)" strokeWidth={0} dot={ORDER_DOT_BUY} activeDot={false} isAnimationActive={false} />
              ))}
              {showOrders && Array.from({ length: maxSellOrders }, (_, i) => (
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
            <ComposedChart data={rows} syncId={SYNC_ID} margin={narrow ? MARGIN_NARROW : MARGIN} onMouseMove={pickActive} onClick={pickActive} onTouchMove={pickActive} title="현금비중">
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

      <p className="hidden pl-1 text-xs text-muted-foreground sm:block">아래 슬라이더로 구간을 조절합니다.</p>

      <figure className="w-full">
        <PanelCaption
          title="누적 실현손익"
          summary={`${pnlSummary} (${fmtPeriod(first.date, last.date)})`}
          srOnly={`${period}. 기간 마지막 날 누적 실현손익 ${pnlSummary}.`}
        />
        <div className={PANEL_HEIGHT.pnl}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} syncId={SYNC_ID} margin={narrow ? MARGIN_NARROW : MARGIN} onMouseMove={pickActive} onClick={pickActive} onTouchMove={pickActive} title="누적 실현손익">
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
              <XAxis dataKey="date" tickFormatter={(d) => fmtMonthDay(String(d))} tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={28} />
              <YAxis tickFormatter={(v) => fmtUsd(Number(v), 0)} tick={AXIS_TICK} tickLine={false} axisLine={false} width={Y_AXIS_WIDTH} />
              <Tooltip content={() => null} cursor={CURSOR} />
              <ReferenceLine y={0} stroke="var(--muted-foreground)" />
              {boundaries.map((d) => <ReferenceLine key={d} x={d} stroke="var(--muted-foreground)" strokeDasharray="4 4" />)}
              {/* 구간 슬라이더 — 같은 syncId의 위 두 패널도 recharts가 같은 구간으로 맞춘다.
                  라벨 글자색은 recharts가 stroke를 그대로 쓰므로 stroke가 곧 텍스트 토큰이다 */}
              {/* 모바일은 손잡이가 작아 조작이 어렵고 상단 기간 필터로 충분해 PC에만 둔다 */}
              {!narrow && <Brush
                dataKey="date"
                height={32}
                travellerWidth={18}
                tickFormatter={(d) => fmtMonthDay(String(d))}
                stroke="var(--muted-foreground)"
                fill="var(--card)"
              />}
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
      <MobileInfoBar row={activeRow} isLatest={activeRow === last} showAvgGap={showAvgGap} />
    </div>
  )
}
