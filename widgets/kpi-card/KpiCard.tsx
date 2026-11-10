import { cn } from '@shared/lib/utils'
import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

interface Props {
  label: string
  /** 라벨 줄 오른쪽 코드형 단위(USDT·코인 티커) — 값 뒤에 붙이면 모바일 타일에서 줄바꿈된다 */
  unit?: string
  value?: ReactNode
  sub?: ReactNode
  className?: string
  valueClassName?: string
  skeleton?: boolean
}

export function KpiCard({ label, unit, value, sub, className, valueClassName, skeleton = false }: Props) {
  return (
    <div
      className={cn(
        'rounded-[var(--r-lg)] p-4 sm:p-5 flex flex-col gap-1 bg-card border border-border shadow-[var(--sh-card)]',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="min-w-0 text-base font-semibold tracking-widest uppercase text-[var(--brand-fg-soft)]">
          {label}
        </span>
        {unit && <span className="ml-2 shrink-0 whitespace-nowrap text-sm font-medium text-muted-foreground">{unit}</span>}
      </div>
      <div
        className={cn('text-2xl lg:text-3xl font-bold leading-tight text-foreground', valueClassName)}
      >
        {skeleton ? (
          <Skeleton className="h-7 w-20" />
        ) : value}
      </div>
      {sub && (
        <div className="text-base text-muted-foreground">
          {sub}
        </div>
      )}
    </div>
  )
}
