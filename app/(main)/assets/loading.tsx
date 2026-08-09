import { Skeleton } from '@/components/ui/skeleton'
import { CardSkeleton } from '@shared/ui/CardSkeleton'

export default function AssetsLoading() {
  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <Skeleton className="h-3 w-16 mb-2" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} className="h-14" />
        ))}
      </div>
    </div>
  )
}
