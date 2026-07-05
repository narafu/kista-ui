import { Skeleton } from '@/components/ui/skeleton'

export default function RejectedLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-pulse space-y-4">
        <Skeleton className="h-10 w-48 mx-auto" />
        <Skeleton className="h-20 w-full rounded-[var(--r-lg)]" />
        <Skeleton className="h-12 w-full rounded-[var(--r-lg)]" />
      </div>
    </div>
  )
}
