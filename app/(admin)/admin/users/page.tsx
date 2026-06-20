import { getAuthToken } from '@shared/lib/auth/token'
import { listAdminUsers, getMe } from '@entities/user'
import { AdminUsersTable } from '@widgets/admin-user-list'

export default async function AdminUsersPage() {
  const token = await getAuthToken()
  const [users, me] = token
    ? await Promise.all([
        listAdminUsers(token).catch(() => []),
        getMe(token).catch(() => null),
      ])
    : [[], null]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold">사용자 목록</h1>
        <p className="text-sm text-muted-foreground mt-1">전체 {users.length}명</p>
      </div>
      <AdminUsersTable initialUsers={users} currentUserId={me?.id ?? null} />
    </div>
  )
}
