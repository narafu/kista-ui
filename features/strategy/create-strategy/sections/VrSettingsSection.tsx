'use client'

import type { FocusEvent, ReactNode } from 'react'
import { SelectionCard } from '@shared/ui/selection-card'
import { StrategyFieldLabel } from '../StrategyFieldLabel'
import type { VrFields } from '../model/useStrategyForm'
import type { RuntimeFieldSettings } from '@entities/runtime-config'

interface Props {
  fields: VrFields
  setField: (field: keyof VrFields, value: number | null) => void
  recurringMode: 'DEPOSIT' | 'HOLD' | 'WITHDRAW'
  setRecurringMode: (mode: 'DEPOSIT' | 'HOLD' | 'WITHDRAW') => void
  loading: boolean
  isEdit: boolean
  settings: {
    recurringMode?: RuntimeFieldSettings<string>
    bandWidth?: RuntimeFieldSettings<number>
    intervalWeeks?: RuntimeFieldSettings<number>
  }
}

function parseNumber(value: string): number | null {
  if (value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

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
    <SelectionCard
      selected={selected}
      disabled={disabled}
      onClick={onClick}
      className={selected ? 'h-11 px-3 text-center text-sm font-extrabold' : 'h-11 px-3 text-center text-sm font-extrabold text-muted-foreground'}
    >
      {children}
    </SelectionCard>
  )
}

export function VrSettingsSection({ fields, setField, recurringMode, setRecurringMode, loading, isEdit, settings }: Props) {
  const disabled = loading || isEdit
  function handleRecurringModeChange(mode: 'DEPOSIT' | 'HOLD' | 'WITHDRAW') {
    setRecurringMode(mode)
    if (mode === 'HOLD') {
      setField('recurringAmount', 0)
    }
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
              selected={recurringMode === 'DEPOSIT'}
              disabled={disabled || settings.recurringMode?.customizable === false || !settings.recurringMode?.allowedValues.includes('DEPOSIT')}
              onClick={() => handleRecurringModeChange('DEPOSIT')}
            >
              + 적립
            </ChoiceButton>
            <ChoiceButton
              selected={recurringMode === 'HOLD'}
              disabled={disabled || settings.recurringMode?.customizable === false || !settings.recurringMode?.allowedValues.includes('HOLD')}
              onClick={() => handleRecurringModeChange('HOLD')}
            >
              거치
            </ChoiceButton>
            <ChoiceButton
              selected={recurringMode === 'WITHDRAW'}
              disabled={disabled || settings.recurringMode?.customizable === false || !settings.recurringMode?.allowedValues.includes('WITHDRAW')}
              onClick={() => handleRecurringModeChange('WITHDRAW')}
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
                parseNumber(event.target.value),
              )}
              onFocus={handleFocus}
              disabled={disabled || recurringMode === 'HOLD'}
              className="flex-1 border-0 bg-transparent text-right text-base font-semibold outline-none disabled:text-muted-foreground"
              placeholder="0"
            />
            <span className="ml-2 text-xs font-semibold text-muted-foreground">USD</span>
          </div>
        </div>

        <div>
          <span className={FIELD_LABEL_CLASS}>밴드 폭</span>
          <div className="grid grid-cols-3 gap-2">
            {(settings.bandWidth?.allowedValues ?? []).map((option) => (
              <ChoiceButton
                key={option}
                selected={fields.bandWidth === option}
                disabled={disabled || settings.bandWidth?.customizable === false}
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
            {(settings.intervalWeeks?.allowedValues ?? []).map((option) => (
              <ChoiceButton
                key={option}
                selected={fields.intervalWeeks === option}
                disabled={disabled || settings.intervalWeeks?.customizable === false}
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
