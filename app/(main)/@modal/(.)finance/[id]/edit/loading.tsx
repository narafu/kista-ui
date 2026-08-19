import { Skeleton } from '@/components/ui/skeleton'
import { CardSkeleton } from '@shared/ui/CardSkeleton'
import { RouteModal } from '@shared/ui/RouteModal'

export default function EditAssetModalLoading() {
  return (
    <RouteModal>
      <div className="animate-pulse space-y-4">
        <Skeleton className="h-8 w-32 mb-6" />
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} className="h-16" />
        ))}
      </div>
    </RouteModal>
  )
}
