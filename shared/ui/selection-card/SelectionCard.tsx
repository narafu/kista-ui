import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@shared/lib/utils'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected: boolean
  showIndicator?: boolean
  children: ReactNode
}

export function SelectionCard({
  selected,
  showIndicator = false,
  className,
  type = 'button',
  children,
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={cn(
        'relative min-h-11 rounded-[var(--r-sm)] border text-left transition-[border-color,background-color,color,box-shadow] duration-150',
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
      {selected && showIndicator && (
        <span
          data-testid="selection-indicator"
          aria-hidden="true"
          className="absolute right-3 bottom-3 grid size-4 place-items-center rounded-full bg-[var(--selection-indicator-bg)] text-[10px] font-extrabold leading-none text-[var(--selection-indicator-fg)]"
        >
          ✓
        </span>
      )}
    </button>
  )
}
