import { Skeleton } from '@/components/ui/skeleton'

export default function AdminSettingsLoading() {
  return (
    <div>
      <Skeleton className="mb-6 h-8 w-40" />
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {Array.from({ length: 4 }).map((_, section) => (
          <div key={section} className="space-y-3 border-b border-border px-4 py-4 last:border-0 sm:px-5">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
