import { Skeleton } from '@/components/ui/skeleton'
import { CardSkeleton } from '@shared/ui/CardSkeleton'

export default function StrategyDetailLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <Skeleton className="h-8 w-48" />
      <CardSkeleton className="h-20" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <CardSkeleton className="h-24" />
        <CardSkeleton className="h-24" />
        <CardSkeleton className="h-24" />
        <CardSkeleton className="h-24" />
      </div>
      <CardSkeleton className="h-40" />
      <CardSkeleton className="h-64" />
      <CardSkeleton className="h-16" />
    </div>
  )
}
