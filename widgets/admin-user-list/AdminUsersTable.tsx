'use client'

import { useState } from 'react'
import { useAdminUsersQuery } from '@entities/admin'
import { ChangeRoleButton } from '@features/admin/change-role'
import { WithdrawUserButton } from '@features/admin/withdraw-user'
import { fmtDate } from '@shared/lib/format'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { EmptyState } from '@shared/ui/EmptyState'
import type { AdminUser } from '@entities/admin'
import type { UserStatus } from '@entities/user'

const STATUS_LABEL: Record<UserStatus, string> = {
  PENDING: '대기',
  ACTIVE: '승인',
  REJECTED: '거절',
}

interface Props {
  initialUsers: AdminUser[]
  currentUserId: string | null
  filterBar?: React.ReactNode
}

export function AdminUsersTable({ initialUsers, currentUserId, filterBar }: Props) {
  const { data: users = initialUsers } = useAdminUsersQuery(undefined, initialUsers)
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)

  const totalPages = Math.max(1, Math.ceil(users.length / size))
  const currentPage = Math.min(page, totalPages)
  const paged = users.slice((currentPage - 1) * size, currentPage * size)

  const handleSizeChange = (s: string) => {
    setSize(Number(s))
    setPage(1)
  }

  if (users.length === 0) {
    return (
      <EmptyState message="등록된 사용자가 없습니다." />
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>{filterBar}</div>
        <PageSizeSelector value={String(size)} onChange={handleSizeChange} />
      </div>

      <div className="rounded-[var(--r-lg)] border border-border overflow-x-auto">
        <table className="min-w-[720px] w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground font-semibold">
            <tr>
              <th className="text-left px-4 py-3 whitespace-nowrap">닉네임</th>
              <th className="text-left px-4 py-3 whitespace-nowrap">상태</th>
              <th className="text-left px-4 py-3 whitespace-nowrap">역할</th>
              <th className="text-left px-4 py-3 whitespace-nowrap">가입일</th>
              <th className="text-center px-4 py-3 whitespace-nowrap">역할 변경</th>
              <th className="text-center px-4 py-3 whitespace-nowrap">탈퇴</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paged.map((user) => (
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
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <ChangeRoleButton
                    userId={user.id}
                    currentRole={user.role}
                    isSelf={currentUserId === user.id}
                  />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <WithdrawUserButton
                    userId={user.id}
                    nickname={user.nickname}
                    isSelf={currentUserId === user.id}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PaginationBar page={currentPage} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}
