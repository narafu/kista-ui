'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import type { RecurringMode, RuntimeFieldSettings } from '@entities/runtime-config'
import { VR_RECURRING_MODE_LABEL } from '@entities/strategy'
import { RECURRING_MODE_OPTIONS } from './recurringModeOptions'

export function RecurringModeEditor({ id, label, field, error, onChange }: {
  id: string
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
            {RECURRING_MODE_OPTIONS.map((option) => {
              const checked = field.allowedValues.includes(option.value)
              return (
                <div key={option.value} className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-background px-3">
                  <label className="-m-1 inline-flex shrink-0 p-1">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => toggleAllowed(option.value, event.target.checked)}
                      aria-label={`${option.label} 허용`}
                      className="size-4 shrink-0 accent-primary"
                    />
                  </label>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {option.label} <span className="font-mono text-xs text-muted-foreground">· {option.value}</span>
                  </span>
                  <label className="-m-1 inline-flex shrink-0 p-1">
                    <input
                      type="radio"
                      name={`${id}-default`}
                      checked={field.defaultValue === option.value}
                      disabled={!checked}
                      onChange={() => {
                        setInputError(undefined)
                        onChange({ ...field, defaultValue: option.value })
                      }}
                      aria-label={`${option.label} 기본값`}
                      className="size-4 shrink-0 accent-primary disabled:opacity-40"
                    />
                  </label>
                </div>
              )
            })}
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
