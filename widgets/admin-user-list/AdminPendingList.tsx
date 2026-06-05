'use client'

import { Clock } from 'lucide-react'
import { useAdminUsersQuery } from '@entities/user'
import { ApproveRejectButtons } from '@features/admin/approve-reject'
import type { AdminUser } from '@entities/user'

interface Props {
  initialUsers: AdminUser[]
  max?: number
}

export function AdminPendingList({ initialUsers, max }: Props) {
  const { data: users = initialUsers } = useAdminUsersQuery('PENDING', initialUsers)
  const displayed = max ? users.slice(0, max) : users

  if (displayed.length === 0) {
    return (
      <div className="rounded-xl border border-border p-16 text-center">
        <Clock className="size-10 text-muted-foreground mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">새로운 가입 신청이 없습니다</p>
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      {displayed.map((user) => (
        <div
          key={user.id}
          className="rounded-xl border border-border bg-background px-5 py-4 flex items-center justify-between gap-4"
        >
          <div className="min-w-0">
            <p className="font-semibold truncate">{user.nickname}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              가입일 {new Date(user.createdAt).toLocaleDateString('ko-KR')}
            </p>
          </div>
          <ApproveRejectButtons userId={user.id} nickname={user.nickname} />
        </div>
      ))}
    </div>
  )
}
