'use client'

import { toast } from 'sonner'
import { useChangeUserRoleMutation } from '@entities/user'
import type { UserRole } from '@entities/user'

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
        <>
          <svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          변경 중...
        </>
      ) : `→ ${newRole}`}
    </button>
  )
}
