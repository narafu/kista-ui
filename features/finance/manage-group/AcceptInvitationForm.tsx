'use client'

import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@shared/ui/form/FormField'
import { useAppForm } from '@shared/ui/form/useAppForm'
import { useRespondToInvitationMutation } from '@entities/finance'

const schema = z.object({ code: z.string().trim().min(1, '초대 코드를 입력하세요.') })

export function AcceptInvitationForm() {
  const form = useAppForm({
    schema,
    defaultValues: { code: '' },
    mutation: useRespondToInvitationMutation(),
    toPayload: (v) => ({ code: v.code, status: 'ACCEPTED' as const }),
    successMessage: '그룹에 참여했습니다',
    onDone: (): void => form.reset(),
  })

  return (
    <form onSubmit={form.submit}>
      <FormField control={form.control} name="code" id="invitationCode" label="초대 코드가 있으신가요?">
        {(f) => (
          <div className="flex gap-2">
            <Input {...f} placeholder="초대 코드 입력" disabled={form.isPending} className="h-11 flex-1" />
            <Button type="submit" className="h-11" disabled={form.isPending || !form.watch('code').trim()}>
              참여
            </Button>
          </div>
        )}
      </FormField>
    </form>
  )
}
