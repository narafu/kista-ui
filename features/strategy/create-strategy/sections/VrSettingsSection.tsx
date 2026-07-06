'use client'

import { useEffect, useState } from 'react'
import type { FocusEvent, ReactNode } from 'react'
import { cn } from '@shared/lib/utils'
import { StrategyFieldLabel } from '../StrategyFieldLabel'
import type { VrFields } from '../model/useStrategyForm'

interface Props {
  fields: VrFields
  setField: (field: keyof VrFields, value: number | null) => void
  loading: boolean
  isEdit: boolean
}

function parseNumber(value: string): number | null {
  if (value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function signedAmount(value: number | null, sign: 1 | -1): number | null {
  if (value === null) return null
  if (value === 0) return 0
  return Math.abs(value) * sign
}

function recurringModeOf(value: number | null): 'deposit' | 'hold' | 'withdraw' {
  if (value === null || value === 0) return 'hold'
  return value < 0 ? 'withdraw' : 'deposit'
}

const BAND_WIDTH_OPTIONS = [10, 15, 20] as const
const INTERVAL_WEEK_OPTIONS = [1, 2, 4] as const
const FIELD_LABEL_CLASS = 'block mb-2.5 text-sm font-bold text-muted-foreground'

function handleFocus(event: FocusEvent<HTMLInputElement>) {
  event.currentTarget.select()
}

function ChoiceButton({
  children,
  selected,
  disabled,
  onClick,
}: {
  children: ReactNode
  selected: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'h-10 rounded-[var(--r-sm)] border px-3 text-sm font-extrabold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        selected
          ? 'border-[var(--rose-400)] bg-[var(--brand-soft-bg)] text-[var(--brand-fg)] shadow-[0_0_0_3px_rgba(203,131,106,0.16)]'
          : 'border-border bg-card text-muted-foreground hover:border-[var(--rose-300)] hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

export function VrSettingsSection({ fields, setField, loading, isEdit }: Props) {
  const disabled = loading || isEdit
  const [recurringMode, setRecurringMode] = useState<'deposit' | 'hold' | 'withdraw'>(recurringModeOf(fields.recurringAmount))

  useEffect(() => {
    setRecurringMode(recurringModeOf(fields.recurringAmount))
  }, [fields.recurringAmount])

  function handleRecurringModeChange(mode: 'deposit' | 'hold' | 'withdraw') {
    setRecurringMode(mode)
    if (mode === 'hold') {
      setField('recurringAmount', 0)
      return
    }
    setField('recurringAmount', signedAmount(fields.recurringAmount, mode === 'withdraw' ? -1 : 1))
  }

  return (
    <div className="py-[18px] border-b border-border">
      <StrategyFieldLabel>밸류 리밸런싱 설정</StrategyFieldLabel>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label>
          <span className={FIELD_LABEL_CLASS}>초기 V값</span>
          <div className="flex items-center h-11 rounded-[var(--r-sm)] border border-border bg-card px-3">
            <input
              type="text"
              inputMode="decimal"
              value={fields.initialValue ?? ''}
              onChange={(event) => setField('initialValue', parseNumber(event.target.value))}
              onFocus={handleFocus}
              disabled={disabled}
              className="flex-1 border-0 bg-transparent text-right text-base font-semibold outline-none disabled:text-muted-foreground"
            />
            <span className="ml-2 text-xs font-semibold text-muted-foreground">USD</span>
          </div>
        </label>

        <div>
          <span className={FIELD_LABEL_CLASS}>적립금(+)/인출금(-)</span>
          <div className="grid grid-cols-3 gap-2">
            <ChoiceButton
              selected={recurringMode === 'deposit'}
              disabled={disabled}
              onClick={() => handleRecurringModeChange('deposit')}
            >
              + 적립
            </ChoiceButton>
            <ChoiceButton
              selected={recurringMode === 'hold'}
              disabled={disabled}
              onClick={() => handleRecurringModeChange('hold')}
            >
              거치
            </ChoiceButton>
            <ChoiceButton
              selected={recurringMode === 'withdraw'}
              disabled={disabled}
              onClick={() => handleRecurringModeChange('withdraw')}
            >
              - 인출
            </ChoiceButton>
          </div>
          <div className="mt-2.5 flex items-center h-11 rounded-[var(--r-sm)] border border-border bg-card px-3">
            <input
              type="text"
              inputMode="decimal"
              aria-label="적립금(+)/인출금(-)"
              value={fields.recurringAmount !== null ? String(Math.abs(fields.recurringAmount)) : ''}
              onChange={(event) => setField(
                'recurringAmount',
                signedAmount(parseNumber(event.target.value), recurringMode === 'withdraw' ? -1 : 1),
              )}
              onFocus={handleFocus}
              disabled={disabled || recurringMode === 'hold'}
              className="flex-1 border-0 bg-transparent text-right text-base font-semibold outline-none disabled:text-muted-foreground"
              placeholder="0"
            />
            <span className="ml-2 text-xs font-semibold text-muted-foreground">USD</span>
          </div>
        </div>

        <div>
          <span className={FIELD_LABEL_CLASS}>밴드 폭</span>
          <div className="grid grid-cols-3 gap-2">
            {BAND_WIDTH_OPTIONS.map((option) => (
              <ChoiceButton
                key={option}
                selected={fields.bandWidth === option}
                disabled={disabled}
                onClick={() => setField('bandWidth', option)}
              >
                {option}%
              </ChoiceButton>
            ))}
          </div>
        </div>

        <div>
          <span className={FIELD_LABEL_CLASS}>리밸런싱 주기</span>
          <div className="grid grid-cols-3 gap-2">
            {INTERVAL_WEEK_OPTIONS.map((option) => (
              <ChoiceButton
                key={option}
                selected={fields.intervalWeeks === option}
                disabled={disabled}
                onClick={() => setField('intervalWeeks', option)}
              >
                {option}주
              </ChoiceButton>
            ))}
          </div>
        </div>
      </div>

      {isEdit && (
        <p className="text-sm text-muted-foreground mt-2 px-1">
          VR 상세 설정은 등록 후 변경할 수 없습니다.
        </p>
      )}
    </div>
  )
}
