'use client'

import { useAdminUsersQuery } from '@entities/admin'
import type { AdminUsersQueryParams } from '@entities/admin'
import { ChangeRoleButton } from '@features/admin/change-role'
import { WithdrawUserButton } from '@features/admin/withdraw-user'
import { fmtDate } from '@shared/lib/format'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { EmptyState } from '@shared/ui/EmptyState'
import { TableHeadCell } from '@shared/ui/TableHeadCell'
import { Badge } from '@shared/ui/Badge'
import { ADMIN_USER_STATUS_LABEL, USER_STATUS_TONE } from '@entities/user'
import { useClientPagination } from '@shared/lib/hooks/use-client-pagination'

interface Props {
  currentUserId: string | null
  filterBar?: React.ReactNode
  queryParams?: AdminUsersQueryParams
}

export function AdminUsersTable({ currentUserId, filterBar, queryParams }: Props) {
  const { data: users = [] } = useAdminUsersQuery(undefined, queryParams)
  const { page: currentPage, setPage, size, totalPages, paged, handlePageSizeChange } = useClientPagination(users)

  if (users.length === 0) {
    return (
      <EmptyState message="등록된 사용자가 없습니다." />
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>{filterBar}</div>
        <PageSizeSelector value={String(size)} onChange={handlePageSizeChange} />
      </div>

      <div className="rounded-[var(--r-lg)] border border-border overflow-x-auto">
        <table className="min-w-[720px] w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <TableHeadCell className="text-left whitespace-nowrap">닉네임</TableHeadCell>
              <TableHeadCell className="text-left whitespace-nowrap">상태</TableHeadCell>
              <TableHeadCell className="text-left whitespace-nowrap">역할</TableHeadCell>
              <TableHeadCell className="text-left whitespace-nowrap">가입일</TableHeadCell>
              <TableHeadCell className="whitespace-nowrap">역할 변경</TableHeadCell>
              <TableHeadCell className="whitespace-nowrap">탈퇴</TableHeadCell>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paged.map((user) => (
              <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-medium whitespace-nowrap">{user.nickname}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Badge tone={USER_STATUS_TONE[user.status]}>{ADMIN_USER_STATUS_LABEL[user.status]}</Badge>
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
