import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@shared/lib/utils'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected: boolean
  children: ReactNode
}

export function SelectionCard({
  selected,
  className,
  type = 'button',
  children,
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={cn(
        'min-h-11 rounded-[var(--r-sm)] border text-left transition-[border-color,background-color,color,box-shadow] duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-50',
        selected
          ? 'border-2 border-[var(--selection-border)] bg-[var(--selection-bg)] text-[var(--selection-fg)] shadow-[0_0_0_3px_var(--selection-halo)]'
          : 'border border-border bg-card text-foreground enabled:hover:border-[var(--selection-hover-border)]',
        className,
      )}
      {...props}
      aria-pressed={selected}
    >
      {children}
    </button>
  )
}
