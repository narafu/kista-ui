'use client'

import { Switch } from '@/components/ui/switch'
import type { RuntimeFieldSettings } from '@entities/runtime-config'
import { normalizeText } from '../model/normalizers'
import { ValueListEditor } from './ValueListEditor'

export function FieldEditor<T extends string | number>({ id, label, field, error, fixed, suggestions, inputType = 'text', normalize, onChange }: {
  id: string
  label: string
  field: RuntimeFieldSettings<T>
  error?: string
  fixed?: boolean
  suggestions?: string[]
  inputType?: 'text' | 'number'
  normalize?: (value: string) => T | null
  onChange: (field: RuntimeFieldSettings<T>) => void
}) {
  const normalizeValue = normalize ?? ((value: string) => normalizeText(value) as T)

  if (fixed) {
    return (
      <div className="grid gap-2 py-3 sm:grid-cols-[minmax(140px,1fr)_minmax(220px,1.5fr)] sm:items-center">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex h-8 items-center rounded-lg border border-border bg-muted/40 px-2.5 font-mono text-sm text-muted-foreground">
          {String(field.defaultValue)} <span className="ml-auto text-xs font-sans">고정</span>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-2 py-3 sm:grid-cols-[minmax(140px,1fr)_minmax(220px,1.5fr)] sm:items-start">
      <div className="flex min-h-8 items-center justify-between gap-3 sm:pr-4">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">사용자 변경</span>
          <Switch
            checked={field.customizable}
            onCheckedChange={(customizable) => onChange(customizable
              ? { ...field, customizable: true }
              : { ...field, customizable: false, allowedValues: [field.defaultValue] })}
            aria-label={`${label} 사용자 변경 허용`}
            size="sm"
          />
        </div>
      </div>
      <div className="space-y-2">
        {field.customizable ? (
          <ValueListEditor
            id={id}
            label={label}
            field={field}
            error={error}
            inputType={inputType}
            suggestions={suggestions}
            normalize={normalizeValue}
            onChange={(value) => onChange({ ...field, ...value })}
          />
        ) : (
          <div className="flex h-8 items-center rounded-lg border border-border bg-muted/40 px-2.5 font-mono text-sm text-muted-foreground">
            {String(field.defaultValue)} <span className="ml-auto text-xs font-sans">고정</span>
          </div>
        )}
        {!field.customizable && error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  )
}
