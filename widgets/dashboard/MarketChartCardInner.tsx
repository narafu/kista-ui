'use client'

import { useEffect, useRef, useState } from 'react'
import { createChart, CandlestickSeries, ColorType, type IChartApi } from 'lightweight-charts'
import { Info } from 'lucide-react'
import { useCandlesQuery } from '@entities/market'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { MarketChartCategory } from './marketChartCategories'

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
  const selected = category.options.find((o) => o.symbol === symbol) ?? category.options[0]
  const { data: candles = [] } = useCandlesQuery(symbol, 200)
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)

  // 부모(MarketChartCard)가 key={resolvedTheme}으로 테마 변경 시 이 컴포넌트를 완전 재마운트함.
  // 여기서는 candles 변경(종목 전환)만 처리하면 됨.
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
      [...candles]
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
        .map((c) => ({ time: c.date, open: c.open, high: c.high, low: c.low, close: c.close })),
    )
    chart.timeScale().fitContent()

    const resizeObserver = new ResizeObserver(() => {
      chart.applyOptions({ width: container.clientWidth })
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      chart.remove()
      chartRef.current = null
    }
  }, [candles])

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold tracking-widest uppercase text-rose-500">{category.title}</span>
        <Popover>
          <PopoverTrigger className="text-muted-foreground hover:text-foreground transition-colors">
            <Info className="size-3.5" />
          </PopoverTrigger>
          <PopoverContent className="w-auto text-xs whitespace-nowrap">{selected.description}</PopoverContent>
        </Popover>
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
