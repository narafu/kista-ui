'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'
import { createChart, CandlestickSeries, ColorType, type IChartApi } from 'lightweight-charts'
import { Info } from 'lucide-react'
import { useCandlesQuery } from '@entities/market'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { MarketChartCategory } from './marketChartCategories'

interface Props {
  category: MarketChartCategory
}

export default function MarketChartCardInner({ category }: Props) {
  const [symbol, setSymbol] = useState(category.options[0].symbol)
  const selected = category.options.find((o) => o.symbol === symbol) ?? category.options[0]
  const { data: candles = [] } = useCandlesQuery(symbol, 200)
  const { resolvedTheme } = useTheme()
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // lightweight-charts는 캔버스 렌더링이라 CSS 변수를 직접 못 읽음 — 런타임에 실제 색상값 조회
    const style = getComputedStyle(document.documentElement)
    const background = style.getPropertyValue('--background').trim()
    const foreground = style.getPropertyValue('--foreground').trim()
    const border = style.getPropertyValue('--border').trim()
    const pos = style.getPropertyValue('--pos').trim() // 상승 — 빨강 (국내 관행)
    const neg = style.getPropertyValue('--neg').trim() // 하락 — 파랑 (국내 관행)

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
        .map((c) => ({
          time: c.date,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        })),
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
  }, [candles, mounted, resolvedTheme])

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold tracking-widest uppercase text-rose-500">{category.title}</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="text-muted-foreground hover:text-foreground transition-colors">
              <Info className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent>{selected.description}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
