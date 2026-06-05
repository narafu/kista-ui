'use client'

import dynamic from 'next/dynamic'
import type { PortfolioSnapshot } from '@entities/trade'

interface Props {
  snapshots: PortfolioSnapshot[]
}

const PortfolioChartInner = dynamic(() => import('./PortfolioChartInner'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
      차트 불러오는 중...
    </div>
  ),
})

export function PortfolioChart({ snapshots }: Props) {
  if (snapshots.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
        데이터가 없습니다
      </div>
    )
  }

  return <PortfolioChartInner snapshots={snapshots} />
}
