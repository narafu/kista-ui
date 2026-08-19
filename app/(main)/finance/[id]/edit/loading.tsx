import { Skeleton } from '@/components/ui/skeleton'
import { CardSkeleton } from '@shared/ui/CardSkeleton'

export default function EditAssetLoading() {
  return (
    <div className="animate-pulse max-w-lg mx-auto space-y-4">
      <Skeleton className="h-8 w-32 mb-6" />
      {Array.from({ length: 4 }).map((_, i) => (
        <CardSkeleton key={i} className="h-16" />
      ))}
    </div>
  )
}
