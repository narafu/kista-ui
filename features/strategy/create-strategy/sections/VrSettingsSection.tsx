'use client'

import type { FocusEvent, ReactNode } from 'react'
import { cn } from '@shared/lib/utils'
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

function inputBoxClass(disabled: boolean) {
  return cn(
    'flex items-center h-11 rounded-[var(--r-sm)] bg-card px-3',
    disabled
      ? 'opacity-50 border border-border'
      : 'border border-[var(--rose-400)] shadow-[0_0_0_3px_rgba(203,131,106,0.18)]',
  )
}

function handleFocus(event: FocusEvent<HTMLInputElement>) {
  event.currentTarget.select()
}

// 우측 정렬 숫자 입력 + 단위 라벨 — 초기 V값/평단가/수량/적립금 4개 필드가 공유하는 마크업
function UnitInput({
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

      <div className="grid grid-cols-1 gap-y-5">
        {isEdit ? (
          <label>
            <span className={FIELD_LABEL_CLASS}>초기 V값</span>
            <UnitInput
              value={fields.initialValue}
              onChange={(value) => setField('initialValue', value)}
              unit="USD"
              disabled={disabled}
              unitClassName="ml-2"
            />
          </label>
        ) : (
          <div>
            <span className={FIELD_LABEL_CLASS}>초기 V값 (평단가 × 수량)</span>
            <div className="grid grid-cols-2 gap-2">
              <label>
                <span className="block mb-1 text-xs font-semibold text-muted-foreground">평단가</span>
                <UnitInput
                  value={fields.avgPrice}
                  onChange={(value) => setField('avgPrice', value)}
                  unit="USD"
                  disabled={disabled}
                  unitClassName="ml-1.5"
                />
              </label>
              <label>
                <span className="block mb-1 text-xs font-semibold text-muted-foreground">수량</span>
                <UnitInput
                  value={fields.quantity}
                  onChange={(value) => setField('quantity', value)}
                  unit="주"
                  disabled={disabled}
                  unitClassName="ml-1.5"
                />
              </label>
            </div>
          </div>
        )}

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
          <UnitInput
            value={fields.recurringAmount !== null ? Math.abs(fields.recurringAmount) : null}
            onChange={(value) => setField('recurringAmount', value)}
            unit="USD"
            disabled={disabled || recurringMode === 'HOLD'}
            ariaLabel="적립금(+)/인출금(-)"
            placeholder="0"
            wrapperClassName="mt-2.5"
            unitClassName="ml-2"
          />
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
