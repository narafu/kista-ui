'use client'

import { useAdminUsersQuery } from '@entities/admin'
import type { AdminUsersQueryParams } from '@entities/admin'
import { ChangeRoleButton } from '@features/admin/change-role'
import { WithdrawUserButton } from '@features/admin/withdraw-user'
import { fmtDate } from '@shared/lib/format'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { EmptyState } from '@shared/ui/EmptyState'
import { LoadingRow } from '@shared/ui/LoadingRow'
import { SectionError } from '@shared/ui/SectionError'
import { TableHeadCell } from '@shared/ui/TableHeadCell'
import { Badge } from '@shared/ui/Badge'
import { ADMIN_USER_STATUS_LABEL, USER_ROLE_LABEL, USER_STATUS_TONE } from '@entities/user'
import { useClientPagination } from '@shared/lib/hooks/use-client-pagination'
import type { AdminUser } from '@entities/admin'
import { TableDataCell } from '@shared/ui/TableDataCell'

// 조회 전·실패 시에도 페이지네이션 훅 입력 참조를 고정한다
const EMPTY_USERS: AdminUser[] = []

interface Props {
  currentUserId: string | null
  filterBar?: React.ReactNode
  queryParams?: AdminUsersQueryParams
}

export function AdminUsersTable({ currentUserId, filterBar, queryParams }: Props) {
  const { data, isError } = useAdminUsersQuery(undefined, queryParams)
  const users = data ?? EMPTY_USERS
  const { page: currentPage, setPage, size, totalPages, paged, handlePageSizeChange } = useClientPagination(users)

  if (!data && isError) return <SectionError message="사용자 목록을 불러오지 못했습니다." />
  if (!data) return <LoadingRow />

  // 기간 필터로 0건이 되어도 필터바는 남겨 사용자가 범위를 바꿔 복구할 수 있게 한다
  if (users.length === 0) {
    const filtered = !!queryParams?.from || !!queryParams?.to
    return (
      <div className="space-y-4">
        {filterBar}
        <EmptyState message={filtered ? '해당 기간에 가입한 사용자가 없습니다.' : '등록된 사용자가 없습니다.'} />
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>{filterBar}</div>
        <PageSizeSelector value={String(size)} onChange={handlePageSizeChange} />
      </div>

      <div className="rounded-[var(--r-lg)] border border-border overflow-x-auto" role="region" aria-label="사용자 목록" tabIndex={0}>
        <table className="min-w-[720px] w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <TableHeadCell className="whitespace-nowrap">닉네임</TableHeadCell>
              <TableHeadCell className="whitespace-nowrap">상태</TableHeadCell>
              <TableHeadCell className="whitespace-nowrap">역할</TableHeadCell>
              <TableHeadCell className="whitespace-nowrap">가입일</TableHeadCell>
              <TableHeadCell className="whitespace-nowrap">역할 변경</TableHeadCell>
              <TableHeadCell className="whitespace-nowrap">탈퇴 처리</TableHeadCell>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paged.map((user) => (
              <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                <TableDataCell className="text-left font-medium whitespace-nowrap">{user.nickname}</TableDataCell>
                <TableDataCell className="text-left whitespace-nowrap">
                  <Badge tone={USER_STATUS_TONE[user.status]}>{ADMIN_USER_STATUS_LABEL[user.status]}</Badge>
                </TableDataCell>
                <TableDataCell className="text-left whitespace-nowrap">
                  <Badge tone={user.role === 'ADMIN' ? 'admin' : 'neutral'}>{USER_ROLE_LABEL[user.role]}</Badge>
                </TableDataCell>
                <TableDataCell className="text-left text-muted-foreground whitespace-nowrap">
                  {fmtDate(user.createdAt)}
                </TableDataCell>
                <TableDataCell className="whitespace-nowrap">
                  <ChangeRoleButton
                    userId={user.id}
                    nickname={user.nickname}
                    currentRole={user.role}
                    isSelf={currentUserId === user.id}
                  />
                </TableDataCell>
                <TableDataCell className="whitespace-nowrap">
                  <WithdrawUserButton
                    userId={user.id}
                    nickname={user.nickname}
                    isSelf={currentUserId === user.id}
                  />
                </TableDataCell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PaginationBar page={currentPage} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}
