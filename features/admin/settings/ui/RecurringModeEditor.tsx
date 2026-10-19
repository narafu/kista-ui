'use client'

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import type { RecurringMode, RuntimeFieldSettings } from '@entities/runtime-config'
import { VR_RECURRING_MODE_LABEL } from '@entities/strategy'
import { RECURRING_MODE_OPTIONS } from './recurringModeOptions'

export function RecurringModeEditor({ label, field, error, onChange }: {
  label: string
  field: RuntimeFieldSettings<RecurringMode>
  error?: string
  onChange: (field: RuntimeFieldSettings<RecurringMode>) => void
}) {
  const [inputError, setInputError] = useState<string>()
  const setCustomizable = (customizable: boolean) => {
    setInputError(undefined)
    onChange(customizable ? { ...field, customizable: true } : { customizable: false, allowedValues: ['HOLD'], defaultValue: 'HOLD' })
  }
  const toggleAllowed = (value: RecurringMode, checked: boolean) => {
    if (!checked && value === field.defaultValue) {
      setInputError('기본값은 해제할 수 없습니다.')
      return
    }
    const allowedValues = checked
      ? [...field.allowedValues, value]
      : field.allowedValues.filter((item) => item !== value)
    setInputError(undefined)
    onChange({ ...field, allowedValues })
  }

  return (
    <div className="grid gap-2 py-3 sm:grid-cols-[minmax(140px,1fr)_minmax(220px,1.5fr)] sm:items-start">
      <div className="flex min-h-8 items-center justify-between gap-3 sm:pr-4">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">사용자 변경</span>
          <Switch
            checked={field.customizable}
            onCheckedChange={setCustomizable}
            aria-label={`${label} 사용자 변경 허용`}
            size="sm"
          />
        </div>
      </div>
      <div className="space-y-2">
        {field.customizable ? (
          <div className="space-y-1.5">
            <div className="flex px-3 text-xs text-muted-foreground">
              <span>허용</span>
              <span className="ml-auto">기본값</span>
            </div>
            {/* RadioGroup(composite) 안의 Base UI Checkbox는 tabindex를 잃는다 — 허용 열과 기본값 열을 나눠 한 행처럼 이어 붙인다 */}
            <div className="grid grid-cols-[1fr_auto]">
              <div className="space-y-1.5">
                {RECURRING_MODE_OPTIONS.map((option) => (
                  <div key={option.value} className="flex min-h-11 items-center gap-3 rounded-l-md border border-r-0 border-border bg-background pl-3">
                    <Checkbox
                      checked={field.allowedValues.includes(option.value)}
                      onCheckedChange={(next) => toggleAllowed(option.value, next)}
                      aria-label={`${option.label} 허용`}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {option.label} <span className="font-mono text-xs text-muted-foreground">· {option.value}</span>
                    </span>
                  </div>
                ))}
              </div>
              <RadioGroup
                aria-label={`${label} 기본값`}
                value={field.defaultValue}
                onValueChange={(value) => {
                  setInputError(undefined)
                  onChange({ ...field, defaultValue: value as RecurringMode })
                }}
                className="gap-1.5"
              >
                {RECURRING_MODE_OPTIONS.map((option) => (
                  <div key={option.value} className="flex min-h-11 items-center rounded-r-md border border-l-0 border-border bg-background px-3">
                    <RadioGroupItem
                      value={option.value}
                      disabled={!field.allowedValues.includes(option.value)}
                      aria-label={`${option.label} 기본값`}
                    />
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        ) : (
          <div className="flex h-8 items-center rounded-lg border border-border bg-muted/40 px-2.5 font-mono text-sm text-muted-foreground">
            {VR_RECURRING_MODE_LABEL.HOLD} <span className="ml-auto text-xs font-sans">고정</span>
          </div>
        )}
        {(inputError || error) && <p role="alert" className="text-xs text-[var(--status-error)]">{inputError || error}</p>}
      </div>
    </div>
  )
}
