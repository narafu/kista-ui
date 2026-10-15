import { Skeleton } from '@/components/ui/skeleton'
import { CardSkeleton } from '@shared/ui/CardSkeleton'

export default function BenchmarkLoading() {
  return (
    <div className="flex flex-col gap-4">
      {/* 실제 화면 구조(자산 토글 → 필터 3열 → 요약 카드 → 차트)에 맞춘다 */}
      <Skeleton className="h-10 w-full sm:w-[240px]" />
      <div className="grid gap-4 border-b border-border pb-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[60px]" />
        ))}
      </div>
      <CardSkeleton className="h-32" />
      <CardSkeleton className="h-72" />
    </div>
  )
}
