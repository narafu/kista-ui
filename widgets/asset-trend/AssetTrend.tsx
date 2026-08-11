'use client'

import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const AssetTrendInner = dynamic(() => import('./AssetTrendInner'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[240px] flex-1 items-center justify-center text-sm text-muted-foreground sm:min-h-[280px]">
      차트 불러오는 중…
    </div>
  ),
})

export function AssetTrend() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base lg:text-lg">월별 추이</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <AssetTrendInner />
      </CardContent>
    </Card>
  )
}
