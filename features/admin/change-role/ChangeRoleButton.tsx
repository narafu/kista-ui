'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useChangeUserRoleMutation } from '@entities/admin'
import { useMeta } from '@entities/meta'
import type { UserRole } from '@entities/user'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { blockTriggerWhile } from '@shared/ui/blockTriggerWhile'
import { ConfirmDialog } from '@shared/ui/ConfirmDialog'
import { Spinner } from '@shared/ui/Spinner'
import { cn } from '@shared/lib/utils'

interface Props {
  userId: string
  nickname: string
  currentRole: UserRole
  isSelf?: boolean
}

const TRIGGER_CLASS = cn(buttonVariants({ variant: 'outline', size: 'xs' }))

export function ChangeRoleButton({ userId, nickname, currentRole, isSelf = false }: Props) {
  const [open, setOpen] = useState(false)
  const mutation = useChangeUserRoleMutation()
  const newRole: UserRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN'
  const { labelOf } = useMeta()
  const newRoleLabel = labelOf('userRoles', newRole)

  if (isSelf) {
    return (
      <>
        <Button variant="outline" size="xs" disabled aria-describedby={`self-role-${userId}`}>
          → {newRoleLabel}
        </Button>
        <span id={`self-role-${userId}`} className="sr-only">자신의 역할은 변경할 수 없습니다</span>
      </>
    )
  }

  return (
    <>
      <ConfirmDialog
        // disabled로 바꾸면 확인 후 포커스가 body로 빠져 트리거로 복귀하지 못한다
        trigger={
          <button type="button" aria-disabled={mutation.isPending} onClick={blockTriggerWhile(mutation.isPending)} className={TRIGGER_CLASS}>
            {mutation.isPending ? (
              <><Spinner size={11} />변경 중…</>
            ) : `→ ${newRoleLabel}`}
          </button>
        }
        open={open}
        onOpenChange={setOpen}
        size="default"
        destructive={false}
        title="역할을 변경하시겠습니까?"
        description={
          <>
            {`${nickname} 님의 역할을 ${labelOf('userRoles', currentRole)}에서 ${newRoleLabel}로 변경합니다.`}
            {newRole === 'ADMIN' && ' 관리자는 모든 관리자 기능에 접근할 수 있습니다.'}
          </>
        }
        confirmLabel="변경"
        pendingLabel="변경"
        mutation={mutation}
        variables={{ userId, role: newRole }}
        onSuccess={() => toast.success(`${nickname} 님의 역할을 ${newRoleLabel}로 변경했습니다`)}
      />
    </>
  )
}
