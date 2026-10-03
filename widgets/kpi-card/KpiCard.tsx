import { cn } from '@shared/lib/utils'
import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

interface Props {
  label: string
  labelAction?: ReactNode
  value?: ReactNode
  sub?: ReactNode
  className?: string
  valueClassName?: string
  skeleton?: boolean
}

export function KpiCard({ label, labelAction, value, sub, className, valueClassName, skeleton = false }: Props) {
  return (
    <div
      className={cn(
        'rounded-[var(--r-lg)] p-4 sm:p-5 flex flex-col gap-1 bg-card border border-border shadow-[var(--sh-card)]',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold tracking-widest uppercase text-[var(--brand-fg-soft)]">
          {label}
        </span>
        {labelAction}
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
