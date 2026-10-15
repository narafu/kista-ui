'use client'

import { useAdminUsersQuery } from '@entities/admin'
import type { AdminUsersQueryParams } from '@entities/admin'
import { PageHeader } from '@widgets/page-header'
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
  const { data: users } = useAdminUsersQuery(undefined, queryParams)

  return (
    <>
      {/* 조회 전·실패 시 "전체 0명"으로 보이지 않도록 건수는 데이터가 있을 때만 표시 */}
      <PageHeader title="사용자 목록" description={users ? `전체 ${users.length}명` : undefined} />
      <AdminUsersTable
        currentUserId={currentUserId}
        queryParams={queryParams}
        filterBar={<UrlRangeFilterBar current={range} from={from} to={to} />}
      />
    </>
  )
}
