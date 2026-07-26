'use client'

import { useAdminUsersQuery } from '@entities/admin'
import type { AdminUsersQueryParams } from '@entities/admin'
import { UrlRangeFilterBar } from '@shared/ui/UrlRangeFilterBar'
import { AdminUsersTable } from './AdminUsersTable'

interface Props {
  currentUserId: string | null
  range: Parameters<typeof UrlRangeFilterBar>[0]['current']
  from?: string
  to?: string
  queryParams: AdminUsersQueryParams
}

export function AdminUsersContent({ currentUserId, range, from, to, queryParams }: Props) {
  const { data: users = [] } = useAdminUsersQuery(undefined, queryParams)

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold">사용자 목록</h1>
        <p className="text-sm text-muted-foreground mt-1">전체 {users.length}명</p>
      </div>
      <AdminUsersTable
        currentUserId={currentUserId}
        queryParams={queryParams}
        filterBar={<UrlRangeFilterBar current={range} from={from} to={to} />}
      />
    </>
  )
}
