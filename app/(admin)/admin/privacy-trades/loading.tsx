'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { ChartSkeleton } from '@widgets/admin-privacy-trade-list'

// 차트 카드 + 표 형태 — 서버에서 매매표를 prefetch하는 동안 보인다. 클라이언트 파일인 이유: ChartSkeleton이 같은 모듈의 훅과 함께 있다
export default function Loading() {
  return (
    <div className="animate-pulse">
      <Skeleton className="h-8 w-40 mb-6" />
      <div className="mb-6 rounded-[var(--r-lg)] border border-border bg-card p-4 sm:p-6">
        <ChartSkeleton />
      </div>
      <div className="rounded-[var(--r-lg)] border border-border bg-card overflow-hidden">
        <div className="h-12 bg-muted/50 border-b border-border" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 border-b border-border last:border-0 px-4 flex items-center gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
