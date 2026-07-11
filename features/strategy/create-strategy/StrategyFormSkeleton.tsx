import { Skeleton } from '@/components/ui/skeleton'

export function StrategyFormSkeleton({ hasCancel = true }: { hasCancel?: boolean }) {
  return (
    <div>
      {/* 매매 전략 */}
      <div className="py-[18px] border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-3.5 w-16 rounded" />
          <Skeleton className="h-3 w-20 rounded" />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Skeleton className="h-[58px] rounded" />
          <Skeleton className="h-[58px] rounded" />
        </div>
      </div>

      {/* 종목 */}
      <div className="py-[18px] border-b border-border">
        <Skeleton className="h-3.5 w-10 mb-3 rounded" />
        <div className="flex gap-2 overflow-x-auto px-1 py-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="shrink-0 w-[78px] h-[56px] rounded" />
          ))}
        </div>
      </div>

      {/* 시작금액 / 시드 영역 공용 스켈레톤 */}
      <div className="py-[18px] border-b border-border">
        <Skeleton className="h-4 w-24 mb-3 rounded" />
        <Skeleton className="h-12 w-full rounded-[var(--r-sm)]" />
      </div>

      {/* 사이클 연속여부 */}
      <div className="py-[18px] border-b border-border">
        <Skeleton className="h-3.5 w-24 mb-3 rounded" />
        <Skeleton className="h-[66px] rounded" />
      </div>

      {/* 시드 모드 */}
      <div className="py-[18px] border-b border-border">
        <Skeleton className="h-3.5 w-14 mb-3 rounded" />
        <div className="grid grid-cols-2 gap-2.5">
          <Skeleton className="h-16 rounded" />
          <Skeleton className="h-16 rounded" />
        </div>
      </div>

      {/* 버튼 */}
      <div className="flex gap-2.5 py-6">
        {hasCancel && <Skeleton className="flex-1 h-[46px] rounded" />}
        <Skeleton className={hasCancel ? 'flex-[1.5] h-[46px] rounded' : 'flex-1 h-[46px] rounded'} />
      </div>
    </div>
  )
}
