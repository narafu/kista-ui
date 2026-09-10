import { toast } from 'sonner'

interface MutateLike<TVariables> {
  mutate: (variables: TVariables, options: { onSuccess: () => void }) => void
}

interface SubmitFormDialogOptions<TPayload extends object, TCreatePayload extends TPayload = TPayload> {
  mode: 'create' | 'edit'
  payload: TPayload
  createMutation: MutateLike<TCreatePayload>
  updateMutation: MutateLike<TPayload>
  createExtra?: Partial<TCreatePayload>
  messages: { create: string; edit: string }
  onSuccess: () => void
}

export function submitFormDialog<TPayload extends object, TCreatePayload extends TPayload = TPayload>({
  mode,
  payload,
  createMutation,
  updateMutation,
  createExtra,
  messages,
  onSuccess,
}: SubmitFormDialogOptions<TPayload, TCreatePayload>): void {
  if (mode === 'edit') {
    updateMutation.mutate(payload, {
      onSuccess: () => {
        toast.success(messages.edit)
        onSuccess()
      },
    })
    return
  }

  createMutation.mutate({ ...payload, ...createExtra } as TCreatePayload, {
    onSuccess: () => {
      toast.success(messages.create)
      onSuccess()
    },
  })
}
