import { DesktopSidebar } from '@widgets/layout/DesktopSidebar'
import { MobileBottomNav } from '@widgets/layout/MobileBottomNav'
import { MobileHeader } from '@widgets/layout/MobileHeader'
import { FcmBridge } from '@widgets/layout/FcmBridge'
import { MetaProvider } from '@entities/meta'
import { PullToRefresh } from '@widgets/pull-to-refresh'
import { TradeNotificationProvider } from '@entities/trade'
import { getMetaBundle } from '@entities/meta'
import { getMe } from '@entities/user'
import { getAuthToken } from '@shared/lib/auth/token'
import { ROLE_COOKIE } from '@shared/lib/auth/cookies'
import { isJwtExpired } from '@shared/lib/auth/jwt'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { ShieldCheck, LogOut, LogIn } from 'lucide-react'
import { LogoutButton } from '@features/auth/logout'

interface Props {
  children: React.ReactNode
  modal: React.ReactNode
}

export default async function MainLayout({ children, modal }: Props) {
  const token = await getAuthToken()
  const cookieStore = await cookies()
  // proxy가 /me 응답으로 1시간 캐시하는 role 쿠키 — 로그인 직후 첫 요청만 미존재
  const cachedRole = cookieStore.get(ROLE_COOKIE)?.value
  const [meta, fallbackUser] = await Promise.all([
    getMetaBundle(),
    token && !cachedRole ? getMe(token).catch(() => null) : null,
  ])

  const isAdmin = cachedRole ? cachedRole === 'ADMIN' : fallbackUser?.role === 'ADMIN'
  // '/dashboard'가 비보호 경로가 되면서, AT 만료 + RT 갱신 실패 시 남아있는 죽은 토큰을
  // proxy가 캐시 쿠키만 지우고 kista-token 자체는 지우지 않는 경우가 있어 유효성까지 확인한다
  const isAuthenticated = !!token && !isJwtExpired(token)

  return (
    <MetaProvider meta={meta}>
      <div className="flex min-h-screen bg-background">
        <DesktopSidebar isAdmin={isAdmin} isAuthenticated={isAuthenticated} />
        <div className="flex flex-col flex-1 min-w-0">
          <MobileHeader
            // eslint-disable-next-line react-doctor/jsx-no-jsx-as-prop
            trailing={
              isAuthenticated ? (
                <div className="flex items-center gap-1.5">
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="flex items-center justify-center size-10 rounded-lg bg-admin-bg text-admin-fg"
                    >
                      <ShieldCheck className="size-4" />
                    </Link>
                  )}
                  <LogoutButton className="flex items-center justify-center size-10 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer bg-transparent border-none">
                    <LogOut className="size-4" />
                  </LogoutButton>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center justify-center size-10 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <LogIn className="size-4" />
                </Link>
              )
            }
          />
          <PullToRefresh />
          <main className="flex-1 p-4 lg:p-9 pb-24 lg:pb-9">{children}</main>
          <MobileBottomNav />
        </div>
        {isAuthenticated && <FcmBridge />}
        <TradeNotificationProvider />
        {modal}
      </div>
    </MetaProvider>
  )
}
