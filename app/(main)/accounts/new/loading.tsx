import { Skeleton } from '@/components/ui/skeleton'
import { CardSkeleton } from '@shared/ui/CardSkeleton'

export default function AccountNewLoading() {
  return (
    <div className="animate-pulse max-w-2xl mx-auto space-y-4">
      <Skeleton className="h-8 w-32 mb-6" />
      <Skeleton className="h-2 w-full rounded-full mb-8" />
      {Array.from({ length: 3 }).map((_, i) => (
        <CardSkeleton key={i} className="h-16" />
      ))}
    </div>
  )
}
