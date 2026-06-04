'use client'

import { toast } from 'sonner'
import { useChangeUserRoleMutation } from '@entities/user'
import type { UserRole } from '@entities/user'

interface Props {
  userId: string
  currentRole: UserRole
}

export function ChangeRoleButton({ userId, currentRole }: Props) {
  const mutation = useChangeUserRoleMutation()
  const newRole: UserRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN'

  function handleChange() {
    mutation.mutate({ userId, role: newRole }, {
      onSuccess: () => toast.success(`역할을 ${newRole}로 변경했습니다`),
      onError: () => toast.error('역할 변경 실패'),
    })
  }

  return (
    <button
      type="button"
      onClick={handleChange}
      disabled={mutation.isPending}
      className="px-2.5 py-1 text-xs font-semibold rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-50 transition-colors"
    >
      {mutation.isPending ? '...' : `→ ${newRole}`}
    </button>
  )
}
