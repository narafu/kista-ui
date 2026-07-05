import { Skeleton } from '@/components/ui/skeleton'
import { CardSkeleton } from '@shared/ui/CardSkeleton'

export default function AccountsLoading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <CardSkeleton key={i} className="h-44" />
        ))}
      </div>
    </div>
  )
}
