'use client'

import type { ChangeEvent, FocusEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@shared/lib/utils'

function parseNumber(value: string): number | null {
  if (value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function exceedsMaxDecimals(raw: string, maxDecimals: number): boolean {
  const dotIndex = raw.indexOf('.')
  if (dotIndex === -1) return false
  return raw.length - dotIndex - 1 > maxDecimals
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
  maxDecimals,
}: {
  value: number | null
  onChange: (value: number | null) => void
  unit: string
  disabled: boolean
  ariaLabel?: string
  placeholder?: string
  wrapperClassName?: string
  unitClassName?: string
  maxDecimals?: number
}) {
  // 소수점 입력 중(예: "87.", "87.50") 문자열을 보존 — 매 렌더마다 value(파싱된 숫자)로 되돌리면 트레일링 점/0이 사라짐
  const [text, setText] = useState(value !== null ? String(value) : '')
  const emittedValueRef = useRef(value)

  useEffect(() => {
    if (value !== emittedValueRef.current) {
      emittedValueRef.current = value
      setText(value !== null ? String(value) : '')
    }
  }, [value])

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value
    if (maxDecimals !== undefined && exceedsMaxDecimals(raw, maxDecimals)) return
    setText(raw)
    const parsed = parseNumber(raw)
    emittedValueRef.current = parsed
    onChange(parsed)
  }

  return (
    <div className={cn(inputBoxClass(disabled), wrapperClassName)}>
      <input
        type="text"
        inputMode="decimal"
        aria-label={ariaLabel}
        value={text}
        onChange={handleChange}
        onFocus={handleFocus}
        disabled={disabled}
        placeholder={placeholder}
        className="flex-1 min-w-0 border-0 bg-transparent text-right text-base font-semibold outline-none disabled:text-muted-foreground"
      />
      <span className={cn('text-xs font-semibold text-muted-foreground', unitClassName)}>{unit}</span>
    </div>
  )
}
