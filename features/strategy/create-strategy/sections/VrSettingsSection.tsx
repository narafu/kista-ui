'use client'

import type { ReactNode } from 'react'
import { SelectionCard } from '@shared/ui/selection-card'
import { StrategyFieldLabel } from '../StrategyFieldLabel'
import type { VrFields } from '../model/useStrategyForm'
import type { RuntimeFieldSettings } from '@entities/runtime-config'
import { UnitInput } from './UnitInput'

interface Props {
  fields: VrFields
  setField: (field: keyof VrFields, value: number | null) => void
  recurringMode: 'DEPOSIT' | 'HOLD' | 'WITHDRAW'
  setRecurringMode: (mode: 'DEPOSIT' | 'HOLD' | 'WITHDRAW') => void
  loading: boolean
  isEdit: boolean
  // 수정 모드 읽기전용 표시 전용 — 평단가·수량 역산 불가라 저장된 V값을 그대로 보여준다
  initialVrValue: number
  settings: {
    recurringMode?: RuntimeFieldSettings<string>
    bandWidth?: RuntimeFieldSettings<number>
    intervalWeeks?: RuntimeFieldSettings<number>
  }
}

const FIELD_LABEL_CLASS = 'block mb-2.5 text-sm font-bold text-muted-foreground'

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

export function VrSettingsSection({ fields, setField, recurringMode, setRecurringMode, loading, isEdit, initialVrValue, settings }: Props) {
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
        {isEdit && (
          <label>
            <span className={FIELD_LABEL_CLASS}>초기 V값</span>
            <UnitInput
              value={initialVrValue}
              onChange={() => {}}
              unit="USD"
              disabled={disabled}
              unitClassName="ml-2"
            />
          </label>
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
