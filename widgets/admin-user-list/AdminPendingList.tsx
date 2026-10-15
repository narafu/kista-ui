'use client'

import { Clock } from 'lucide-react'
import { useAdminUsersQuery } from '@entities/admin'
import { ApproveRejectButtons } from '@features/admin/approve-reject'
import { fmtDate } from '@shared/lib/format'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { EmptyState } from '@shared/ui/EmptyState'
import { LoadingRow } from '@shared/ui/LoadingRow'
import { SectionError } from '@shared/ui/SectionError'
import { useClientPagination } from '@shared/lib/hooks/use-client-pagination'
import type { AdminUser } from '@entities/admin'

// 조회 전·실패 시에도 페이지네이션 훅 입력 참조를 고정한다
const EMPTY_USERS: AdminUser[] = []

interface Props {
  max?: number
}

export function AdminPendingList({ max }: Props) {
  const { data, isError } = useAdminUsersQuery('PENDING')
  const users = data ?? EMPTY_USERS
  const source = max ? users.slice(0, max) : users
  const { page: currentPage, setPage, size, totalPages, paged: displayed, handlePageSizeChange } = useClientPagination(source)

  if (!data && isError) return <SectionError message="가입 신청 목록을 불러오지 못했습니다." />
  if (!data) return <LoadingRow />

  if (source.length === 0) {
    return (
      <EmptyState message="새로운 가입 신청이 없습니다.">
        <Clock className="size-10 text-muted-foreground mx-auto mb-4" />
      </EmptyState>
    )
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <PageSizeSelector value={String(size)} onChange={handlePageSizeChange} />
      </div>

      <div className="grid gap-3">
        {displayed.map((user) => (
          <div
            key={user.id}
            className="rounded-[var(--r-lg)] border border-border bg-background px-5 py-4 flex items-center justify-between gap-4"
          >
            <div className="min-w-0">
              <p className="font-semibold truncate">{user.nickname}</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                가입일 {fmtDate(user.createdAt)}
              </p>
            </div>
            <ApproveRejectButtons userId={user.id} nickname={user.nickname} />
          </div>
        ))}
      </div>

      <PaginationBar page={currentPage} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}
