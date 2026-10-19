'use client'

import type { ChangeEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@shared/lib/utils'
import { selectAllOnFocus } from '@shared/ui/select-all-on-focus'

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

// 포커스 표시는 공용 Input(components/ui/input)과 같은 ring 토큰을 쓴다 — 같은 폼에 둘이 섞여 있다.
// SeedAmountInput·PercentGauge의 상시 rose 테두리는 포커스가 아닌 강조라 유지하고, 포커스 ring만 같은 걸 덧씌운다
function inputBoxClass(disabled: boolean) {
  return cn(
    'flex items-center h-11 rounded-[var(--r-sm)] bg-card px-3 border border-[var(--border-strong)] transition-[border-color,box-shadow] duration-150',
    disabled ? 'opacity-50' : 'focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
  )
}

// 우측 정렬 숫자 입력 + 단위 라벨 — VR 상세 설정, 중간부터 시작(평단가·수량), 백테스트 폼 등 여러 도메인이 공유하는 마크업
export function UnitInput({
  id,
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
  // 바깥 <Label htmlFor>와 연결
  id?: string
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

  // 외부(폼 reset 등)에서 value가 바뀐 경우에만 버퍼를 되돌린다 — key 리마운트는 매 키 입력마다 포커스가 끊긴다
  // eslint-disable-next-line react-doctor/no-reset-all-state-on-prop-change -- 입력 중간 상태 보존용 하이브리드 컨트롤드 인풋
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
    // 상자 전체(패딩·단위 포함)를 눌러도 입력으로 포커스가 가도록 label로 감싼다 — 바깥 <Label htmlFor>와 별개
    <label className={cn(inputBoxClass(disabled), wrapperClassName)}>
      {/* 단위·기호를 품은 컨테이너가 테두리·포커스를 그리므로 안쪽은 공용 Input이 아닌 투명 raw input */}
      <input
        id={id}
        type="text"
        inputMode="decimal"
        aria-label={ariaLabel}
        value={text}
        onChange={handleChange}
        onFocus={selectAllOnFocus}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={20}
        className="flex-1 min-w-0 border-0 bg-transparent text-right text-base font-semibold outline-none disabled:pointer-events-none disabled:text-muted-foreground"
      />
      <span className={cn('text-xs font-semibold text-muted-foreground', unitClassName)}>{unit}</span>
    </label>
  )
}
