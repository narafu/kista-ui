import { Skeleton } from '@/components/ui/skeleton'
import { CardSkeleton } from '@shared/ui/CardSkeleton'

// PageHeader(eyebrow + h1 + CTA)와 AllStrategiesList(1/4열 그리드)의 실제 배치에 맞춘다
export default function StrategiesLoading() {
  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-8">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-4 lg:gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} className="h-16 lg:h-36" />
        ))}
      </div>
    </div>
  )
}
