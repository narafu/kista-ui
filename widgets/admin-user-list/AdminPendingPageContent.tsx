'use client'

import { useAdminUsersQuery } from '@entities/admin'
import { PageHeader } from '@widgets/page-header'
import { AdminPendingList } from './AdminPendingList'

export function AdminPendingPageContent() {
  const { data: users = [] } = useAdminUsersQuery('PENDING')

  return (
    <>
      <PageHeader
        eyebrow="개요"
        eyebrowHref="/admin"
        title="승인 대기"
        description={users.length > 0 ? `${users.length}명이 승인을 기다리고 있습니다.` : '가입 신청을 검토하고 승인하거나 거절합니다.'}
      />
      <AdminPendingList />
    </>
  )
}
