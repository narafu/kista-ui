'use client'

import { useRef } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'

interface Props {
  value: string
  onChange: (v: string) => void
  max: number | null        // null = 계산 불가
  min: number               // INFINITE=1, PRIVACY=0.5
  step: number              // INFINITE=0.1, PRIVACY=0.5
  disabled?: boolean
  loading?: boolean
}

function snapToStep(raw: number, step: number): number {
  const precision = Math.round(1 / step)
  return Math.round(raw * precision) / precision
}

function floorToStep(raw: number, step: number): number {
  const precision = Math.round(1 / step)
  return Math.floor(raw * precision) / precision
}

export function MultipleInput({ value, onChange, max, min, step, disabled, loading }: Props) {
  const prevRef = useRef(value)

  const parsed = parseFloat(value)
  const isValid = !isNaN(parsed)

  function handleBlur() {
    if (!value.trim()) return
    const raw = parseFloat(value)
    if (isNaN(raw)) {
      onChange(prevRef.current)
      return
    }
    // MIN 미만 → min으로 스냅
    if (raw < min) {
      onChange(String(min))
      prevRef.current = String(min)
      return
    }
    // MAX 초과 → 조용히 복원 (alert 없음, 부모 multipleError로 표시됨)
    if (max !== null && raw > max) {
      onChange(prevRef.current)
      return
    }
    // step 단위 스냅
    const snapped = snapToStep(raw, step)
    if (Math.abs(snapped - raw) > 1e-9) {
      onChange(String(snapped))
      prevRef.current = String(snapped)
      toast.info(`${step} 단위로 조정되었습니다: ${snapped}`)
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

  function increment(dir: 1 | -1) {
    const current = isValid ? parsed : min
    const next = snapToStep(current + dir * step, step)
    if (next < min) return
    if (max !== null && next > max) return  // atMax로 버튼 disabled 처리됨
    onChange(String(next))
    prevRef.current = String(next)
  }

  function handleMax() {
    if (max === null) return
    const maxVal = floorToStep(max, step)
    onChange(String(maxVal))
    prevRef.current = String(maxVal)
  }

  const atMin = isValid && parsed <= min
  const atMax = max !== null && isValid && parsed >= floorToStep(max, step)
  const maxDisabled = max === null || disabled || loading

  return (
    <div className="flex gap-2 items-center">
      {/* 감소 버튼 */}
      <button
        type="button"
        onClick={() => increment(-1)}
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
        aria-label={`${step} 감소`}
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
        placeholder={loading ? '조회 중...' : String(min)}
        className="text-center flex-1"
        style={{ minWidth: 0 }}
      />

      {/* 증가 버튼 */}
      <button
        type="button"
        onClick={() => increment(1)}
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
        aria-label={`${step} 증가`}
      >
        +
      </button>

      {/* MAX 버튼 */}
      <button
        type="button"
        onClick={handleMax}
        disabled={maxDisabled}
        title={loading ? '기준가 조회 중' : max === null ? '기준가 없음' : `MAX ${floorToStep(max, step)}배`}
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
