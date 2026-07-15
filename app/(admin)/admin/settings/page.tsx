import { getAuthToken } from '@shared/lib/auth/token'
import { getAdminSettings } from '@entities/admin-settings'
import { AdminSettingsForm } from '@features/admin/settings'

export default async function AdminSettingsPage() {
  const token = await getAuthToken()
  if (!token) return null
  const settings = await getAdminSettings(token)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">운영 설정</h1>
        <p className="mt-1 text-sm text-muted-foreground">신규 가입·계좌·전략 생성 정책</p>
      </div>
      <AdminSettingsForm initialSettings={settings} />
    </div>
  )
}
