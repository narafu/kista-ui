'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import type { RecurringMode, RuntimeFieldSettings } from '@entities/runtime-config'

export const RECURRING_MODE_OPTIONS = [
  { value: 'DEPOSIT', label: '입금' },
  { value: 'HOLD', label: '거치' },
  { value: 'WITHDRAW', label: '인출' },
] as const satisfies readonly { value: RecurringMode; label: string }[]

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
            {RECURRING_MODE_OPTIONS.map((option) => {
              const checked = field.allowedValues.includes(option.value)
              return (
                <div key={option.value} className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-background px-3">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => toggleAllowed(option.value, event.target.checked)}
                    aria-label={`${option.value} 허용`}
                    className="size-4 shrink-0 accent-primary"
                  />
                  <span className="min-w-0 flex-1 truncate font-mono text-sm">
                    {option.value} <span className="font-sans text-xs text-muted-foreground">· {option.label}</span>
                  </span>
                  <input
                    type="radio"
                    name={`${id}-default`}
                    checked={field.defaultValue === option.value}
                    disabled={!checked}
                    onChange={() => {
                      setInputError(undefined)
                      onChange({ ...field, defaultValue: option.value })
                    }}
                    aria-label={`${option.value} 기본값`}
                    className="size-4 shrink-0 accent-primary disabled:opacity-40"
                  />
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex h-8 items-center rounded-lg border border-border bg-muted/40 px-2.5 font-mono text-sm text-muted-foreground">
            HOLD <span className="ml-auto text-xs font-sans">고정</span>
          </div>
        )}
        {(inputError || error) && <p role="alert" className="text-xs text-destructive">{inputError || error}</p>}
      </div>
    </div>
  )
}
