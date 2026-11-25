'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm, type DefaultValues, type FieldValues, type Path, type UseFormProps, type UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'
import { apiFieldErrors } from '@shared/lib/api-client'

/** 서버 ProblemDetail의 `fieldErrors[{field, detail}]`(api T7)를 RHF 이름으로 바꾼다 — 배열 경로 `rules[0].amount` → `rules.0.amount`. field null은 그대로 */
export function serverFieldErrors(err: unknown): { field: string | null; message: string }[] {
  return apiFieldErrors(err).map((e) => ({ field: e.field?.replace(/\[(\d+)\]/g, '.$1') ?? null, message: e.detail }))
}

// 기존 entities mutation hook(useMutation 결과)을 그대로 받는다 — 02의 $api.useMutation도 같은 모양이다
interface MutationLike<TPayload> {
  mutate(payload: TPayload, options: { onSuccess: () => void; onError: (err: unknown) => void }): void
  isPending: boolean
}

// 아래 여섯 개 밖의 옵션(values, resetOptions, mode 등)은 useForm에 그대로 넘긴다. 서버값을 따라가는 폼은 defaultValues 대신 values를 준다
type Options<TInput extends FieldValues, TOutput, TPayload> = Omit<UseFormProps<TInput, unknown, TOutput>, 'resolver' | 'defaultValues' | 'values'> & {
  schema: z.ZodType<TOutput, TInput>
  // 생성·수정은 호출부가 mode로 hook 하나를 골라 넘긴다
  mutation: MutationLike<TPayload>
  // 폼 값 → 요청 바디. 없으면 폼 값을 그대로 보낸다
  toPayload?: (values: TOutput) => TPayload
  // 성공 토스트를 hook이 이미 띄우면 넘기지 않는다
  successMessage?: string
  onDone?: () => void
} & ({ defaultValues: DefaultValues<TInput>; values?: TInput } | { defaultValues?: DefaultValues<TInput>; values: TInput })

export type AppForm<TInput extends FieldValues = FieldValues, TOutput = TInput> = UseFormReturn<TInput, unknown, TOutput> & {
  /** `<form onSubmit>`에 건다. 검증 → mutate → 성공 토스트·onDone */
  submit: (e?: React.BaseSyntheticEvent) => Promise<void>
  isPending: boolean
}

// 폼 구현 하나 — zod 검증(형식만), 제출, 진행 상태, 성공 처리, 서버 필드 오류 매핑을 묶는다.
// 진행 상태는 RHF isSubmitting이 아니라 mutation.isPending이다(mutate는 기다리지 않고, hook의 async onSuccess까지 pending이 이어진다)
export function useAppForm<TInput extends FieldValues, TOutput = TInput, TPayload = TOutput>({
  schema, mutation, toPayload, successMessage, onDone, ...formProps
}: Options<TInput, TOutput, TPayload>): AppForm<TInput, TOutput> {
  const form = useForm<TInput, unknown, TOutput>({ ...formProps, resolver: zodResolver(schema as never) })
  // 서버 거절 칸 포커스는 진행이 끝난 뒤에 준다 — onError 시점엔 disabled={isPending} 입력이 아직 잠겨 focus()가 먹지 않는다
  // 상태로 둔다 — 응답이 빨라 진행 중 렌더가 건너뛰어져도 이 값의 변경이 렌더·effect를 부른다
  const [focusField, setFocusField] = useState<Path<TInput> | null>(null)
  useEffect(() => {
    if (mutation.isPending || !focusField) return
    form.setFocus(focusField)
    setFocusField(null)
  }, [mutation.isPending, focusField, form])
  const submit = form.handleSubmit((values) => {
    mutation.mutate(toPayload ? toPayload(values) : (values as unknown as TPayload), {
      onSuccess: () => {
        if (successMessage) toast.success(successMessage)
        onDone?.()
      },
      // 실패 토스트(detail 요약)는 hook onError가 띄운다. 여기는 필드 문장을 붙인다 — 이름이 등록된 필드면 그 칸에(첫 칸 포커스),
      // 아니면(field null, 요청 바디에만 있는 이름) root.server로 모아 FormActions가 버튼 위 한 줄로 그린다. 폼마다 이름 대응표를 두지 않는다
      onError: (err) => {
        const unmatched: string[] = []
        let first: Path<TInput> | null = null
        for (const { field, message } of serverFieldErrors(err)) {
          // ponytail: RHF 내부 `_names.mount`(지금 마운트된 필드 이름)로 판정한다 — 공개 API에 없음. RHF 올릴 때 이 테스트가 깨지면 확인
          if (field && form.control._names.mount.has(field)) {
            form.setError(field as Path<TInput>, { type: 'server', message })
            first ??= field as Path<TInput>
          } else unmatched.push(message)
        }
        if (first) setFocusField(first)
        if (unmatched.length > 0) form.setError('root.server', { type: 'server', message: unmatched.join(' ') })
      },
    })
  })
  return { ...form, submit, isPending: mutation.isPending }
}
