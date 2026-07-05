import { Skeleton } from '@/components/ui/skeleton'
import { CardSkeleton } from '@shared/ui/CardSkeleton'

export default function SettingsLoading() {
  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <Skeleton className="h-3 w-12 mb-2" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>
      <div className="flex flex-col gap-[18px]">
        {Array.from({ length: 3 }).map((_, i) => (
          <CardSkeleton key={i} className="h-40" />
        ))}
      </div>
    </div>
  )
}
