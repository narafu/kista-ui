import { getAuthToken } from '@shared/lib/auth/token'
import { listAdminUsers } from '@entities/admin'
import { AdminPendingList } from '@widgets/admin-user-list'

export default async function AdminPendingPage() {
  const token = await getAuthToken()
  const users = token ? await listAdminUsers(token, 'PENDING').catch(() => []) : []

  return (
    <div className="reveal-stagger">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold">승인 대기</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {users.length > 0 ? `${users.length}명이 승인을 기다리고 있습니다` : '가입 신청을 검토하고 승인/반려를 처리합니다'}
        </p>
      </div>
      <AdminPendingList initialUsers={users} />
    </div>
  )
}
