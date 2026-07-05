import { Skeleton } from '@/components/ui/skeleton'
import { CardSkeleton } from '@shared/ui/CardSkeleton'

export default function AccountDetailLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 gap-6">
        <CardSkeleton className="h-48" />
        <CardSkeleton className="h-48" />
      </div>
      <div className="grid grid-cols-2 gap-6">
        <CardSkeleton className="h-64" />
        <CardSkeleton className="h-64" />
      </div>
      <CardSkeleton className="h-40" />
    </div>
  )
}
