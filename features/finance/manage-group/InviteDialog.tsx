'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { buttonVariants } from '@/components/ui/button-variants'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@shared/lib/utils'
import { useCreateFinanceGroupInvitationMutation } from '@entities/finance'
import type { FinanceGroupInvitation } from '@entities/finance'

// 초대 발급 API는 상한을 두지 않지만(kista-api), 재조회 API가 없어 발급 즉시 코드를 잃어버리면
// 복구 불가능하다 — 프리셋으로 제한해 실수로 과도한 만료시간을 입력하는 걸 막는다.
const EXPIRES_PRESETS = [
  { value: '24', label: '24시간' },
  { value: '72', label: '72시간' },
  { value: '168', label: '7일' },
]

interface Props {
  groupId: string
}

export function InviteDialog({ groupId }: Props) {
  const [open, setOpen] = useState(false)
  const [expiresInHours, setExpiresInHours] = useState('24')
  const [invitation, setInvitation] = useState<FinanceGroupInvitation | null>(null)
  const mutation = useCreateFinanceGroupInvitationMutation(groupId)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setInvitation(null)
      setExpiresInHours('24')
    }
  }

  async function handleCopy() {
    if (!invitation) return
    await navigator.clipboard.writeText(invitation.code)
    toast.success('초대 코드를 복사했습니다')
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger className={cn(buttonVariants({ size: 'sm' }))}>초대하기</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>초대 코드 발급</DialogTitle>
          <DialogDescription>발급된 코드를 전달받은 사람이 입력하면 이 그룹에 합류합니다.</DialogDescription>
        </DialogHeader>

        {invitation ? (
          <div className="space-y-3">
            <p className="text-center text-2xl font-mono font-semibold tracking-widest">{invitation.code}</p>
            <p className="text-sm text-destructive">이 코드는 다시 확인할 수 없으니 지금 복사하거나 전달하세요.</p>
            <Button type="button" className="w-full" onClick={handleCopy}>코드 복사</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Select
              items={EXPIRES_PRESETS}
              value={expiresInHours}
              onValueChange={(next) => { if (next) setExpiresInHours(next) }}
            >
              <SelectTrigger aria-label="만료 시간" className="w-full h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPIRES_PRESETS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              type="button"
              className="w-full"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate(Number(expiresInHours), { onSuccess: setInvitation })}
            >
              {mutation.isPending ? '발급 중...' : '발급하기'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
