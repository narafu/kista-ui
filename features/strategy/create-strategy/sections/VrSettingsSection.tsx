'use client'

import type { ReactNode } from 'react'
import { ratioToPercent, percentToRatio } from '@shared/lib/format'
import { SelectionCard } from '@shared/ui/selection-card'
import { StrategyFieldLabel } from '../StrategyFieldLabel'
import type { VrFields } from '../model/useStrategyForm'
import type { RuntimeFieldSettings } from '@entities/runtime-config'
import { applyGStepWeeksChange, applyPStepWeeksChange } from '@entities/strategy'
import { UnitInput } from '@shared/ui/UnitInput'

interface Props {
  fields: VrFields
  setField: (field: keyof VrFields, value: number | null) => void
  recurringMode: 'DEPOSIT' | 'HOLD' | 'WITHDRAW'
  setRecurringMode: (mode: 'DEPOSIT' | 'HOLD' | 'WITHDRAW') => void
  loading: boolean
  isEdit: boolean
  // 수정 모드 읽기전용 표시 전용 — 평단가·수량 역산 불가라 저장된 V값을 그대로 보여준다
  initialVrValue: number
  // 램프 파라미터 미입력 시 서버로 전송될 실제값 — placeholder에 표시
  vrRampDefaults: {
    initialGradient: number
    gMax: number
    initialPoolLimitRate: number
    poolLimitFloor: number
  }
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

type RecurringMode = Props['recurringMode']

function isRecurringModeLocked(setting: RuntimeFieldSettings<string> | undefined, mode: RecurringMode) {
  return setting?.customizable === false || !setting?.allowedValues.includes(mode)
}

function toPercentOrNull(ratio: number | null) {
  return ratio !== null ? ratioToPercent(ratio) : null
}

function toRatioOrNull(percent: number | null) {
  return percent !== null ? percentToRatio(percent) : null
}

function RecurringModeField({
  fields, setField, recurringMode, setRecurringMode, disabled, setting,
}: Pick<Props, 'fields' | 'setField' | 'recurringMode' | 'setRecurringMode'> & {
  disabled: boolean
  setting?: RuntimeFieldSettings<string>
}) {
  function handleRecurringModeChange(mode: RecurringMode) {
    setRecurringMode(mode)
    if (mode === 'HOLD') {
      setField('recurringAmount', 0)
    }
  }

  return (
    <div>
      <span className={FIELD_LABEL_CLASS}>적립금(+)/인출금(-)</span>
      <div className="grid grid-cols-3 gap-2">
        <ChoiceButton
          selected={recurringMode === 'DEPOSIT'}
          disabled={disabled || isRecurringModeLocked(setting, 'DEPOSIT')}
          onClick={() => handleRecurringModeChange('DEPOSIT')}
        >
          + 적립
        </ChoiceButton>
        <ChoiceButton
          selected={recurringMode === 'HOLD'}
          disabled={disabled || isRecurringModeLocked(setting, 'HOLD')}
          onClick={() => handleRecurringModeChange('HOLD')}
        >
          거치
        </ChoiceButton>
        <ChoiceButton
          selected={recurringMode === 'WITHDRAW'}
          disabled={disabled || isRecurringModeLocked(setting, 'WITHDRAW')}
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
  )
}

function OptionChoiceGroup({
  label, suffix, value, setting, disabled, onSelect,
}: {
  label: string
  suffix: string
  value: number | null
  setting?: RuntimeFieldSettings<number>
  disabled: boolean
  onSelect: (option: number) => void
}) {
  return (
    <div>
      <span className={FIELD_LABEL_CLASS}>{label}</span>
      <div className="grid grid-cols-3 gap-2">
        {(setting?.allowedValues ?? []).map((option) => (
          <ChoiceButton
            key={option}
            selected={value === option}
            disabled={disabled || setting?.customizable === false}
            onClick={() => onSelect(option)}
          >
            {option}{suffix}
          </ChoiceButton>
        ))}
      </div>
    </div>
  )
}

function VrRampFields({
  fields, setField, disabled, vrRampDefaults,
}: Pick<Props, 'fields' | 'setField' | 'vrRampDefaults'> & { disabled: boolean }) {
  const gStepWeeksIsZero = fields.gStepWeeks === 0
  const pStepWeeksIsZero = fields.pStepWeeks === 0

  function handlePStepWeeksChange(value: number | null) {
    applyPStepWeeksChange(value, fields.pStepWeeks === 0, {
      setPStepWeeks: (v) => setField('pStepWeeks', v),
      setPoolLimitFloor: (v) => setField('poolLimitFloor', v),
      setPGraceWeeks: (v) => setField('pGraceWeeks', v),
    })
  }

  function handleGStepWeeksChange(value: number | null) {
    applyGStepWeeksChange(value, fields.gStepWeeks === 0, {
      setGStepWeeks: (v) => setField('gStepWeeks', v),
      setGMax: (v) => setField('gMax', v),
      setGGraceWeeks: (v) => setField('gGraceWeeks', v),
    })
  }

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-5 mt-5">
      <label>
        <span className={FIELD_LABEL_CLASS}>초기 gradient(G)</span>
        <UnitInput value={fields.initialGradient} onChange={(v) => setField('initialGradient', v)} unit="" disabled={disabled} placeholder={String(vrRampDefaults.initialGradient)} />
      </label>
      <label>
        <span className={FIELD_LABEL_CLASS}>gradient 유예(주)</span>
        <UnitInput value={fields.gGraceWeeks} onChange={(v) => setField('gGraceWeeks', v)} unit="주" disabled={disabled || gStepWeeksIsZero} placeholder="52" />
      </label>
      <label>
        <span className={FIELD_LABEL_CLASS}>gradient 상한</span>
        <UnitInput value={fields.gMax} onChange={(v) => setField('gMax', v)} unit="" disabled={disabled || gStepWeeksIsZero} placeholder={String(vrRampDefaults.gMax)} />
      </label>
      <label>
        <span className={FIELD_LABEL_CLASS}>gradient 단계주기(주)</span>
        <UnitInput value={fields.gStepWeeks} onChange={handleGStepWeeksChange} unit="주" disabled={disabled} placeholder="26" />
      </label>
      <label>
        <span className={FIELD_LABEL_CLASS}>초기 poolLimitRate</span>
        <UnitInput
          value={toPercentOrNull(fields.initialPoolLimitRate)}
          onChange={(v) => setField('initialPoolLimitRate', toRatioOrNull(v))}
          unit="%"
          disabled={disabled}
          placeholder={String(ratioToPercent(vrRampDefaults.initialPoolLimitRate))}
          maxDecimals={0}
        />
      </label>
      <label>
        <span className={FIELD_LABEL_CLASS}>poolLimitRate 유예(주)</span>
        <UnitInput value={fields.pGraceWeeks} onChange={(v) => setField('pGraceWeeks', v)} unit="주" disabled={disabled || pStepWeeksIsZero} placeholder="52" />
      </label>
      <label>
        <span className={FIELD_LABEL_CLASS}>poolLimitRate 하한</span>
        <UnitInput
          value={toPercentOrNull(fields.poolLimitFloor)}
          onChange={(v) => setField('poolLimitFloor', toRatioOrNull(v))}
          unit="%"
          disabled={disabled || pStepWeeksIsZero}
          placeholder={String(ratioToPercent(vrRampDefaults.poolLimitFloor))}
          maxDecimals={0}
        />
      </label>
      <label>
        <span className={FIELD_LABEL_CLASS}>poolLimitRate 단계주기(주)</span>
        <UnitInput value={fields.pStepWeeks} onChange={handlePStepWeeksChange} unit="주" disabled={disabled} placeholder="26" />
      </label>
    </div>
  )
}

