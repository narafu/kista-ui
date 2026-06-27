'use client'

import { useEffect, useRef, useState } from 'react'
import { createChart, CandlestickSeries, ColorType, type IChartApi } from 'lightweight-charts'
import { Info } from 'lucide-react'
import { useCandlesQuery } from '@entities/market'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { MarketChartCategory } from './marketChartCategories'

const CANDLE_OPTIONS = [200, 120, 50, 20] as const
type CandleCount = (typeof CANDLE_OPTIONS)[number]

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
    border: readVar('--border'),
    pos: readVar('--pos'),
    neg: readVar('--neg'),
  }
}

export default function MarketChartCardInner({ category }: Props) {
  const [symbol, setSymbol] = useState(category.options[0].symbol)
  const [candleCount, setCandleCount] = useState<CandleCount>(200)
  const selected = category.options.find((o) => o.symbol === symbol) ?? category.options[0]
  const { data: candles = [] } = useCandlesQuery(symbol, candleCount)
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const { background, foreground, border, pos, neg } = readChartColors()

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 280,
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

    series.setData(
      candles
        .toSorted((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
        .map((c) => ({ time: c.date, open: c.open, high: c.high, low: c.low, close: c.close })),
    )
    chart.timeScale().fitContent()

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
    })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    return () => {
      resizeObserver.disconnect()
      themeObserver.disconnect()
      chart.remove()
      chartRef.current = null
    }
  }, [candles])

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold tracking-widest uppercase text-[var(--brand-fg-soft)]">{category.title}</span>
          <span className="text-xs text-muted-foreground">일봉</span>
        </div>
        <div className="flex items-center gap-1">
          {CANDLE_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setCandleCount(n)}
              className={`text-xs px-1.5 py-0.5 rounded font-medium transition-colors ${
                candleCount === n
                  ? 'bg-[var(--brand-fg-soft)] text-[var(--background)]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {n}
            </button>
          ))}
          <Popover>
            <PopoverTrigger className="ml-1 text-muted-foreground hover:text-foreground transition-colors">
              <Info className="size-3.5" />
            </PopoverTrigger>
            <PopoverContent className="w-auto text-sm whitespace-nowrap">{selected.description}</PopoverContent>
          </Popover>
        </div>
      </div>
      <Select value={symbol} onValueChange={(value) => value && setSymbol(value)}>
        <SelectTrigger size="sm" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {category.options.map((option) => (
            <SelectItem key={option.symbol} value={option.symbol}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div ref={containerRef} className="h-[280px] w-full" />
    </>
  )
}
