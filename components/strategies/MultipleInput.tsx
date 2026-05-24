'use client'

import { useRef } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Props {
  value: string
  onChange: (v: string) => void
  max: number | null        // null = 계산 불가 (기준가 없음)
  disabled?: boolean
  loading?: boolean         // 기준가 조회 중
}

const STEP = 0.5
const MIN = 0.5

function snapToStep(raw: number): number {
  return Math.round(raw / STEP) * STEP
}

function floorToStep(raw: number): number {
  return Math.floor(raw / STEP) * STEP
}

export function MultipleInput({ value, onChange, max, disabled, loading }: Props) {
  const prevRef = useRef(value) // blur 시 MAX 초과 복원용

  const parsed = parseFloat(value)
  const isValid = !isNaN(parsed)

  function handleBlur() {
    if (!value.trim()) return
    const raw = parseFloat(value)
    if (isNaN(raw)) {
      onChange(prevRef.current)
      return
    }

    // MAX 초과 검사
    if (max !== null && raw > max) {
      alert(`최대 ${max}배까지 입력 가능합니다 (예수금 기준)`)
      onChange(prevRef.current)
      return
    }

    // 0.5 단위 스냅
    const snapped = snapToStep(raw)
    if (Math.abs(snapped - raw) > 1e-9) {
      onChange(String(snapped))
      toast.info(`0.5 단위로 조정되었습니다: ${snapped}`)
    } else {
      prevRef.current = value
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value)
  }

  function handleFocus() {
    prevRef.current = value
  }

  function step(dir: 1 | -1) {
    const current = isValid ? parsed : 0
    const next = current + dir * STEP
    if (next < MIN) return
    if (max !== null && next > max) {
      alert(`최대 ${max}배까지 입력 가능합니다 (예수금 기준)`)
      return
    }
    // 부동소수점 오차 방지
    const rounded = Math.round(next * 10) / 10
    onChange(String(rounded))
    prevRef.current = String(rounded)
  }

  function handleMax() {
    if (max === null) return
    const maxVal = floorToStep(max)
    onChange(String(maxVal))
    prevRef.current = String(maxVal)
  }

  const atMin = isValid && parsed <= MIN
  const atMax = max !== null && isValid && parsed >= floorToStep(max)
  const maxDisabled = max === null || disabled || loading

  return (
    <div className="flex gap-2 items-center">
      {/* 감소 버튼 */}
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={disabled || loading || atMin}
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--card)',
          cursor: disabled || loading || atMin ? 'not-allowed' : 'pointer',
          fontSize: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: disabled || loading || atMin ? 'var(--muted-foreground)' : 'var(--foreground)',
          transition: 'opacity .15s',
          opacity: disabled || loading || atMin ? 0.4 : 1,
        }}
        aria-label="0.5 감소"
      >
        −
      </button>

      {/* 직접 입력 */}
      <Input
        id="multiple"
        inputMode="decimal"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        disabled={disabled || loading}
        placeholder={loading ? '조회 중...' : '1.0'}
        className="text-center flex-1"
        style={{ minWidth: 0 }}
      />

      {/* 증가 버튼 */}
      <button
        type="button"
        onClick={() => step(1)}
        disabled={disabled || loading || atMax}
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--card)',
          cursor: disabled || loading || atMax ? 'not-allowed' : 'pointer',
          fontSize: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: disabled || loading || atMax ? 'var(--muted-foreground)' : 'var(--foreground)',
          transition: 'opacity .15s',
          opacity: disabled || loading || atMax ? 0.4 : 1,
        }}
        aria-label="0.5 증가"
      >
        +
      </button>

      {/* MAX 버튼 */}
      <button
        type="button"
        onClick={handleMax}
        disabled={maxDisabled}
        title={loading ? '기준가 조회 중' : max === null ? '기준가 없음' : `MAX ${floorToStep(max)}배`}
        style={{
          height: 36,
          padding: '0 12px',
          borderRadius: 8,
          border: `1px solid ${maxDisabled ? 'var(--border)' : 'var(--rose-400)'}`,
          background: maxDisabled ? 'var(--muted)' : 'var(--rose-50)',
          color: maxDisabled ? 'var(--muted-foreground)' : 'var(--rose-600)',
          fontSize: 12,
          fontWeight: 700,
          cursor: maxDisabled ? 'not-allowed' : 'pointer',
          flexShrink: 0,
          transition: 'opacity .15s',
          opacity: maxDisabled ? 0.5 : 1,
          letterSpacing: '0.05em',
        }}
        aria-label="MAX 배수 자동 입력"
      >
        MAX
      </button>
    </div>
  )
}
