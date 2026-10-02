'use client'

import { cn } from '@shared/lib/utils'

interface Props<T> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  'aria-label': string
  // 컨테이너 레이아웃 오버라이드(예: 'grid w-full grid-cols-3'로 균등 분할)
  className?: string
  itemClassName?: string
}

// aria-pressed 버튼 그룹 형태의 세그먼트 토글(모드·기간·필터 선택 등).
export function SegmentedToggle<T extends string | number>({ options, value, onChange, 'aria-label': ariaLabel, className, itemClassName }: Props<T>) {
  return (
    <div role="group" aria-label={ariaLabel} className={cn('inline-flex rounded-md border border-border p-0.5', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'flex min-h-9 shrink-0 items-center justify-center rounded px-2 text-xs font-medium transition-colors',
            value === option.value
              ? 'bg-[var(--brand-fg-soft)] text-[var(--background)]'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent',
            itemClassName,
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
