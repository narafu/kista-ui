import { cn } from '@shared/lib/utils'
import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

interface Props {
  label: string
  labelAction?: ReactNode
  value?: ReactNode
  sub?: ReactNode
  variant?: 'default' | 'accent' | 'soft'
  className?: string
  valueClassName?: string
  skeleton?: boolean
}

export function KpiCard({ label, labelAction, value, sub, variant = 'default', className, valueClassName, skeleton = false }: Props) {
  return (
    <div
      className={cn(
        'rounded-[var(--r-lg)] p-5 flex flex-col gap-1',
        variant === 'default' && 'bg-card border border-border shadow-[var(--sh-card)]',
        variant === 'accent' && [
          'text-white',
          'bg-[image:var(--primary-grad)]',
          'shadow-[var(--primary-glow)]',
        ],
        variant === 'soft' && 'border border-rose-200',
        className,
      )}
      style={variant === 'soft' ? { background: 'var(--brand-soft-bg)' } : undefined}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'text-sm lg:text-base font-semibold tracking-widest uppercase',
            variant === 'default' && 'text-[var(--brand-fg-soft)]',
            variant === 'accent' && 'text-white/80',
            variant === 'soft' && 'text-[var(--brand-fg-soft)]',
          )}
        >
          {label}
        </span>
        {labelAction}
      </div>
      <div
        className={cn(
          'text-2xl lg:text-3xl font-bold leading-tight',
          variant === 'default' && 'text-foreground',
          variant === 'accent' && 'text-white',
          variant === 'soft' && 'text-[var(--brand-fg)]',
          valueClassName,
        )}
      >
        {skeleton ? (
          <Skeleton className="h-7 w-20" />
        ) : value}
      </div>
      {sub && (
        <div
          className={cn(
            'text-sm lg:text-base',
            variant === 'default' && 'text-muted-foreground',
            variant === 'accent' && 'text-white/70',
            variant === 'soft' && 'text-[var(--brand-fg-soft)]',
          )}
        >
          {sub}
        </div>
      )}
    </div>
  )
}
