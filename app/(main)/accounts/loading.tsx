import { Skeleton } from '@/components/ui/skeleton'
import { CardSkeleton } from '@shared/ui/CardSkeleton'

// PageHeader(eyebrow + h1 + CTA)와 AccountsGrid(1/2/4열)의 실제 배치에 맞춘다
export default function AccountsLoading() {
  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-8">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-28" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} className="h-40" />
        ))}
      </div>
    </div>
  )
}
