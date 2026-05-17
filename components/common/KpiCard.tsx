// components/common/KpiCard.tsx
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface Props {
  label: string
  value: ReactNode
  sub?: ReactNode
  variant?: 'default' | 'accent'
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
        className,
      )}
    >
      <span
        className={cn(
          'text-[11px] font-semibold tracking-widest uppercase',
          variant === 'default' ? 'text-rose-500' : 'text-white/80',
        )}
      >
        {label}
      </span>
      <div className={cn('text-2xl font-bold leading-tight', variant === 'default' ? 'text-foreground' : 'text-white')}>
        {value}
      </div>
      {sub && (
        <div className={cn('text-xs', variant === 'default' ? 'text-muted-foreground' : 'text-white/70')}>
          {sub}
        </div>
      )}
    </div>
  )
}
