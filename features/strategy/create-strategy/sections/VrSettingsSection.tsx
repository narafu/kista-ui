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
  const pStepWeeksIsZero = fields.pStepWeeks === 0
  function handleRecurringModeChange(mode: 'DEPOSIT' | 'HOLD' | 'WITHDRAW') {
    setRecurringMode(mode)
    if (mode === 'HOLD') {
      setField('recurringAmount', 0)
    }
  }

  // poolLimitRate 단계주기=0은 램프 비활성화를 의미 — 하한/유예를 0으로 강제하고 비활성화, 0이 아니게 되돌리면 값을 비워 재입력받는다
  function handlePStepWeeksChange(value: number | null) {
    const wasZero = fields.pStepWeeks === 0
    setField('pStepWeeks', value)
    if (value === 0) {
      setField('poolLimitFloor', 0)
      setField('pGraceWeeks', 0)
    } else if (wasZero) {
      setField('poolLimitFloor', null)
      setField('pGraceWeeks', null)
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
      </div>

      {!isEdit && (
        <details className="mt-4 group">
          <summary className="cursor-pointer select-none text-sm font-bold text-muted-foreground list-none flex items-center gap-1.5">
            <span className="transition-transform group-open:rotate-90">▸</span>
            고급 설정
          </summary>
          <div className="grid grid-cols-1 gap-y-5 mt-4">
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
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 mt-5">
            <label>
              <span className={FIELD_LABEL_CLASS}>초기 gradient(G)</span>
              <UnitInput value={fields.initialGradient} onChange={(v) => setField('initialGradient', v)} unit="" disabled={disabled} placeholder="자동" />
            </label>
            <label>
              <span className={FIELD_LABEL_CLASS}>gradient 단계주기(주)</span>
              <UnitInput value={fields.gStepWeeks} onChange={(v) => setField('gStepWeeks', v)} unit="주" disabled={disabled} placeholder="26" />
            </label>
            <label>
              <span className={FIELD_LABEL_CLASS}>gradient 상한</span>
              <UnitInput value={fields.gMax} onChange={(v) => setField('gMax', v)} unit="" disabled={disabled} placeholder="자동" />
            </label>
            <label>
              <span className={FIELD_LABEL_CLASS}>gradient 유예(주)</span>
              <UnitInput value={fields.gGraceWeeks} onChange={(v) => setField('gGraceWeeks', v)} unit="주" disabled={disabled} placeholder="52" />
            </label>
            <label>
              <span className={FIELD_LABEL_CLASS}>초기 poolLimitRate</span>
              <UnitInput
                value={fields.initialPoolLimitRate !== null ? Math.round(fields.initialPoolLimitRate * 10000) / 100 : null}
                onChange={(v) => setField('initialPoolLimitRate', v !== null ? Math.round(v * 100) / 10000 : null)}
                unit="%"
                disabled={disabled}
                placeholder="자동"
                maxDecimals={2}
              />
            </label>
            <label>
              <span className={FIELD_LABEL_CLASS}>poolLimitRate 단계주기(주)</span>
              <UnitInput value={fields.pStepWeeks} onChange={handlePStepWeeksChange} unit="주" disabled={disabled} placeholder="26" />
            </label>
            <label>
              <span className={FIELD_LABEL_CLASS}>poolLimitRate 하한</span>
              <UnitInput
                value={fields.poolLimitFloor !== null ? Math.round(fields.poolLimitFloor * 10000) / 100 : null}
                onChange={(v) => setField('poolLimitFloor', v !== null ? Math.round(v * 100) / 10000 : null)}
                unit="%"
                disabled={disabled || pStepWeeksIsZero}
                placeholder="자동"
                maxDecimals={2}
              />
            </label>
            <label>
              <span className={FIELD_LABEL_CLASS}>poolLimitRate 유예(주)</span>
              <UnitInput value={fields.pGraceWeeks} onChange={(v) => setField('pGraceWeeks', v)} unit="주" disabled={disabled || pStepWeeksIsZero} placeholder="52" />
            </label>
          </div>
        </details>
      )}
    </div>
  )
}
