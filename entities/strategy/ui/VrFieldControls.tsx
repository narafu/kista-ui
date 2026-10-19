'use client'

import { useId, type ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { ratioToPercent, percentToRatio } from '@shared/lib/format'
import { SelectionCard } from '@shared/ui/selection-card'
import { UnitInput } from '@shared/ui/UnitInput'
import { applyGStepWeeksChange, applyPStepWeeksChange } from '../model/poolLimitRamp'
import { VR_RECURRING_MODE_LABEL, type VrRampValues, type VrRecurringMode } from '../model/vrRamp'

// VR 설정 입력 컨트롤 — 전략 등록 폼(features/strategy/create-strategy)과 백테스트 폼(features/backtest)이 공유한다

// entities/runtime-config의 RuntimeFieldSettings와 구조 호환 — entities 간 cross-import 금지라 필요한 필드만 구조 타입으로 받는다
interface ChoiceSetting<T> {
  customizable: boolean
  allowedValues: T[]
}

// <Label>(leading-none)과 그룹 제목 <span>에 함께 쓰여 leading-5로 줄 높이를 고정한다
export const VR_FIELD_LABEL_CLASS = 'block mb-2.5 text-sm leading-5 font-bold text-muted-foreground'

export function ChoiceButton({
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

function isRecurringModeLocked(setting: ChoiceSetting<string> | undefined, mode: VrRecurringMode) {
  return setting?.customizable === false || !setting?.allowedValues.includes(mode)
}

function toPercentOrNull(ratio: number | null) {
  return ratio !== null ? ratioToPercent(ratio) : null
}

function toRatioOrNull(percent: number | null) {
  return percent !== null ? percentToRatio(percent) : null
}

const RECURRING_MODES: { mode: VrRecurringMode; label: string }[] = [
  { mode: 'DEPOSIT', label: `+ ${VR_RECURRING_MODE_LABEL.DEPOSIT}` },
  { mode: 'HOLD', label: VR_RECURRING_MODE_LABEL.HOLD },
  { mode: 'WITHDRAW', label: `- ${VR_RECURRING_MODE_LABEL.WITHDRAW}` },
]

// amount는 부호 없는 크기로 다룬다 — 부호는 mode가 결정
export function RecurringModeField({
  mode, setMode, amount, setAmount, disabled, setting,
}: {
  mode: VrRecurringMode
  setMode: (mode: VrRecurringMode) => void
  amount: number | null
  setAmount: (value: number | null) => void
  disabled: boolean
  setting?: ChoiceSetting<string>
}) {
  function handleModeChange(next: VrRecurringMode) {
    setMode(next)
    if (next === 'HOLD') setAmount(0)
  }

  return (
    <div>
      <span className={VR_FIELD_LABEL_CLASS}>적립금(+)/인출금(-)</span>
      <div className="grid grid-cols-3 gap-2">
        {RECURRING_MODES.map(({ mode: m, label }) => (
          <ChoiceButton
            key={m}
            selected={mode === m}
            disabled={disabled || isRecurringModeLocked(setting, m)}
            onClick={() => handleModeChange(m)}
          >
            {label}
          </ChoiceButton>
        ))}
      </div>
      <UnitInput
        value={amount !== null ? Math.abs(amount) : null}
        onChange={setAmount}
        unit="USD"
        disabled={disabled || mode === 'HOLD'}
        ariaLabel="적립금(+)/인출금(-)"
        placeholder="0"
        wrapperClassName="mt-2.5"
        unitClassName="ml-2"
      />
    </div>
  )
}

export function OptionChoiceGroup({
  label, suffix, value, setting, disabled, onSelect,
}: {
  label: string
  suffix: string
  value: number | null
  setting?: ChoiceSetting<number>
  disabled: boolean
  onSelect: (option: number) => void
}) {
  return (
    <div>
      <span className={VR_FIELD_LABEL_CLASS}>{label}</span>
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

export function VrRampFields({
  fields, setField, disabled, rampDefaults,
}: {
  fields: VrRampValues
  setField: (field: keyof VrRampValues, value: number | null) => void
  disabled: boolean
  // 램프 파라미터 미입력 시 실제 적용되는 값 — placeholder에 표시
  rampDefaults: {
    initialGradient: number
    gMax: number
    initialPoolLimitRate: number
    poolLimitFloor: number
  }
}) {
  const id = useId()
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
      <div>
        <Label htmlFor={`${id}-initialGradient`} className={VR_FIELD_LABEL_CLASS}>초기 gradient(G)</Label>
        <UnitInput id={`${id}-initialGradient`} value={fields.initialGradient} onChange={(v) => setField('initialGradient', v)} unit="" disabled={disabled} placeholder={String(rampDefaults.initialGradient)} />
      </div>
      <div>
        <Label htmlFor={`${id}-gGraceWeeks`} className={VR_FIELD_LABEL_CLASS}>gradient 유예(주)</Label>
        <UnitInput id={`${id}-gGraceWeeks`} value={fields.gGraceWeeks} onChange={(v) => setField('gGraceWeeks', v)} unit="주" disabled={disabled || gStepWeeksIsZero} placeholder="52" />
      </div>
      <div>
        <Label htmlFor={`${id}-gMax`} className={VR_FIELD_LABEL_CLASS}>gradient 상한</Label>
        <UnitInput id={`${id}-gMax`} value={fields.gMax} onChange={(v) => setField('gMax', v)} unit="" disabled={disabled || gStepWeeksIsZero} placeholder={String(rampDefaults.gMax)} />
      </div>
      <div>
        <Label htmlFor={`${id}-gStepWeeks`} className={VR_FIELD_LABEL_CLASS}>gradient 단계주기(주)</Label>
        <UnitInput id={`${id}-gStepWeeks`} value={fields.gStepWeeks} onChange={handleGStepWeeksChange} unit="주" disabled={disabled} placeholder="26" />
      </div>
      <div>
        <Label htmlFor={`${id}-initialPoolLimitRate`} className={VR_FIELD_LABEL_CLASS}>초기 poolLimitRate</Label>
        <UnitInput
          id={`${id}-initialPoolLimitRate`}
          value={toPercentOrNull(fields.initialPoolLimitRate)}
          onChange={(v) => setField('initialPoolLimitRate', toRatioOrNull(v))}
          unit="%"
          disabled={disabled}
          placeholder={String(ratioToPercent(rampDefaults.initialPoolLimitRate))}
          maxDecimals={0}
        />
      </div>
      <div>
        <Label htmlFor={`${id}-pGraceWeeks`} className={VR_FIELD_LABEL_CLASS}>poolLimitRate 유예(주)</Label>
        <UnitInput id={`${id}-pGraceWeeks`} value={fields.pGraceWeeks} onChange={(v) => setField('pGraceWeeks', v)} unit="주" disabled={disabled || pStepWeeksIsZero} placeholder="52" />
      </div>
      <div>
        <Label htmlFor={`${id}-poolLimitFloor`} className={VR_FIELD_LABEL_CLASS}>poolLimitRate 하한</Label>
        <UnitInput
          id={`${id}-poolLimitFloor`}
          value={toPercentOrNull(fields.poolLimitFloor)}
          onChange={(v) => setField('poolLimitFloor', toRatioOrNull(v))}
          unit="%"
          disabled={disabled || pStepWeeksIsZero}
          placeholder={String(ratioToPercent(rampDefaults.poolLimitFloor))}
          maxDecimals={0}
        />
      </div>
      <div>
        <Label htmlFor={`${id}-pStepWeeks`} className={VR_FIELD_LABEL_CLASS}>poolLimitRate 단계주기(주)</Label>
        <UnitInput id={`${id}-pStepWeeks`} value={fields.pStepWeeks} onChange={handlePStepWeeksChange} unit="주" disabled={disabled} placeholder="26" />
      </div>
    </div>
  )
}
