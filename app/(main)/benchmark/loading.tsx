import { Skeleton } from '@/components/ui/skeleton'
import { CardSkeleton } from '@shared/ui/CardSkeleton'

export default function BenchmarkLoading() {
  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <Skeleton className="h-3 w-24 mb-2" />
          <Skeleton className="h-8 w-36" />
        </div>
      </div>
      <div className="flex gap-2 mb-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28" />
        ))}
      </div>
      <CardSkeleton className="h-72 mb-4" />
      <CardSkeleton className="h-32" />
    </div>
  )
}
