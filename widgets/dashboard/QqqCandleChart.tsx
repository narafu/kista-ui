'use client'

import dynamic from 'next/dynamic'

const QqqCandleChartInner = dynamic(() => import('./QqqCandleChartInner'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
      차트 불러오는 중...
    </div>
  ),
})

export function QqqCandleChart() {
  return (
    <div className="rounded-[var(--r-lg)] p-5 flex flex-col gap-1 bg-card border border-border shadow-[var(--sh-card)]">
      <span className="text-[11px] font-semibold tracking-widest uppercase text-rose-500">
        QQQ 일봉
      </span>
      <QqqCandleChartInner />
    </div>
  )
}
