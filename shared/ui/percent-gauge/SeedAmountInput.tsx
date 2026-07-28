'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@shared/lib/utils'
import { fmtUsd } from '@shared/lib/format'

interface Props {
  value: number | null
  onChange: (v: number | null) => void
  deposit: number | null
  minSeed: number | null
  disabled?: boolean
  showStatus?: boolean
}

// 정수부(선택) + 소수점(선택) + 소수부 0~2자리
const AMOUNT_PATTERN = /^\d*\.?\d{0,2}$/

export function SeedAmountInput({ value, onChange, deposit, minSeed, disabled, showStatus = true }: Props) {
  // 컨트롤드 인풋이지만 "12." 같은 입력 중간 상태(소수점만 입력된 상태)를 value(number)로는
  // 표현할 수 없어 별도 문자열 버퍼로 표시값을 관리한다. 외부(최소 시드 자동 동기화 등)에서
  // value가 바뀐 경우에만 버퍼를 되돌린다 — 이 컴포넌트 스스로 emit한 변경은 제외.
  const [text, setText] = useState(value !== null ? String(value) : '')
  const lastEmitted = useRef(value)

  useEffect(() => {
    if (value === lastEmitted.current) return
    lastEmitted.current = value
    setText(value !== null ? String(value) : '')
  }, [value])

  function handleChange(raw: string) {
    const sanitized = raw.replace(/[^\d.]/g, '')
    if (!AMOUNT_PATTERN.test(sanitized)) return
    setText(sanitized)
    const next = sanitized === '' || sanitized === '.' ? null : Number(sanitized)
    lastEmitted.current = next
    onChange(next)
  }

  const shortage =
    deposit !== null && value !== null && value > 0 && deposit < value
      ? value - deposit
      : null
  const sufficient = deposit !== null && value !== null && value > 0 && deposit >= value

  return (
    <div className="min-w-0">
      <div
        className={cn(
          'min-w-0 rounded-lg border bg-card flex items-center px-3.5 h-10 mb-3',
          disabled ? 'opacity-50' : 'border-[var(--rose-400)] shadow-[0_0_0_3px_rgba(203,131,106,0.18)]',
        )}
      >
        <span className="text-sm font-extrabold text-[var(--rose-600)] mr-1.5">$</span>
        <input
          type="text"
          inputMode="decimal"
          aria-label="예수금 (USD)"
          value={text}
          disabled={disabled}
          placeholder="0"
          maxLength={18}
          onChange={(e) => handleChange(e.target.value)}
          className="flex-1 border-0 outline-none bg-transparent font-extrabold text-foreground text-right min-w-0 text-lg"
        />
        <span className="text-xs font-semibold text-muted-foreground ml-1.5">USD</span>
      </div>

      {!showStatus ? null : deposit === null ? (
        <div className="flex justify-between items-center px-3 py-2.5 rounded-[var(--r-sm)] bg-muted border border-border">
          <span className="text-sm text-muted-foreground font-bold">예수금 조회 불가</span>
          <span className="text-sm text-muted-foreground">KIS 연결 확인 필요</span>
        </div>
      ) : minSeed !== null && value !== null && value > 0 && value < minSeed ? (
        <div className="flex justify-between items-center px-3 py-2.5 rounded-[var(--r-sm)] bg-[var(--warn-bg)] border border-[var(--warn)]">
          <span className="text-sm text-[var(--warn)] font-bold">최소 시드 미달</span>
          <span className="text-sm font-extrabold text-[var(--warn)] tabular-nums">
            최소 ${fmtUsd(minSeed)}
          </span>
        </div>
      ) : shortage !== null ? (
        <div className="flex justify-between items-center px-3 py-2.5 rounded-[var(--r-sm)] bg-muted border border-border">
          <span className="text-sm text-muted-foreground font-medium">추가 입금 필요</span>
          <span className="text-sm font-semibold text-foreground tabular-nums">
            ${fmtUsd(shortage)}
            <span className="text-sm font-normal opacity-60 ml-1.5">
              보유 ${fmtUsd(deposit)}
            </span>
          </span>
        </div>
      ) : sufficient ? (
        <div className="flex justify-between items-center px-3 py-2.5 rounded-[var(--r-sm)] bg-[var(--brand-soft-bg)] border border-[var(--rose-200)]">
          <span className="text-sm text-[var(--brand-fg-soft)] font-bold">예수금으로 즉시 시작 가능</span>
          <span className="text-sm font-extrabold text-[var(--brand-fg)] tabular-nums">✓</span>
        </div>
      ) : (
        <div className="flex justify-between items-center px-3 py-2.5 rounded-[var(--r-sm)] bg-muted border border-border">
          <span className="text-sm text-muted-foreground font-bold">예수금 입력</span>
          {minSeed !== null && (
            <span className="text-sm text-muted-foreground">최소 ${fmtUsd(minSeed)}</span>
          )}
        </div>
      )}
    </div>
  )
}
