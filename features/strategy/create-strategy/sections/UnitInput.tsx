'use client'

import type { FocusEvent } from 'react'
import { cn } from '@shared/lib/utils'

function parseNumber(value: string): number | null {
  if (value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function handleFocus(event: FocusEvent<HTMLInputElement>) {
  event.currentTarget.select()
}

function inputBoxClass(disabled: boolean) {
  return cn(
    'flex items-center h-11 rounded-[var(--r-sm)] bg-card px-3',
    disabled
      ? 'opacity-50 border border-border'
      : 'border border-[var(--rose-400)] shadow-[0_0_0_3px_rgba(203,131,106,0.18)]',
  )
}

// 우측 정렬 숫자 입력 + 단위 라벨 — VR 상세 설정, 중간부터 시작(평단가·수량) 등 여러 섹션이 공유하는 마크업
export function UnitInput({
  value,
  onChange,
  unit,
  disabled,
  ariaLabel,
  placeholder,
  wrapperClassName,
  unitClassName,
}: {
  value: number | null
  onChange: (value: number | null) => void
  unit: string
  disabled: boolean
  ariaLabel?: string
  placeholder?: string
  wrapperClassName?: string
  unitClassName?: string
}) {
  return (
    <div className={cn(inputBoxClass(disabled), wrapperClassName)}>
      <input
        type="text"
        inputMode="decimal"
        aria-label={ariaLabel}
        value={value ?? ''}
        onChange={(event) => onChange(parseNumber(event.target.value))}
        onFocus={handleFocus}
        disabled={disabled}
        placeholder={placeholder}
        className="flex-1 min-w-0 border-0 bg-transparent text-right text-base font-semibold outline-none disabled:text-muted-foreground"
      />
      <span className={cn('text-xs font-semibold text-muted-foreground', unitClassName)}>{unit}</span>
    </div>
  )
}
