'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRespondToInvitationMutation } from '@entities/finance'

export function AcceptInvitationForm() {
  const [code, setCode] = useState('')
  const mutation = useRespondToInvitationMutation()

  function accept() {
    if (!code.trim() || mutation.isPending) return
    mutation.mutate({ code: code.trim(), status: 'ACCEPTED' }, {
      onSuccess: () => {
        toast.success('그룹에 합류했습니다')
        setCode('')
      },
    })
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="invitationCode">초대 코드가 있으신가요?</Label>
      <div className="flex gap-2">
        <Input
          id="invitationCode"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="초대 코드 입력"
          disabled={mutation.isPending}
          className="h-11 flex-1"
        />
        <Button type="button" disabled={mutation.isPending || !code.trim()} onClick={accept}>
          수락
        </Button>
      </div>
    </div>
  )
}
