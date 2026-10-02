import { cn } from '@shared/lib/utils'
import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

type Variant = NonNullable<Props['variant']>

const CONTAINER_CLASS: Record<Variant, string> = {
  default: 'bg-card border border-border shadow-[var(--sh-card)]',
  accent: 'text-white bg-[image:var(--primary-grad)] shadow-[var(--primary-glow)]',
  soft: 'border border-rose-200',
}
const LABEL_CLASS: Record<Variant, string> = {
  default: 'text-[var(--brand-fg-soft)]',
  accent: 'text-white/80',
  soft: 'text-[var(--brand-fg-soft)]',
}
const VALUE_CLASS: Record<Variant, string> = {
  default: 'text-foreground',
  accent: 'text-white',
  soft: 'text-[var(--brand-fg)]',
}
const SUB_CLASS: Record<Variant, string> = {
  default: 'text-muted-foreground',
  accent: 'text-white/70',
  soft: 'text-[var(--brand-fg-soft)]',
}

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
        'rounded-[var(--r-lg)] p-4 sm:p-5 flex flex-col gap-1',
        CONTAINER_CLASS[variant],
        className,
      )}
      style={variant === 'soft' ? { background: 'var(--brand-soft-bg)' } : undefined}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'text-base font-semibold tracking-widest uppercase',
            LABEL_CLASS[variant],
          )}
        >
          {label}
        </span>
        {labelAction}
      </div>
      <div
        className={cn(
          'text-2xl lg:text-3xl font-bold leading-tight',
          VALUE_CLASS[variant],
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
            'text-base',
            SUB_CLASS[variant],
          )}
        >
          {sub}
        </div>
      )}
    </div>
  )
}
