'use client'

import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useChangeUserRoleMutation } from '@entities/admin'
import { USER_ROLE_LABEL } from '@entities/user'
import type { UserRole } from '@entities/user'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Spinner } from '@shared/ui/Spinner'
import { cn } from '@shared/lib/utils'

interface Props {
  userId: string
  nickname: string
  currentRole: UserRole
  isSelf?: boolean
}

const TRIGGER_CLASS = cn(buttonVariants({ variant: 'outline', size: 'xs' }), 'aria-disabled:opacity-50')

export function ChangeRoleButton({ userId, nickname, currentRole, isSelf = false }: Props) {
  const mutation = useChangeUserRoleMutation()
  const newRole: UserRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN'
  const newRoleLabel = USER_ROLE_LABEL[newRole]

  function handleChange() {
    mutation.mutate({ userId, role: newRole }, {
      onSuccess: () => toast.success(`${nickname} 님의 역할을 ${newRoleLabel}로 변경했습니다`),
    })
  }

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
    <AlertDialog>
      <AlertDialogTrigger
        // disabled로 바꾸면 확인 후 포커스가 body로 빠져 트리거로 복귀하지 못한다
        aria-disabled={mutation.isPending}
        onClick={(e) => { if (mutation.isPending) e.preventBaseUIHandler() }}
        className={TRIGGER_CLASS}
      >
        {mutation.isPending ? (
          <><Spinner size={11} />변경 중...</>
        ) : `→ ${newRoleLabel}`}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>역할을 변경하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription>
            {`${nickname} 님의 역할을 ${USER_ROLE_LABEL[currentRole]}에서 ${newRoleLabel}로 변경합니다.`}
            {newRole === 'ADMIN' && ' 관리자는 모든 관리자 기능에 접근할 수 있습니다.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>취소</AlertDialogCancel>
          <AlertDialogAction onClick={handleChange} disabled={mutation.isPending}>
            변경
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
