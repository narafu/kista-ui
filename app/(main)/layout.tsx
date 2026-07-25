import { DesktopSidebar } from '@widgets/layout/DesktopSidebar'
import { MobileBottomNav } from '@widgets/layout/MobileBottomNav'
import { MobileHeader } from '@widgets/layout/MobileHeader'
import { MetaProvider } from '@entities/meta'
import { FcmAutoRegister } from '@entities/fcm'
import { PullToRefresh } from '@widgets/pull-to-refresh'
import { TradeNotificationProvider } from '@entities/trade'
import { getMetaBundle } from '@entities/meta'
import { getMe } from '@entities/user'
import { getAuthToken } from '@shared/lib/auth/token'
import Link from 'next/link'
import { ShieldCheck, LogOut, LogIn } from 'lucide-react'
import { LogoutButton } from '@features/auth/logout'

interface Props {
  children: React.ReactNode
  modal: React.ReactNode
}

export default async function MainLayout({ children, modal }: Props) {
  const token = await getAuthToken()
  const [meta, user] = await Promise.all([
    getMetaBundle(token),
    token ? getMe(token).catch(() => null) : null,
  ])

  const isAdmin = user?.role === 'ADMIN'
  const isAuthenticated = !!token

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
        {isAuthenticated && <FcmAutoRegister notificationChannel={user?.notificationChannel ?? 'TELEGRAM'} />}
        <TradeNotificationProvider />
        {modal}
      </div>
    </MetaProvider>
  )
}
