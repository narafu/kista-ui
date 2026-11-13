'use client'

import type { ReactNode } from 'react'
import { useController, type Control, type ControllerRenderProps, type FieldPath, type FieldValues } from 'react-hook-form'
import { Label } from '@/components/ui/label'

export type FormFieldProps<TValues extends FieldValues, TName extends FieldPath<TValues>> = ControllerRenderProps<TValues, TName> & {
  id: string
  'aria-invalid': boolean
  'aria-describedby'?: string
  'aria-required'?: boolean
}

interface Props<TValues extends FieldValues, TName extends FieldPath<TValues>> {
  control: Control<TValues, unknown, unknown>
  name: TName
  label: ReactNode
  required?: boolean
  hint?: ReactNode
  // 입력 id. 기본은 name — 한 화면에 같은 name의 폼이 둘 뜨면 넘긴다
  id?: string
  className?: string
  children: (field: FormFieldProps<TValues, TName>) => ReactNode
}

// 필드 조립 하나 — Label, 필수 표시(*), 힌트, 오류 문구와 aria 연결을 여기서만 정한다.
// 필수 표시는 label 밖에 둔다: 접근 이름에 "*"가 섞이지 않게 하고, 필수 여부는 aria-required로 알린다
export function FormField<TValues extends FieldValues, TName extends FieldPath<TValues>>({
  control, name, label, required, hint, id = name, className = 'space-y-2', children,
}: Props<TValues, TName>) {
  const { field, fieldState } = useController({ control: control as Control<TValues>, name })
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = fieldState.error?.message ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
  return (
    <div className={className}>
      <div className="flex items-center gap-1">
        <Label htmlFor={id}>{label}</Label>
        {required && <span aria-hidden="true" className="text-sm text-destructive">*</span>}
      </div>
      {children({ ...field, id, 'aria-invalid': !!fieldState.error, 'aria-describedby': describedBy, 'aria-required': required || undefined })}
      {hint && <p id={hintId} className="text-xs text-muted-foreground">{hint}</p>}
      {errorId && <p id={errorId} role="alert" className="text-sm text-destructive">{fieldState.error?.message}</p>}
    </div>
  )
}
