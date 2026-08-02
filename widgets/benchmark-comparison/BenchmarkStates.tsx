import { Skeleton } from '@/components/ui/skeleton'

export function BenchmarkLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col gap-4"
      aria-label="벤치마크 비교 불러오는 중"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <Skeleton className="col-span-2 h-28 sm:col-span-1" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton data-testid="housing-benchmark-chart-skeleton" className="min-h-[240px] sm:min-h-[300px]" />
    </div>
  )
}

export function StrategyListLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="전략 목록 불러오는 중"
      className="rounded-[var(--r-lg)] border border-border bg-card p-5"
    >
      <Skeleton className="h-20 w-full" />
    </div>
  )
}
