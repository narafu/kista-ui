import { Skeleton } from '@/components/ui/skeleton'

export default function AdminLogsLoading() {
  return (
    <div>
      <Skeleton className="h-8 w-40 mb-6" />
      <div className="flex gap-2 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      <div className="space-y-8">
        {Array.from({ length: 3 }).map((_, section) => (
          <div key={section} className="rounded-[var(--r-lg)] border border-border bg-card p-4 lg:p-5">
            <Skeleton className="h-6 w-32 mb-4" />
            {Array.from({ length: 3 }).map((_, row) => (
              <div key={row} className="h-14 border-b border-border last:border-0 flex items-center gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24 ml-auto" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
