'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { changeAdminUserRole } from '@/lib/api/admin'
import type { UserRole } from '@/types/user'
import { toast } from 'sonner'

interface Props {
  userId: string
  currentRole: UserRole
}

export function ChangeRoleButton({ userId, currentRole }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const newRole: UserRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN'

  async function handleChange() {
    setLoading(true)
    try {
      await changeAdminUserRole(userId, newRole)
      toast.success(`역할을 ${newRole}로 변경했습니다`)
      router.refresh()
    } catch {
      toast.error('역할 변경 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleChange}
      disabled={loading}
      className="px-2.5 py-1 text-xs font-semibold rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-50 transition-colors"
    >
      {loading ? '...' : `→ ${newRole}`}
    </button>
  )
}
