'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export type ValueSet<T extends string | number> = {
  allowedValues: T[]
  defaultValue: T
}

export function ValueListEditor<T extends string | number>({ id, label, field, error, inputType = 'text', suggestions, normalize, onChange }: {
  id: string
  label: string
  field: ValueSet<T>
  error?: string
  inputType?: 'text' | 'number'
  suggestions?: string[]
  normalize: (value: string) => T | null
  onChange: (field: ValueSet<T>) => void
}) {
  const [raw, setRaw] = useState('')
  const [inputError, setInputError] = useState<string>()
  const datalistId = suggestions && suggestions.length > 0 ? `${id}-suggestions` : undefined

  const setDefault = (value: T) => {
    setInputError(undefined)
    onChange({ ...field, defaultValue: value })
  }

  const addValue = () => {
    const trimmed = raw.trim()
    if (trimmed === '') {
      setInputError('값을 입력하세요.')
      return
    }
    const parsed = normalize(raw)
    if (parsed === null) {
      setInputError(inputType === 'number' ? '올바른 숫자를 입력하세요.' : '값을 입력하세요.')
      return
    }
    if (field.allowedValues.includes(parsed)) {
      setInputError('이미 추가된 값입니다.')
      return
    }
    setInputError(undefined)
    setRaw('')
    onChange({ ...field, allowedValues: [...field.allowedValues, parsed] })
  }

  const deleteValue = (value: T) => {
    if (Object.is(value, field.defaultValue)) {
      setInputError('기본값은 삭제할 수 없습니다.')
      return
    }
    if (field.allowedValues.length <= 1) {
      setInputError('허용값은 하나 이상 필요합니다.')
      return
    }
    setInputError(undefined)
    onChange({ ...field, allowedValues: field.allowedValues.filter((item) => !Object.is(item, value)) })
  }

  return (
    <div className="space-y-2">
      <div role="radiogroup" aria-label={`${label} 기본값`} className="space-y-1.5">
        {field.allowedValues.map((value) => (
          <div key={String(value)} className="flex min-h-11 items-center gap-2 rounded-md border border-border bg-background px-2">
            <input
              type="radio"
              name={`${id}-default`}
              checked={Object.is(value, field.defaultValue)}
              onChange={() => setDefault(value)}
              aria-label={`${String(value)} 기본값`}
              className="size-4 shrink-0 accent-primary"
            />
            <span className="min-w-0 flex-1 truncate font-mono text-sm">{String(value)}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 text-muted-foreground hover:text-foreground"
              aria-label={`${String(value)} 삭제`}
              onClick={() => deleteValue(value)}
            >
              <Trash2 />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          id={`${id}-add`}
          value={raw}
          type="text"
          list={datalistId}
          inputMode={inputType === 'number' ? 'decimal' : undefined}
          maxLength={100}
          aria-label={`${label} 추가`}
          aria-invalid={Boolean(inputError || error)}
          onChange={(event) => {
            setRaw(event.target.value)
            setInputError(undefined)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              addValue()
            }
          }}
        />
        <Button type="button" variant="outline" size="icon" className="size-11" aria-label={`${label} 추가 확정`} onClick={addValue}>
          <Plus />
        </Button>
      </div>
      {datalistId && (
        <datalist id={datalistId}>
          {suggestions?.map((suggestion) => <option key={suggestion} value={suggestion} />)}
        </datalist>
      )}
      {(inputError || error) && <p role="alert" className="text-xs text-destructive">{inputError || error}</p>}
    </div>
  )
}
