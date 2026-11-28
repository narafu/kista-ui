'use client'

import { useId } from 'react'
import { Label } from '@/components/ui/label'
import { StrategyFieldLabel } from '../StrategyFieldLabel'
import type { VrFields } from '../model/useStrategyForm'
import type { StrategyFieldSettings } from '@entities/meta'
import { OptionChoiceGroup, RecurringModeField, VrRampFields, VR_FIELD_LABEL_CLASS } from '@entities/strategy'
import { AmountInput } from '@shared/ui/AmountInput'

interface Props {
  fields: VrFields
  setField: (field: keyof VrFields, value: number | null) => void
  recurringMode: 'DEPOSIT' | 'HOLD' | 'WITHDRAW'
  setRecurringMode: (mode: 'DEPOSIT' | 'HOLD' | 'WITHDRAW') => void
  loading: boolean
  // 램프 파라미터 미입력 시 서버로 전송될 실제값 — placeholder에 표시
  vrRampDefaults: {
    initialGradient: number
    gMax: number
    initialPoolLimitRate: number
    poolLimitFloor: number
  }
  settings: {
    recurringMode?: StrategyFieldSettings<string>
    bandWidth?: StrategyFieldSettings<number>
    intervalWeeks?: StrategyFieldSettings<number>
  }
  // 제출 불가 사유를 적립금 입력 아래에 표시
  recurringError?: string
  // 고급 설정 칸의 스키마 거절 문구
  errors?: Partial<Record<keyof VrFields, string>>
}

function VrAdvancedSettings({
  fields, setField, disabled, vrRampDefaults, settings, errors,
}: Pick<Props, 'fields' | 'setField' | 'vrRampDefaults' | 'settings' | 'errors'> & { disabled: boolean }) {
  const id = useId()
  const initialValueErrorId = errors?.initialValue ? `${id}-initialValue-error` : undefined
  return (
    <details className="mt-4 group">
      <summary className="cursor-pointer select-none text-sm font-bold text-muted-foreground list-none [&::-webkit-details-marker]:hidden flex items-center gap-1.5">
        <span className="transition-transform group-open:rotate-90">▸</span>
        고급 설정
      </summary>
      <div className="grid grid-cols-1 gap-y-5 mt-4">
        <div>
          <Label htmlFor={`${id}-initialValue`} className={VR_FIELD_LABEL_CLASS}>초기 V</Label>
          <AmountInput
            id={`${id}-initialValue`}
            value={fields.initialValue}
            onChange={(v) => setField('initialValue', v)}
            unit="USD"
            disabled={disabled}
            currency="USD"
            errorId={initialValueErrorId}
          />
          {errors?.initialValue && <p id={initialValueErrorId} role="alert" className="mt-1 text-sm text-status-error">{errors.initialValue}</p>}
        </div>
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
      <VrRampFields fields={fields} setField={setField} disabled={disabled} rampDefaults={vrRampDefaults} errors={errors} />
    </details>
  )
}

export function VrSettingsSection({ fields, setField, recurringMode, setRecurringMode, loading, vrRampDefaults, settings, recurringError, errors }: Props) {
  const id = useId()
  const recurringErrorId = recurringError ? `${id}-recurring-error` : undefined

  return (
    <div className="py-[18px] border-b border-border">
      <StrategyFieldLabel>밸류 리밸런싱 설정</StrategyFieldLabel>

      <div className="grid grid-cols-1 gap-y-5">
        <div>
          <RecurringModeField
            mode={recurringMode}
            setMode={setRecurringMode}
            amount={fields.recurringAmount}
            setAmount={(value) => setField('recurringAmount', value)}
            disabled={loading}
            setting={settings.recurringMode}
            errorId={recurringErrorId}
          />
          {recurringError && <p id={recurringErrorId} role="alert" className="mt-1 text-sm text-status-error">{recurringError}</p>}
        </div>
      </div>

      <VrAdvancedSettings fields={fields} setField={setField} disabled={loading} vrRampDefaults={vrRampDefaults} settings={settings} errors={errors} />
    </div>
  )
}
