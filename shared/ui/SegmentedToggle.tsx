'use client'

import { cn } from '@shared/lib/utils'

interface Props<T> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  'aria-label': string
  className?: string
}

// 차트 헤더용 소형 세그먼트 토글(기간 선택 등) — aria-pressed 버튼 그룹.
export function SegmentedToggle<T extends string | number>({ options, value, onChange, 'aria-label': ariaLabel, className }: Props<T>) {
  return (
    <div role="group" aria-label={ariaLabel} className={cn('inline-flex shrink-0 rounded-md border border-border p-0.5', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'flex min-h-8 items-center justify-center rounded px-2 text-xs font-medium transition-colors',
            value === option.value
              ? 'bg-[var(--brand-fg-soft)] text-[var(--background)]'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
