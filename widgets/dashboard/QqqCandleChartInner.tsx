'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'
import { createChart, CandlestickSeries, ColorType, type IChartApi } from 'lightweight-charts'
import { useCandlesQuery } from '@entities/market'

export default function QqqCandleChartInner() {
  const { data: candles = [] } = useCandlesQuery('QQQ', 200)
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
      height: 300,
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

  return <div ref={containerRef} className="h-[300px] w-full" />
}
