import { Skeleton } from '@/components/ui/skeleton'

export default function AdminSettingsLoading() {
  return (
    <div className="animate-pulse">
      <Skeleton className="mb-6 h-8 w-40" />
      <div className="space-y-1 rounded-lg border border-border p-5">
        {Array.from({ length: 7 }).map((_, index) => <Skeleton key={index} className="h-11 w-full" />)}
      </div>
    </div>
  )
}
