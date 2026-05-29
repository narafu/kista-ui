import { getAuthToken } from '@/lib/auth/token'
import { listAdminUsers } from '@/lib/api/admin'
import { ApproveRejectButtons } from '@/components/admin/ApproveRejectButtons'
import { Clock } from 'lucide-react'

export default async function AdminPendingPage() {
  const token = await getAuthToken()
  const users = token ? await listAdminUsers(token, 'PENDING').catch(() => []) : []

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold">승인 대기</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {users.length > 0 ? `${users.length}명이 승인을 기다리고 있습니다` : '대기 중인 사용자가 없습니다'}
        </p>
      </div>

      {users.length === 0 ? (
        <div className="rounded-xl border border-border p-16 text-center">
          <Clock className="size-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">새로운 가입 신청이 없습니다</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="rounded-xl border border-border bg-background px-5 py-4 flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <p className="font-semibold truncate">{user.nickname}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  가입일 {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                </p>
              </div>
              <ApproveRejectButtons userId={user.id} nickname={user.nickname} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
