import { Skeleton } from '@/components/ui/skeleton'

export default function AdminPendingLoading() {
  return (
    <div className="animate-pulse">
      <Skeleton className="h-8 w-40 mb-8" />
      <div className="grid gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] rounded-[var(--r-lg)]" />
        ))}
      </div>
    </div>
  )
}
