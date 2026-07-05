import { Skeleton } from '@/components/ui/skeleton'

export default function AdminSubLoading() {
  return (
    <div className="animate-pulse">
      <Skeleton className="h-8 w-40 mb-6" />
      <div className="rounded-[var(--r-lg)] border border-border bg-card overflow-hidden">
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
