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
import type { UserRole } from '@entities/user'
import { Spinner } from '@shared/ui/Spinner'

interface Props {
  userId: string
  currentRole: UserRole
  isSelf?: boolean
}

export function ChangeRoleButton({ userId, currentRole, isSelf = false }: Props) {
  const mutation = useChangeUserRoleMutation()
  const newRole: UserRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN'

  function handleChange() {
    mutation.mutate({ userId, role: newRole }, {
      onSuccess: () => toast.success(`역할을 ${newRole}로 변경했습니다`),
      onError: () => toast.error('역할 변경 실패'),
    })
  }

  if (isSelf) {
    return (
      <div className="inline-block" title="자신의 역할은 변경할 수 없습니다">
        <button
          type="button"
          disabled
          className="px-2.5 py-1 text-xs font-semibold rounded-md border border-border text-muted-foreground opacity-40 pointer-events-none"
        >
          → {newRole}
        </button>
      </div>
    )
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        disabled={mutation.isPending}
        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-50 transition-colors"
      >
        {mutation.isPending ? (
          <><Spinner size={11} />변경 중...</>
        ) : `→ ${newRole}`}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>역할을 변경하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription>
            {`이 회원의 역할을 ${currentRole}에서 ${newRole}(으)로 변경합니다.`}
            {newRole === 'ADMIN' && ' ADMIN은 모든 관리자 기능에 접근할 수 있습니다.'}
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
