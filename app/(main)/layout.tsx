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
import { ShieldCheck } from 'lucide-react'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const token = await getAuthToken()
  const [meta, user] = await Promise.all([
    getMetaBundle(token),
    token ? getMe(token).catch(() => null) : null,
  ])

  const isAdmin = user?.role === 'ADMIN'

  return (
    <MetaProvider meta={meta}>
      <div className="flex min-h-screen bg-background">
        <DesktopSidebar isAdmin={isAdmin} />
        <div className="flex flex-col flex-1 min-w-0">
          <MobileHeader
            trailing={
              isAdmin ? (
                <Link
                  href="/admin"
                  className="flex items-center justify-center size-8 rounded-lg bg-violet-600 text-white"
                >
                  <ShieldCheck className="size-4" />
                </Link>
              ) : undefined
            }
          />
          <PullToRefresh />
          <main className="flex-1 p-4 lg:p-9 pb-24 lg:pb-9">{children}</main>
          <MobileBottomNav />
        </div>
        <FcmAutoRegister notificationChannel={user?.notificationChannel ?? 'TELEGRAM'} />
        <TradeNotificationProvider />
      </div>
    </MetaProvider>
  )
}
