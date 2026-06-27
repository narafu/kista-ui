'use client'

import { toast } from 'sonner'
import { useChangeUserRoleMutation } from '@entities/user'
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
    <button
      type="button"
      onClick={handleChange}
      disabled={mutation.isPending}
      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-50 transition-colors"
    >
      {mutation.isPending ? (
        <><Spinner size={11} />변경 중...</>
      ) : `→ ${newRole}`}
    </button>
  )
}
