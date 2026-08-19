'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function normalizeText(value: string) {
  return value.trim()
}

// ValueListEditor와 달리 "기본값" 개념이 없는 순수 추천 목록 편집기 — 필드 자체가 여전히
// 자유 입력이라(자산 등록 폼의 세부 카테고리/기관/자산군/운용전략) 값 하나를 defaultValue로
// 강제할 이유가 없다.
export function SuggestionListEditor({ id, label, values, onChange, disabled }: {
  id: string
  label: string
  values: string[]
  onChange: (values: string[]) => void
  /** true면 추가·삭제 컨트롤을 잠근다 — onChange 호출이 즉시 저장으로 이어지는 호출부에서
   * 저장 중 연속 클릭이 서로 다른 target을 덮어쓰는 레이스를 막는다. */
  disabled?: boolean
}) {
  const [raw, setRaw] = useState('')
  const [inputError, setInputError] = useState<string>()

  const addValue = () => {
    if (disabled) return
    const parsed = normalizeText(raw)
    if (parsed === '') {
      setInputError('값을 입력하세요.')
      return
    }
    if (values.includes(parsed)) {
      setInputError('이미 추가된 값입니다.')
      return
    }
    setInputError(undefined)
    setRaw('')
    onChange([...values, parsed])
  }

  const deleteValue = (value: string) => {
    if (disabled) return
    onChange(values.filter((item) => item !== value))
  }

  return (
    <div className="space-y-2">
      <ul aria-label={`${label} 목록`} className="m-0 flex list-none flex-wrap gap-1.5 p-0">
        {values.length === 0 && <li className="text-xs text-muted-foreground">등록된 값이 없습니다.</li>}
        {values.map((value) => (
          <li key={value} className="inline-flex items-center gap-1 rounded-full border border-border bg-background py-1 pl-2.5 pr-1 text-sm">
            {value}
            <button
              type="button"
              aria-label={`${value} 삭제`}
              onClick={() => deleteValue(value)}
              disabled={disabled}
              className="-my-2.5 -mr-1 flex size-11 items-center justify-center rounded-full text-muted-foreground hover:text-destructive disabled:opacity-40 disabled:pointer-events-none"
            >
              <X className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Input
          id={`${id}-add`}
          value={raw}
          maxLength={100}
          aria-label={`${label} 추가`}
          aria-invalid={Boolean(inputError)}
          disabled={disabled}
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
        <Button type="button" variant="outline" size="icon" className="size-11" aria-label={`${label} 추가 확정`} onClick={addValue} disabled={disabled}>
          <Plus />
        </Button>
      </div>
      {inputError && <p role="alert" className="text-xs text-destructive">{inputError}</p>}
    </div>
  )
}
