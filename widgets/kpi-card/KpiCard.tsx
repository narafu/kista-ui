import { cn } from '@shared/lib/utils'
import type { ReactNode } from 'react'

interface Props {
  label: string
  labelAction?: ReactNode
  value?: ReactNode
  sub?: ReactNode
  variant?: 'default' | 'accent' | 'soft'
  className?: string
  skeleton?: boolean
}

export function KpiCard({ label, labelAction, value, sub, variant = 'default', className, skeleton = false }: Props) {
  return (
    <div
      className={cn(
        'rounded-[var(--r-lg)] p-5 flex flex-col gap-1',
        variant === 'default' && 'bg-card border border-border shadow-[var(--sh-card)]',
        variant === 'accent' && [
          'text-white',
          'bg-[linear-gradient(135deg,var(--rose-600)_0%,var(--rose-400)_100%)]',
          'shadow-[var(--sh-rose)]',
        ],
        variant === 'soft' && 'border border-rose-200',
        className,
      )}
      style={variant === 'soft' ? { background: 'var(--brand-soft-bg)' } : undefined}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'text-[11px] font-semibold tracking-widest uppercase',
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
          'text-2xl font-bold leading-tight',
          variant === 'default' && 'text-foreground',
          variant === 'accent' && 'text-white',
          variant === 'soft' && 'text-[var(--brand-fg)]',
        )}
      >
        {skeleton ? (
          <div className="h-7 w-20 rounded bg-muted animate-pulse" />
        ) : value}
      </div>
      {sub && (
        <div
          className={cn(
            'text-xs',
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
