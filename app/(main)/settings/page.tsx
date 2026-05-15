import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getAuthToken } from '@/lib/auth/token'
import { getMe } from '@/lib/api/auth'
import { listAccounts } from '@/lib/api/accounts'
import { TelegramSection } from '@/components/settings/TelegramSection'
import { AccountTelegramSection } from '@/components/settings/AccountTelegramSection'
import type { User } from '@/types/user'
import type { Account } from '@/types/account'

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: 'ACTIVE', className: 'bg-green-100 text-green-800' },
  PENDING: { label: 'PENDING', className: 'bg-yellow-100 text-yellow-800' },
  REJECTED: { label: 'REJECTED', className: 'bg-red-100 text-red-800' },
}

export default async function SettingsPage() {
  const token = await getAuthToken()

  let user: User | null = null
  let accounts: Account[] = []

  if (token) {
    ;[user, accounts] = await Promise.all([
      getMe(token).catch(() => null),
      listAccounts(token).catch(() => []),
    ])
  }

  const statusInfo = user ? (STATUS_LABELS[user.status] ?? STATUS_LABELS.PENDING) : null

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">설정</h1>

      <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-8">
        {/* 데스크탑: 좌측 메뉴 */}
        <nav className="hidden lg:flex flex-col gap-1 text-sm">
          {['프로필', '텔레그램 알림', '계좌별 알림'].map((item) => (
            <a
              key={item}
              href={`#${item}`}
              className="px-3 py-2 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {item}
            </a>
          ))}
        </nav>

        {/* 콘텐츠 */}
        <div className="space-y-6">
          {/* 프로필 */}
          <section id="프로필">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">프로필</CardTitle>
                <CardDescription>카카오 계정 정보</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">닉네임</span>
                  <span className="text-sm font-medium">{user?.nickname ?? '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">상태</span>
                  {statusInfo ? (
                    <Badge variant="secondary" className={statusInfo.className}>
                      {statusInfo.label}
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* 전체 텔레그램 봇 */}
          <section id="텔레그램 알림">
            <TelegramSection hasTelegram={user?.hasTelegram ?? false} />
          </section>

          {/* 계좌별 텔레그램 봇 */}
          <section id="계좌별 알림">
            <AccountTelegramSection accounts={accounts} />
          </section>
        </div>
      </div>
    </div>
  )
}
