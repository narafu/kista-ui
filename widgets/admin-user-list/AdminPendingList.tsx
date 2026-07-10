'use client'

import { useState } from 'react'
import { Clock } from 'lucide-react'
import { useAdminUsersQuery } from '@entities/admin'
import { ApproveRejectButtons } from '@features/admin/approve-reject'
import { fmtDate } from '@shared/lib/format'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { EmptyState } from '@shared/ui/EmptyState'
import type { AdminUser } from '@entities/admin'

interface Props {
  initialUsers: AdminUser[]
  max?: number
}

export function AdminPendingList({ initialUsers, max }: Props) {
  const { data: users = initialUsers } = useAdminUsersQuery('PENDING', initialUsers)
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)

  const source = max ? users.slice(0, max) : users
  const totalPages = Math.max(1, Math.ceil(source.length / size))
  const currentPage = Math.min(page, totalPages)
  const displayed = source.slice((currentPage - 1) * size, currentPage * size)

  const handleSizeChange = (s: string) => {
    setSize(Number(s))
    setPage(1)
  }

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
        <PageSizeSelector value={String(size)} onChange={handleSizeChange} />
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
