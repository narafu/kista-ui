'use client'

import { useAdminUsersQuery } from '@entities/user'
import { ChangeRoleButton } from '@features/admin/change-role'
import { WithdrawUserButton } from '@features/admin/withdraw-user'
import { fmtDate } from '@shared/lib/format'
import type { AdminUser, UserStatus } from '@entities/user'

const STATUS_LABEL: Record<UserStatus, string> = {
  PENDING: '대기',
  ACTIVE: '승인',
  REJECTED: '거절',
}

interface Props {
  initialUsers: AdminUser[]
}

export function AdminUsersTable({ initialUsers }: Props) {
  const { data: users = initialUsers } = useAdminUsersQuery(undefined, initialUsers)

  if (users.length === 0) {
    return (
      <div className="rounded-xl border border-border p-12 text-center text-sm text-muted-foreground">
        등록된 사용자가 없습니다
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs text-muted-foreground font-semibold">
          <tr>
            <th className="text-left px-4 py-3 whitespace-nowrap">닉네임</th>
            <th className="text-left px-4 py-3 whitespace-nowrap">상태</th>
            <th className="text-left px-4 py-3 whitespace-nowrap">역할</th>
            <th className="text-left px-4 py-3 whitespace-nowrap">가입일</th>
            <th className="text-left px-4 py-3 whitespace-nowrap">역할 변경</th>
            <th className="text-left px-4 py-3 whitespace-nowrap">탈퇴</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-muted/20 transition-colors">
              <td className="px-4 py-3 font-medium whitespace-nowrap">{user.nickname}</td>
              <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                {STATUS_LABEL[user.status]}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                {user.role}
              </td>
              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                {fmtDate(user.createdAt)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <ChangeRoleButton userId={user.id} currentRole={user.role} />
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <WithdrawUserButton userId={user.id} nickname={user.nickname} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
