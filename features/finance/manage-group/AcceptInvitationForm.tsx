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

  // 거절(DECLINED) 응답은 kista-api가 {name: null}을 담은 200을 반환한다 — 응답 본문을
  // 렌더링에 쓰지 않고 상태 분기로만 toast 문구를 고른다.
  function respond(status: 'ACCEPTED' | 'DECLINED') {
    if (!code.trim() || mutation.isPending) return
    mutation.mutate({ code: code.trim(), status }, {
      onSuccess: () => {
        toast.success(status === 'ACCEPTED' ? '그룹에 합류했습니다' : '초대를 거절했습니다')
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
        <Button type="button" variant="outline" disabled={mutation.isPending || !code.trim()} onClick={() => respond('DECLINED')}>
          거절
        </Button>
        <Button type="button" disabled={mutation.isPending || !code.trim()} onClick={() => respond('ACCEPTED')}>
          수락
        </Button>
      </div>
    </div>
  )
}
