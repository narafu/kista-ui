import { Skeleton } from '@/components/ui/skeleton'

export default function AdminOverviewLoading() {
  return (
    <div className="animate-pulse">
      <Skeleton className="h-8 w-40 mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-[var(--r-lg)]" />
        ))}
      </div>
      <Skeleton className="h-6 w-28 mb-4" />
      <div className="grid gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] rounded-[var(--r-lg)]" />
        ))}
      </div>
    </div>
  )
}
