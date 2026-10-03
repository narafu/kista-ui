'use client'

import { StrategyFieldLabel } from '../StrategyFieldLabel'
import type { VrFields } from '../model/useStrategyForm'
import type { RuntimeFieldSettings } from '@entities/runtime-config'
import { OptionChoiceGroup, RecurringModeField, VrRampFields, VR_FIELD_LABEL_CLASS } from '@entities/strategy'
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
          <span className={VR_FIELD_LABEL_CLASS}>초기 V</span>
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
      <VrRampFields fields={fields} setField={setField} disabled={disabled} rampDefaults={vrRampDefaults} />
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
            <span className={VR_FIELD_LABEL_CLASS}>초기 V값</span>
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
          mode={recurringMode}
          setMode={setRecurringMode}
          amount={fields.recurringAmount}
          setAmount={(value) => setField('recurringAmount', value)}
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