function VrAdvancedSettings({
  fields, setField, disabled, vrRampDefaults, settings,
}: Pick<Props, 'fields' | 'setField' | 'vrRampDefaults' | 'settings'> & { disabled: boolean }) {
  return (
    <details className="mt-4 group">
      <summary className="cursor-pointer select-none text-sm font-bold text-muted-foreground list-none flex items-center gap-1.5">
        <span className="transition-transform group-open:rotate-90">▸</span>
        고급 설정
      </summary>
      <div className="grid grid-cols-1 gap-y-5 mt-4">
        <label>
          <span className={FIELD_LABEL_CLASS}>초기 V</span>
          <UnitInput
            value={fields.initialValue}
            onChange={(v) => setField('initialValue', v)}
            unit="USD"
            disabled={disabled}
            maxDecimals={2}
          />
        </label>
        <OptionChoiceGroup
          label="밴드 폭"
          suffix="%"
          value={fields.bandWidth}
          setting={settings.bandWidth}
          disabled={disabled}
          onSelect={(option) => setField('bandWidth', option)}
        />

        <OptionChoiceGroup
          label="리밸런싱 주기"
          suffix="주"
          value={fields.intervalWeeks}
          setting={settings.intervalWeeks}
          disabled={disabled}
          onSelect={(option) => setField('intervalWeeks', option)}
        />
      </div>
      <VrRampFields fields={fields} setField={setField} disabled={disabled} vrRampDefaults={vrRampDefaults} />
    </details>
  )
}

export function VrSettingsSection({ fields, setField, recurringMode, setRecurringMode, loading, isEdit, initialVrValue, vrRampDefaults, settings }: Props) {
  const disabled = loading || isEdit

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

        <RecurringModeField
          fields={fields}
          setField={setField}
          recurringMode={recurringMode}
          setRecurringMode={setRecurringMode}
          disabled={disabled}
          setting={settings.recurringMode}
        />
      </div>

      {!isEdit && (
        <VrAdvancedSettings fields={fields} setField={setField} disabled={disabled} vrRampDefaults={vrRampDefaults} settings={settings} />
      )}
    </div>
  )
}
