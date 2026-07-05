import { Skeleton } from '@/components/ui/skeleton'

export default function AdminLogsLoading() {
  return (
    <div className="animate-pulse">
      <Skeleton className="h-8 w-40 mb-6" />
      <div className="flex gap-2 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="h-12 bg-muted/50 border-b border-border" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 border-b border-border last:border-0 px-4 flex items-center gap-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
