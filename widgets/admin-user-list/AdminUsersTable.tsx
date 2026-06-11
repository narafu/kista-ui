'use client'

import { useAdminUsersQuery } from '@entities/user'
import { ChangeRoleButton } from '@features/admin/change-role'
import { fmtDate } from '@shared/lib/format'
import type { AdminUser, UserStatus } from '@entities/user'

const STATUS_LABEL: Record<UserStatus, string> = {
  PENDING: '대기',
  ACTIVE: '승인',
  REJECTED: '거절',
}
const STATUS_COLOR: Record<UserStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-slate-100 text-slate-600',
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
    <div className="rounded-xl border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs text-muted-foreground font-semibold">
          <tr>
            <th className="text-left px-4 py-3">닉네임</th>
            <th className="text-left px-4 py-3">상태</th>
            <th className="text-left px-4 py-3">역할</th>
            <th className="text-left px-4 py-3">가입일</th>
            <th className="text-left px-4 py-3">역할 변경</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-muted/20 transition-colors">
              <td className="px-4 py-3 font-medium">{user.nickname}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[user.status]}`}>
                  {STATUS_LABEL[user.status]}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                  user.role === 'ADMIN'
                    ? 'bg-rose-500 text-white'
                    : 'bg-slate-500 text-white'
                }`}>
                  {user.role}
                </span>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {fmtDate(user.createdAt)}
              </td>
              <td className="px-4 py-3">
                <ChangeRoleButton userId={user.id} currentRole={user.role} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
