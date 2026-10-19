'use client'

import { useEffect, useRef, useState } from 'react'
import { createChart, CandlestickSeries, ColorType, LineSeries, LineStyle, type IChartApi } from 'lightweight-charts'
import { Info } from 'lucide-react'
import { CHART_CANDLE_COUNT, useCandlesQuery } from '@entities/market'
import { rsi, sma } from '@shared/lib/indicators'
import { cn } from '@shared/lib/utils'
import { SegmentedToggle } from '@shared/ui/SegmentedToggle'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { MarketChartCategory } from './marketChartCategories'

const CANDLE_OPTIONS = [200, 120, 50, 20] as const
type CandleCount = (typeof CANDLE_OPTIONS)[number]

const CHART_HEIGHT = 280
const RSI_PANE_HEIGHT = 100
const RSI_PERIOD = 14
// 캔들이 상승 빨강(--pos)·하락 파랑(--neg)이라 겹치지 않는 금·초록 계열 자산 팔레트를 쓴다
const MA_LINES = [
  { period: 20, colorVar: '--asset-series-3' },
  { period: 60, colorVar: '--asset-series-5' },
] as const
const RSI_COLOR_VAR = '--asset-series-4'
const LINE_OPTIONS = { lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false } as const

// RSI 단일 on/off 토글용 — SegmentedToggle은 택1 그룹이라 쓰지 않고, 같은 카드의 SegmentedToggle(sm) 항목과 같은 색·크기를 맞춘다
function toggleButtonClass(active: boolean) {
  return cn(
    'text-xs px-1.5 py-1 rounded font-medium transition-colors',
    active ? 'bg-[var(--brand-fg-soft)] text-[var(--background)]' : 'text-muted-foreground hover:text-foreground hover:bg-accent',
  )
}

interface Props {
  category: MarketChartCategory
}

// Chrome 111+에서 getComputedStyle이 oklch를 lab() 형태로 반환하며 lightweight-charts가 파싱하지 못함.
// Canvas 픽셀 readback으로 항상 rgba()로 변환.
function toRgba(cssColor: string): string {
  if (cssColor.startsWith('rgb')) return cssColor
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = cssColor
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
  return `rgba(${r},${g},${b},${+(a / 255).toFixed(3)})`
}

function readVar(varName: string, prop: 'color' | 'background-color' = 'color'): string {
  const el = document.createElement('div')
  el.style.setProperty(prop, `var(${varName})`)
  document.body.appendChild(el)
  const raw = prop === 'color' ? getComputedStyle(el).color : getComputedStyle(el).backgroundColor
  el.remove()
  return toRgba(raw)
}

function readChartColors() {
  return {
    background: readVar('--background', 'background-color'),
    foreground: readVar('--foreground'),
    mutedForeground: readVar('--muted-foreground'),
    border: readVar('--border'),
    pos: readVar('--pos'),
    neg: readVar('--neg'),
    maLines: MA_LINES.map(({ colorVar }) => readVar(colorVar)),
    rsi: readVar(RSI_COLOR_VAR),
  }
}

