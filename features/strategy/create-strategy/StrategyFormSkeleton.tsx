'use client'

function PulseBox({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />
}

export function StrategyFormSkeleton({ hasCancel = true }: { hasCancel?: boolean }) {
  return (
    <div>
      {/* 매매 전략 */}
      <div className="py-[18px] border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <PulseBox className="h-3.5 w-16" />
          <PulseBox className="h-3 w-20" />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <PulseBox className="h-[58px]" />
          <PulseBox className="h-[58px]" />
        </div>
      </div>

      {/* 종목 */}
      <div className="py-[18px] border-b border-border">
        <PulseBox className="h-3.5 w-10 mb-3" />
        <div className="flex gap-2 overflow-x-auto px-1 py-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <PulseBox key={i} className="shrink-0 w-[78px] h-[56px]" />
          ))}
        </div>
      </div>

      {/* 시드 금액 */}
      <div className="py-[18px] border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <PulseBox className="h-3.5 w-16" />
          <PulseBox className="h-3 w-28" />
        </div>
        <PulseBox className="h-14" />
        <PulseBox className="h-[46px] mt-2" />
      </div>

      {/* 사이클 연속여부 */}
      <div className="py-[18px] border-b border-border">
        <PulseBox className="h-3.5 w-24 mb-3" />
        <PulseBox className="h-[66px]" />
      </div>

      {/* 시드 모드 */}
      <div className="py-[18px] border-b border-border">
        <PulseBox className="h-3.5 w-14 mb-3" />
        <div className="grid grid-cols-2 gap-2.5">
          <PulseBox className="h-16" />
          <PulseBox className="h-16" />
        </div>
      </div>

      {/* 버튼 */}
      <div className="flex gap-2.5 py-6">
        {hasCancel && <PulseBox className="flex-1 h-[46px]" />}
        <PulseBox className={hasCancel ? 'flex-[1.5] h-[46px]' : 'flex-1 h-[46px]'} />
      </div>
    </div>
  )
}
