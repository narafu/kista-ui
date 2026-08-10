'use client'

import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const AssetCompositionInner = dynamic(() => import('./AssetCompositionInner'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground sm:h-[280px]">
      차트 불러오는 중…
    </div>
  ),
})

export function AssetComposition() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base lg:text-lg">월별 구성비</CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-4 sm:px-6 sm:pb-6">
        <AssetCompositionInner />
      </CardContent>
    </Card>
  )
}
