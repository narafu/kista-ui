import { Skeleton } from '@/components/ui/skeleton'
import { CardSkeleton } from '@shared/ui/CardSkeleton'

export default function DashboardLoading() {
  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <Skeleton className="h-3 w-20 mb-2" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} className="h-20" />
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <CardSkeleton key={i} className="h-40" />
        ))}
      </div>
    </div>
  )
}
