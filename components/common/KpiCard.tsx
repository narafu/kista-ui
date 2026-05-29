// components/common/KpiCard.tsx
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface Props {
  label: string
  value: ReactNode
  sub?: ReactNode
  variant?: 'default' | 'accent' | 'soft'
  className?: string
}

export function KpiCard({ label, value, sub, variant = 'default', className }: Props) {
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
      <span
        className={cn(
          'text-[11px] font-semibold tracking-widest uppercase',
          variant === 'default' && 'text-rose-500',
          variant === 'accent' && 'text-white/80',
          variant === 'soft' && 'text-[var(--brand-fg-soft)]',
        )}
      >
        {label}
      </span>
      <div
        className={cn(
          'text-2xl font-bold leading-tight',
          variant === 'default' && 'text-foreground',
          variant === 'accent' && 'text-white',
          variant === 'soft' && 'text-[var(--brand-fg)]',
        )}
      >
        {value}
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
