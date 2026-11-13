'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type DefaultValues, type FieldValues, type Path, type UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'
import { ApiError } from '@shared/lib/api-client'

// ponytail: api T7(fieldErrors) 전이라 꺼 둔다. 그동안 실패는 mutation hook의 onError 토스트가 서버 detail로 알린다.
// 켤 때는 필드에 붙인 오류를 hook 토스트가 또 띄우지 않게 hook의 onError도 함께 고친다(이중 알림).
export const MAP_SERVER_FIELD_ERRORS = false

/** 서버 ProblemDetail의 `fieldErrors[{field, detail}]`를 필드 오류 목록으로 바꾼다. 형태가 다르면 빈 배열 */
export function serverFieldErrors(err: unknown): { field: string; message: string }[] {
  if (!(err instanceof ApiError)) return []
  const list = (err.body as { fieldErrors?: unknown } | null)?.fieldErrors
  if (!Array.isArray(list)) return []
  return list.flatMap((e: { field?: unknown; detail?: unknown }) =>
    typeof e?.field === 'string' && typeof e.detail === 'string' ? [{ field: e.field, message: e.detail }] : [])
}

// 기존 entities mutation hook(useMutation 결과)을 그대로 받는다 — 02의 $api.useMutation도 같은 모양이다
interface MutationLike<TPayload> {
  mutate(payload: TPayload, options: { onSuccess: () => void; onError: (err: unknown) => void }): void
  isPending: boolean
}

interface Options<TInput extends FieldValues, TOutput, TPayload> {
  schema: z.ZodType<TOutput, TInput>
  defaultValues: DefaultValues<TInput>
  // 생성·수정은 호출부가 mode로 hook 하나를 골라 넘긴다
  mutation: MutationLike<TPayload>
  // 폼 값 → 요청 바디. 없으면 폼 값을 그대로 보낸다
  toPayload?: (values: TOutput) => TPayload
  // 성공 토스트를 hook이 이미 띄우면 넘기지 않는다
  successMessage?: string
  onDone?: () => void
}

export type AppForm<TInput extends FieldValues = FieldValues, TOutput = TInput> = UseFormReturn<TInput, unknown, TOutput> & {
  /** `<form onSubmit>`에 건다. 검증 → mutate → 성공 토스트·onDone */
  submit: (e?: React.BaseSyntheticEvent) => Promise<void>
  isPending: boolean
}

// 폼 구현 하나 — zod 검증(형식만), 제출, 진행 상태, 성공 처리, 서버 필드 오류 매핑을 묶는다.
// 진행 상태는 RHF isSubmitting이 아니라 mutation.isPending이다(mutate는 기다리지 않고, hook의 async onSuccess까지 pending이 이어진다)
export function useAppForm<TInput extends FieldValues, TOutput = TInput, TPayload = TOutput>({
  schema, defaultValues, mutation, toPayload, successMessage, onDone,
}: Options<TInput, TOutput, TPayload>): AppForm<TInput, TOutput> {
  const form = useForm<TInput, unknown, TOutput>({ resolver: zodResolver(schema as never), defaultValues })
  const submit = form.handleSubmit((values) => {
    mutation.mutate(toPayload ? toPayload(values) : (values as unknown as TPayload), {
      onSuccess: () => {
        if (successMessage) toast.success(successMessage)
        onDone?.()
      },
      onError: (err) => {
        if (!MAP_SERVER_FIELD_ERRORS) return
        for (const { field, message } of serverFieldErrors(err)) form.setError(field as Path<TInput>, { type: 'server', message })
      },
    })
  })
  return { ...form, submit, isPending: mutation.isPending }
}