export default function MarketChartCardInner({ category }: Props) {
  // eslint-disable-next-line react-doctor/no-derived-useState
  const [symbol, setSymbol] = useState(category.options[0].symbol)
  const [candleCount, setCandleCount] = useState<CandleCount>(200)
  const [showRsi, setShowRsi] = useState(false)
  const selected = category.options.find((o) => o.symbol === symbol) ?? category.options[0]
  // 이평선·RSI의 선행 구간을 채우려고 항상 최대치로 조회하고, 캔들 개수 선택은 보이는 범위로만 반영한다
  const { data: candles, isError, isPending } = useCandlesQuery(symbol, CHART_CANDLE_COUNT)
  // 컨테이너는 차트를 그릴 때만 마운트된다 — 다시 마운트될 때 새 컨테이너에 차트를 붙이도록 effect deps에 넣는다.
  // 재조회 실패는 이미 받은 candles를 덮지 않는다(데이터가 없을 때만 오류 표시)
  const showChart = !isPending && !!candles?.length
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container || !candles) return

    const { background, foreground, mutedForeground, border, pos, neg, maLines, rsi: rsiColor } = readChartColors()

    const chart = createChart(container, {
      width: container.clientWidth,
      height: showRsi ? CHART_HEIGHT + RSI_PANE_HEIGHT : CHART_HEIGHT,
      layout: {
        background: { type: ColorType.Solid, color: background },
        textColor: foreground,
      },
      grid: {
        vertLines: { color: border },
        horzLines: { color: border },
      },
      timeScale: { borderColor: border },
      rightPriceScale: { borderColor: border },
    })
    chartRef.current = chart

    const series = chart.addSeries(CandlestickSeries, {
      upColor: pos,
      downColor: neg,
      borderVisible: false,
      wickUpColor: pos,
      wickDownColor: neg,
    })

    const sorted = candles.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    // eslint-disable-next-line react-doctor/no-pass-live-state-to-parent
    series.setData( // eslint-disable-next-line react-doctor/no-pass-live-state-to-parent
      sorted.map((c) => ({ time: c.date, open: c.open, high: c.high, low: c.low, close: c.close })),
    )

    const closes = sorted.map((c) => c.close)
    const toLineData = (values: (number | null)[]) =>
      values.flatMap((value, index) => (value === null ? [] : [{ time: sorted[index].date, value }]))

    const maSeries = MA_LINES.map(({ period }, index) => {
      const line = chart.addSeries(LineSeries, { ...LINE_OPTIONS, color: maLines[index] })
      line.setData(toLineData(sma(closes, period)))
      return line
    })

    // RSI는 별도 pane(index 1)에 0~100 고정 눈금 + 70/30 기준선으로 그린다
    const rsiSeries = showRsi
      ? chart.addSeries(
          LineSeries,
          {
            ...LINE_OPTIONS,
            color: rsiColor,
            lastValueVisible: true,
            priceFormat: { type: 'price', precision: 0, minMove: 1 },
            autoscaleInfoProvider: () => ({ priceRange: { minValue: 0, maxValue: 100 } }),
          },
          1,
        )
      : null
    const rsiGuideLines = rsiSeries
      ? [70, 30].map((price) =>
          rsiSeries.createPriceLine({ price, color: mutedForeground, lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false }),
        )
      : []
    if (rsiSeries) {
      rsiSeries.setData(toLineData(rsi(closes, RSI_PERIOD)))
      chart.panes()[1]?.setHeight(RSI_PANE_HEIGHT)
    }

    const resizeObserver = new ResizeObserver(() => {
      chart.applyOptions({ width: container.clientWidth })
    })
    resizeObserver.observe(container)

    // html class 변경(테마 전환)을 감지해 차트 색상 갱신.
    // React effects는 자식→부모 순으로 실행되므로 ThemeProvider의 classList 업데이트보다
    // 이 effect가 먼저 실행됨. MutationObserver는 DOM 변경 직후 마이크로태스크로 실행되어
    // 타이밍 문제 없이 올바른 테마 색상을 읽음.
    const themeObserver = new MutationObserver(() => {
      const colors = readChartColors()
      chart.applyOptions({
        layout: { background: { type: ColorType.Solid, color: colors.background }, textColor: colors.foreground },
        grid: { vertLines: { color: colors.border }, horzLines: { color: colors.border } },
        timeScale: { borderColor: colors.border },
        rightPriceScale: { borderColor: colors.border },
      })
      series.applyOptions({ upColor: colors.pos, downColor: colors.neg, borderVisible: false, wickUpColor: colors.pos, wickDownColor: colors.neg })
      maSeries.forEach((line, index) => line.applyOptions({ color: colors.maLines[index] }))
      rsiSeries?.applyOptions({ color: colors.rsi })
      rsiGuideLines.forEach((line) => line.applyOptions({ color: colors.mutedForeground }))
    })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    return () => {
      resizeObserver.disconnect()
      themeObserver.disconnect()
      chart.remove()
      chartRef.current = null
    }
  }, [candles, showChart, showRsi])

  // 캔들 개수 선택 = 최근 N봉만 보이게 범위 지정 (차트를 다시 만들지 않는다)
  useEffect(() => {
    const chart = chartRef.current
    if (!chart || !candles?.length) return
    chart.timeScale().setVisibleLogicalRange({
      from: Math.max(0, candles.length - candleCount) - 0.5,
      to: candles.length - 0.5,
    })
  }, [candleCount, candles, showChart, showRsi])

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="text-sm font-semibold tracking-widest uppercase text-[var(--brand-fg-soft)]">{category.title}</span>
          <span className="text-xs text-muted-foreground">일봉</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <SegmentedToggle
            aria-label={`${category.title} 표시 캔들 수`}
            options={CANDLE_OPTIONS.map((n) => ({ value: n, label: String(n) }))}
            value={candleCount}
            onChange={setCandleCount}
            size="sm"
          />
          <Popover>
            <PopoverTrigger aria-label={`${selected.label} 설명`} className="inline-flex size-6 -my-[5px] items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <Info className="size-3.5" />
            </PopoverTrigger>
            <PopoverContent className="w-auto text-sm whitespace-nowrap">{selected.description}</PopoverContent>
          </Popover>
        </div>
      </div>
      <Select value={symbol} onValueChange={(value) => value && setSymbol(value)}>
        <SelectTrigger size="sm" className="w-full" aria-label={`${category.title} 종목 선택`}>
          <SelectValue>{selected.label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {category.options.map((option) => (
            <SelectItem key={option.symbol} value={option.symbol}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {MA_LINES.map(({ period, colorVar }) => (
            <span key={period} className="inline-flex items-center gap-1">
              <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ backgroundColor: `var(${colorVar})` }} />
              MA{period}
            </span>
          ))}
        </div>
        <button type="button" onClick={() => setShowRsi((prev) => !prev)} aria-pressed={showRsi} className={toggleButtonClass(showRsi)}>
          RSI
        </button>
      </div>
      {isError && !candles ? (
        <div className="flex h-[280px] items-center justify-center text-sm text-warn">시장 차트를 불러오지 못했습니다.</div>
      ) : isPending ? (
        <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">차트 불러오는 중…</div>
      ) : !showChart ? (
        <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">표시할 시세가 없습니다.</div>
      ) : (
        <div
          ref={containerRef}
          role="figure"
          aria-label={`${selected.label} 일봉 차트`}
          className={cn('w-full', showRsi ? 'h-[380px]' : 'h-[280px]')}
        />
      )}
    </>
  )
}
